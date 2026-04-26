"""
data_generator.py
Generates synthetic payment transactions and bank settlements for October 2024.

Assumptions:
  - Transactions are recorded at the moment of customer payment (T+0).
  - The bank batches and settles funds 1–2 business days later (T+1 or T+2).
  - Report month is October 2024. Anything settling in November counts as "late".
  - All amounts are in USD.
  - A refund must reference an original transaction. An orphan refund references a
    transaction ID that does not exist in the dataset.
  - Rounding errors are introduced at the settlement layer (bank rounds differently
    from the platform), each -$0.01 per affected transaction. Individually trivial;
    material when summed across 11 transactions.
"""

import random
from datetime import datetime, timedelta

# ── Constants ────────────────────────────────────────────────────────────────

SEED = 42
REPORT_MONTH_START = datetime(2024, 10, 1)
REPORT_MONTH_END   = datetime(2024, 10, 31)
MERCHANTS = ["MERCH_ALPHA", "MERCH_BETA", "MERCH_GAMMA", "MERCH_DELTA", "MERCH_EPSILON"]

# IDs that will carry planted gaps
LATE_SETTLEMENT_ID   = "TXN_0005"
ROUNDING_IDS         = {f"TXN_{str(i).zfill(4)}" for i in range(10, 21)}   # 10 inclusive, 20 inclusive
DUPLICATE_ID         = "TXN_0030"
ORPHAN_REFUND_ID     = "TXN_REFUND_ORPHAN"


# ── Transaction generation ───────────────────────────────────────────────────

def generate_transactions(seed: int = SEED) -> list[dict]:
    random.seed(seed)
    transactions = []

    # 50 normal payment transactions spread across October 2024
    for i in range(1, 51):
        txn_id   = f"TXN_{str(i).zfill(4)}"
        days_off = random.randint(0, 30)
        txn_date = REPORT_MONTH_START + timedelta(days=days_off)
        # Clamp to October
        if txn_date > REPORT_MONTH_END:
            txn_date = REPORT_MONTH_END

        amount = round(random.uniform(12.50, 4999.99), 2)

        transactions.append({
            "id":          txn_id,
            "date":        txn_date.strftime("%Y-%m-%d"),
            "amount":      amount,
            "currency":    "USD",
            "merchant_id": random.choice(MERCHANTS),
            "type":        "payment",
            "status":      "completed",
            "original_transaction_id": None,
        })

    # GAP 4 — Orphan refund: references a transaction that doesn't exist
    transactions.append({
        "id":          ORPHAN_REFUND_ID,
        "date":        "2024-10-15",
        "amount":      -375.00,
        "currency":    "USD",
        "merchant_id": "MERCH_ALPHA",
        "type":        "refund",
        "status":      "completed",
        "original_transaction_id": "TXN_NONEXISTENT_9999",   # ← no such ID
    })

    return transactions


# ── Settlement generation ────────────────────────────────────────────────────

def generate_settlements(transactions: list[dict], seed: int = SEED) -> list[dict]:
    random.seed(seed)
    settlements = []

    for txn in transactions:
        txn_id     = txn["id"]
        txn_date   = datetime.strptime(txn["date"], "%Y-%m-%d")
        txn_amount = txn["amount"]

        # GAP 4 — Orphan refund gets NO settlement record at all
        if txn_id == ORPHAN_REFUND_ID:
            continue

        # GAP 1 — Late settlement: TXN_0005 settles on 2024-11-02
        if txn_id == LATE_SETTLEMENT_ID:
            settlements.append({
                "id":           f"SET_{txn_id}",
                "transaction_id": txn_id,
                "settled_date": "2024-11-02",
                "amount":       txn_amount,
                "status":       "settled",
            })
            continue

        # Normal T+1 or T+2 settlement
        settle_days = random.randint(1, 2)
        settled_date = txn_date + timedelta(days=settle_days)

        # GAP 2 — Rounding difference: bank settles $0.01 less per transaction
        if txn_id in ROUNDING_IDS:
            settled_amount = round(txn_amount - 0.01, 2)
        else:
            settled_amount = txn_amount

        settlements.append({
            "id":             f"SET_{txn_id}",
            "transaction_id": txn_id,
            "settled_date":   settled_date.strftime("%Y-%m-%d"),
            "amount":         settled_amount,
            "status":         "settled",
        })

        # GAP 3 — Duplicate settlement: TXN_0030 gets a second identical record
        if txn_id == DUPLICATE_ID:
            settlements.append({
                "id":             f"SET_{txn_id}_DUP",
                "transaction_id": txn_id,
                "settled_date":   settled_date.strftime("%Y-%m-%d"),
                "amount":         txn_amount,
                "status":         "settled",
            })

    return settlements