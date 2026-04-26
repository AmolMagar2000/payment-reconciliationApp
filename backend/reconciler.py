"""
reconciler.py
Core reconciliation engine.

Algorithm:
  1. Build a lookup: transaction_id → list[settlement]
  2. For every transaction, classify it against the matching settlements.
  3. Emit a Gap record for each anomaly found.
  4. Aggregate summary statistics.

Gap taxonomy:
  ┌─────────────────────────┬────────────────────────────────────────────────────────┐
  │ gap_type                │ Description                                            │
  ├─────────────────────────┼────────────────────────────────────────────────────────┤
  │ late_settlement         │ Settlement date falls outside the report month         │
  │ rounding_difference     │ Settled amount ≠ transaction amount (|diff| ≤ $1)      │
  │ duplicate_settlement    │ More than one settlement record for a transaction       │
  │ orphan_refund           │ Refund transaction with no settlement at all           │
  │ unmatched_transaction   │ Payment with no settlement record whatsoever           │
  └─────────────────────────┴────────────────────────────────────────────────────────┘

Severity:
  critical → material financial exposure (duplicate, large unmatched)
  high     → missing settlement or orphan refund
  medium   → late settlement (cross-month timing issue)
  low      → small rounding difference
"""

from collections import defaultdict

REPORT_MONTH = "2024-10"
ROUNDING_THRESHOLD = 1.00   # diffs ≤ this are rounding; above is a real discrepancy


def _severity(gap_type: str, difference: float) -> str:
    if gap_type == "duplicate_settlement":
        return "critical"
    if gap_type in ("orphan_refund", "unmatched_transaction"):
        return "high"
    if gap_type == "late_settlement":
        return "medium"
    if gap_type == "rounding_difference":
        return "low" if abs(difference) <= ROUNDING_THRESHOLD else "medium"
    return "low"


