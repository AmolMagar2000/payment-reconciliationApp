import React, { useState, useEffect } from 'react'
import { healthCheck, generateData, reconcileData } from './api'
import SummaryCards from './components/SummaryCards'
import GapCharts    from './components/GapCharts'
import GapsTable    from './components/GapsTable'
import DataPreview  from './components/DataPreview'
import {
  Activity, RefreshCw, Play, Database,
  ChevronRight, AlertCircle, CheckCircle2, Wifi, WifiOff,
} from 'lucide-react'

// ── Step indicator ────────────────────────────────────────────────────────────
function Step({ n, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 text-xs font-mono transition-colors
      ${done ? 'text-jade' : active ? 'text-amber' : 'text-ghost'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border
        ${done ? 'border-jade bg-jade/10 text-jade-light'
               : active ? 'border-amber bg-amber/10 text-amber'
               : 'border-rim text-ghost'}`}>
        {done ? '✓' : n}
      </div>
      <span className="hidden sm:inline">{label}</span>
      {n < 3 && <ChevronRight size={12} className="hidden sm:block opacity-30" />}
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl
                     border text-sm font-mono shadow-2xl animate-slide-up
                     ${type === 'error' ? 'bg-ruby/10 border-ruby/40 text-ruby-light'
                                        : 'bg-jade/10 border-jade/40 text-jade-light'}`}>
      {type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      {msg}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [apiStatus,  setApiStatus]  = useState('checking')   // 'ok' | 'error' | 'checking'
  const [rawData,    setRawData]    = useState(null)
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState({ generate: false, reconcile: false })
  const [toast,      setToast]      = useState(null)
  const [showRaw,    setShowRaw]    = useState(false)

  const step = rawData && result ? 3 : rawData ? 2 : 1

  // Health check on mount
  useEffect(() => {
    healthCheck()
      .then(() => setApiStatus('ok'))
      .catch(() => setApiStatus('error'))
  }, [])

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const handleGenerate = async () => {
    setLoading((l) => ({ ...l, generate: true }))
    try {
      const { data } = await generateData()
      setRawData(data)
      setResult(null)
      showToast(`Generated ${data.transactions.length} transactions, ${data.settlements.length} settlements`)
    } catch (e) {
      showToast(e.response?.data?.detail || 'Failed to generate data', 'error')
    } finally {
      setLoading((l) => ({ ...l, generate: false }))
    }
  }

  const handleReconcile = async () => {
    if (!rawData) return
    setLoading((l) => ({ ...l, reconcile: true }))
    try {
      const { data } = await reconcileData({
        transactions: rawData.transactions,
        settlements:  rawData.settlements,
      })
      setResult(data)
      showToast(`Reconciliation complete — ${data.summary.gaps_found} gaps found`)
    } catch (e) {
      showToast(e.response?.data?.detail || 'Reconciliation failed', 'error')
    } finally {
      setLoading((l) => ({ ...l, reconcile: false }))
    }
  }

  return (
    <div className="min-h-screen grid-bg">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-rim bg-panel/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber/10 border border-amber/30 flex items-center justify-center">
              <Activity size={16} className="text-amber" />
            </div>
            <div>
              <span className="font-display text-chalk text-lg leading-none">PayRecon</span>
              <span className="block text-[10px] font-mono text-ghost tracking-widest uppercase -mt-0.5">
                Reconciliation Engine
              </span>
            </div>
          </div>

          {/* Steps */}
          <div className="hidden md:flex items-center gap-3">
            <Step n={1} label="Generate Data" active={step === 1} done={step > 1} />
            <Step n={2} label="Review Dataset"  active={step === 2} done={step > 2} />
            <Step n={3} label="Reconcile"      active={step === 3} done={false} />
          </div>

          {/* API status */}
          <div className={`flex items-center gap-1.5 text-[10px] font-mono
            ${apiStatus === 'ok' ? 'text-jade' : apiStatus === 'error' ? 'text-ruby-light' : 'text-ghost'}`}>
            {apiStatus === 'ok'
              ? <><Wifi size={12} /> API online</>
              : apiStatus === 'error'
              ? <><WifiOff size={12} /> API offline</>
              : <><RefreshCw size={12} className="animate-spin" /> Checking...</>}
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={loading.generate}
            className="btn-primary"
          >
            {loading.generate
              ? <RefreshCw size={14} className="animate-spin" />
              : <Database size={14} />}
            {loading.generate ? 'Generating…' : 'Generate Dataset'}
          </button>

          <button
            onClick={handleReconcile}
            disabled={!rawData || loading.reconcile}
            className="btn-primary"
          >
            {loading.reconcile
              ? <RefreshCw size={14} className="animate-spin" />
              : <Play size={14} />}
            {loading.reconcile ? 'Reconciling…' : 'Run Reconciliation'}
          </button>

          {rawData && (
            <button
              onClick={() => setShowRaw((s) => !s)}
              className="btn-ghost ml-auto"
            >
              <Database size={14} />
              {showRaw ? 'Hide Data' : 'Preview Data'}
            </button>
          )}
        </div>

        {/* Empty state */}
        {!rawData && !loading.generate && (
          <div className="card border-dashed border-rim/60 flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber/5 border border-amber/20 flex items-center justify-center">
              <Activity size={24} className="text-amber/60" />
            </div>
            <div>
              <p className="text-chalk font-semibold mb-1">No data loaded</p>
              <p className="text-ghost text-sm max-w-sm">
                Click <strong className="text-amber">Generate Dataset</strong> to create synthetic October 2024
                transaction and settlement data with planted reconciliation gaps.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {['Late settlement', 'Rounding drift', 'Duplicate entry', 'Orphan refund'].map((g) => (
                <span key={g} className="badge bg-muted text-slate border border-rim">{g}</span>
              ))}
            </div>
          </div>
        )}

        {/* Data preview */}
        {rawData && showRaw && <DataPreview data={rawData} />}

        {/* Reconciliation results */}
        {result && (
          <>
            {/* Book balance alert */}
            {Math.abs(result.summary.book_difference) > 0.01 && (
              <div className="flex items-start gap-3 bg-ruby/5 border border-ruby/25 rounded-xl px-5 py-4 animate-fade-in">
                <AlertCircle size={16} className="text-ruby-light mt-0.5 shrink-0" />
                <div>
                  <p className="text-ruby-light font-semibold text-sm">Books Don't Balance</p>
                  <p className="text-slate text-xs mt-1 font-mono">
                    Platform total: <strong className="text-chalk">
                      ${result.summary.total_txn_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                    &nbsp;·&nbsp; Bank total: <strong className="text-chalk">
                      ${result.summary.total_set_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                    &nbsp;·&nbsp; Difference: <strong className="text-ruby-light">
                      ${Math.abs(result.summary.book_difference).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                </div>
              </div>
            )}

            <SummaryCards summary={result.summary} />
            <GapCharts    summary={result.summary} gaps={result.gaps} />
            <GapsTable    gaps={result.gaps} />

            {/* Assumptions */}
            <div className="card p-5 animate-slide-up" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
              <div className="text-xs font-mono uppercase tracking-widest text-ghost mb-4">Assumptions</div>
              <ul className="space-y-2 text-sm text-slate">
                {[
                  'Transactions are recorded at T+0 (instant, when the customer pays).',
                  'The bank batches settlements at T+1 or T+2 business days.',
                  'The reconciliation report covers calendar month October 2024. Any settlement date outside this window is flagged as a late settlement regardless of amount.',
                  'Rounding differences of ≤ $1.00 per transaction are classified as bank-layer float errors; above $1.00 they are treated as discrepancies.',
                  'A refund transaction must have a matching settlement (customer reimbursement). No settlement = orphan refund.',
                  'More than one settlement record for a single transaction_id indicates a duplicate ingestion at the bank feed layer.',
                  'The duplicate settlement amount represents real double-payment risk and is classified as critical.',
                  'Currency is USD throughout; no FX conversion is applied.',
                ].map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-amber font-mono text-xs shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-rim mt-16 py-6 text-center">
        <p className="text-ghost text-[10px] font-mono uppercase tracking-widest">
          PayRecon · Month-End Reconciliation Engine · Oct 2024
        </p>
      </footer>

      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}