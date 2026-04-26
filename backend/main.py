from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
from data_generator import generate_transactions, generate_settlements
from reconciler import reconcile

app = FastAPI(
    title="Payment Reconciliation API",
    description="Identifies gaps between payment transactions and bank settlements",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Transaction(BaseModel):
    id: str
    date: str
    amount: float
    currency: str
    merchant_id: str
    type: str
    status: str
    original_transaction_id: Optional[str] = None


class Settlement(BaseModel):
    id: str
    transaction_id: str
    settled_date: str
    amount: float
    status: str


class ReconcileRequest(BaseModel):
    transactions: List[Any]
    settlements: List[Any]


# ── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health_check():
    """Returns API health status."""
    return {"status": "ok", "service": "reconciliation-api", "version": "1.0.0"}


@app.post("/generate-data", tags=["Data"])
def generate_data():
    """
    Generates synthetic transaction and settlement datasets for October 2024.

    Planted gap types:
      1. Late settlement  — TXN_0005 settles on 2024-11-02 (next month)
      2. Rounding diffs   — TXN_0010 through TXN_0020 each off by $0.01
      3. Duplicate entry  — TXN_0030 has two settlement records
      4. Orphan refund    — TXN_REFUND_ORPHAN references a non-existent original
    """
    transactions = generate_transactions()
    settlements = generate_settlements(transactions)
    return {
        "transactions": transactions,
        "settlements": settlements,
        "meta": {
            "report_month": "2024-10",
            "transaction_count": len(transactions),
            "settlement_count": len(settlements),
            "planted_gaps": [
                "Late settlement: TXN_0005",
                "Rounding differences: TXN_0010 – TXN_0020 (each -$0.01)",
                "Duplicate settlement: TXN_0030",
                "Orphan refund: TXN_REFUND_ORPHAN",
            ]
        }
    }


@app.post("/reconcile", tags=["Reconciliation"])
def reconcile_data(request: ReconcileRequest):
    """
    Reconciles transactions against settlements and returns a gap report.

    Gap types detected:
      - late_settlement
      - rounding_difference
      - duplicate_settlement
      - orphan_refund
      - unmatched_transaction
    """
    if not request.transactions:
        raise HTTPException(status_code=400, detail="transactions list is empty")
    if not request.settlements:
        raise HTTPException(status_code=400, detail="settlements list is empty")

    result = reconcile(request.transactions, request.settlements)
    return result