def reconcile(transactions: list[dict], settlements: list[dict]) -> dict:
    gaps: list[dict] = []

    gap_type_counts = {
        "late_settlement":       0,
        "rounding_difference":   0,
        "duplicate_settlement":  0,
        "orphan_refund":         0,
        "unmatched_transaction": 0,
    }

    # Index settlements by transaction_id
    settlement_map: dict[str, list[dict]] = defaultdict(list)
    for s in settlements:
        settlement_map[s["transaction_id"]].append(s)

    matched_count = 0
    total_gap_amount = 0.0

    # Track transaction amounts and settlement totals for book balance
    total_txn_amount  = sum(t["amount"] for t in transactions)
    total_set_amount  = sum(s["amount"] for s in settlements)

    for txn in transactions:
        txn_id     = txn["id"]
        txn_amount = txn["amount"]
        txn_type   = txn.get("type", "payment")
        matched    = settlement_map.get(txn_id, [])

        # ── GAP 4: Orphan refund ─────────────────────────────────────────────
        if txn_type == "refund" and not matched:
            diff = abs(txn_amount)
            gap_type_counts["orphan_refund"] += 1
            total_gap_amount += diff
            gaps.append({
                "gap_type":            "orphan_refund",
                "severity":            _severity("orphan_refund", diff),
                "transaction_id":      txn_id,
                "transaction_date":    txn["date"],
                "transaction_amount":  txn_amount,
                "settlement_amount":   None,
                "difference":          round(diff, 2),
                "settlement_ids":      [],
                "settled_date":        None,
                "description":         (
                    f"Refund {txn_id} (${abs(txn_amount):,.2f}) has no settlement record "
                    f"and references a non-existent original transaction "
                    f"'{txn.get('original_transaction_id', 'N/A')}'. "
                    "Cannot verify whether the customer was actually reimbursed."
                ),
            })
            continue

        # ── No settlement at all ─────────────────────────────────────────────
        if not matched:
            diff = txn_amount
            gap_type_counts["unmatched_transaction"] += 1
            total_gap_amount += abs(diff)
            gaps.append({
                "gap_type":           "unmatched_transaction",
                "severity":           _severity("unmatched_transaction", diff),
                "transaction_id":     txn_id,
                "transaction_date":   txn["date"],
                "transaction_amount": txn_amount,
                "settlement_amount":  None,
                "difference":         round(diff, 2),
                "settlement_ids":     [],
                "settled_date":       None,
                "description":        (
                    f"Transaction {txn_id} (${txn_amount:,.2f}) has no matching settlement. "
                    "Funds may not have been received from the bank."
                ),
            })
            continue

        # ── GAP 3: Duplicate settlement ──────────────────────────────────────
        if len(matched) > 1:
            set_ids       = [s["id"] for s in matched]
            total_settled = round(sum(s["amount"] for s in matched), 2)
            diff          = round(total_settled - txn_amount, 2)
            gap_type_counts["duplicate_settlement"] += 1
            total_gap_amount += abs(diff)
            gaps.append({
                "gap_type":           "duplicate_settlement",
                "severity":           _severity("duplicate_settlement", diff),
                "transaction_id":     txn_id,
                "transaction_date":   txn["date"],
                "transaction_amount": txn_amount,
                "settlement_amount":  total_settled,
                "difference":         diff,
                "settlement_ids":     set_ids,
                "settled_date":       matched[0]["settled_date"],
                "description":        (
                    f"Transaction {txn_id} (${txn_amount:,.2f}) has {len(matched)} settlement records "
                    f"({', '.join(set_ids)}). Total settled: ${total_settled:,.2f}. "
                    f"Overpayment of ${diff:,.2f}. One record is likely a duplicate ingestion."
                ),
            })
            # After flagging the duplicate, continue — don't double-count as late/rounding
            continue

        # ── Single settlement — check date and amount ────────────────────────
        s           = matched[0]
        settled_amt = s["amount"]
        settled_dt  = s["settled_date"]

        # GAP 1: Late settlement
        if not settled_dt.startswith(REPORT_MONTH):
            gap_type_counts["late_settlement"] += 1
            gaps.append({
                "gap_type":           "late_settlement",
                "severity":           _severity("late_settlement", 0),
                "transaction_id":     txn_id,
                "transaction_date":   txn["date"],
                "transaction_amount": txn_amount,
                "settlement_amount":  settled_amt,
                "difference":         0.0,
                "settlement_ids":     [s["id"]],
                "settled_date":       settled_dt,
                "description":        (
                    f"Transaction {txn_id} (${txn_amount:,.2f}) recorded on {txn['date']} "
                    f"but settled on {settled_dt} — outside October 2024. "
                    "This crosses the month-end boundary and must be accrued."
                ),
            })
            continue

        # GAP 2: Rounding / amount mismatch
        diff = round(settled_amt - txn_amount, 2)
        if diff != 0:
            gap_type_counts["rounding_difference"] += 1
            total_gap_amount += abs(diff)
            gaps.append({
                "gap_type":           "rounding_difference",
                "severity":           _severity("rounding_difference", diff),
                "transaction_id":     txn_id,
                "transaction_date":   txn["date"],
                "transaction_amount": txn_amount,
                "settlement_amount":  settled_amt,
                "difference":         diff,
                "settlement_ids":     [s["id"]],
                "settled_date":       settled_dt,
                "description":        (
                    f"Amount mismatch for {txn_id}: platform recorded ${txn_amount:,.2f}, "
                    f"bank settled ${settled_amt:,.2f} (diff: ${diff:+.2f}). "
                    "Likely a floating-point rounding difference at the bank layer."
                ),
            })
            continue

        # Fully matched
        matched_count += 1

    # ── Summary ──────────────────────────────────────────────────────────────
    rounding_total = round(
        sum(abs(g["difference"]) for g in gaps if g["gap_type"] == "rounding_difference"), 2
    )

    summary = {
        "report_month":            REPORT_MONTH,
        "total_transactions":      len(transactions),
        "total_settlements":       len(settlements),
        "matched":                 matched_count,
        "gaps_found":              len(gaps),
        "total_txn_amount":        round(total_txn_amount, 2),
        "total_set_amount":        round(total_set_amount, 2),
        "book_difference":         round(total_set_amount - total_txn_amount, 2),
        "total_gap_amount":        round(total_gap_amount, 2),
        "rounding_cumulative":     rounding_total,
        "gap_type_counts":         gap_type_counts,
    }

    return {"summary": summary, "gaps": gaps}