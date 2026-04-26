import React, { useState } from 'react'

const fmt = (n) =>
  typeof n === 'number'
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n

export default function DataPreview({ data }) {
  const [tab, setTab] = useState('transactions')
  if (!data) return null

  const { transactions, settlements, meta } = data

  const cols = {
    transactions: ['id', 'date', 'type', 'merchant_id', 'amount', 'currency', 'status'],
    settlements:  ['id', 'transaction_id', 'settled_date', 'amount', 'status'],
  }

  const rows = tab === 'transactions' ? transactions : settlements

  return (
    <div className="card animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-rim px-5">
        {['transactions', 'settlements'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors -mb-px
              ${tab === t
                ? 'border-amber text-amber'
                : 'border-transparent text-ghost hover:text-chalk'}`}
          >
            {t} ({t === 'transactions' ? transactions?.length : settlements?.length})
          </button>
        ))}
        {meta && (
          <div className="ml-auto text-ghost text-[10px] font-mono py-3">
            Report month: {meta.report_month}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-panel z-10">
            <tr className="border-b border-rim">
              {cols[tab].map((col) => (
                <th key={col} className="px-4 py-2.5 text-left text-ghost uppercase tracking-wider whitespace-nowrap">
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows?.map((row, i) => (
              <tr key={i} className="border-b border-rim/30 hover:bg-white/[0.015]">
                {cols[tab].map((col) => {
                  const val = row[col]
                  const isAmount = col === 'amount'
                  const isNeg = isAmount && val < 0
                  return (
                    <td
                      key={col}
                      className={`px-4 py-2 whitespace-nowrap
                        ${col === 'id' || col === 'transaction_id' ? 'text-chalk' : 'text-slate'}
                        ${isAmount ? 'text-right ' + (isNeg ? 'text-ruby-light' : 'text-jade-light') : ''}
                      `}
                    >
                      {isAmount ? `$${fmt(Math.abs(val))}${isNeg ? ' CR' : ''}` : String(val ?? '—')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Planted gaps callout */}
      {meta?.planted_gaps && (
        <div className="px-5 py-4 border-t border-rim">
          <div className="text-[10px] font-mono uppercase tracking-widest text-ghost mb-2">
            Planted Gaps in Dataset
          </div>
          <div className="flex flex-wrap gap-2">
            {meta.planted_gaps.map((g, i) => (
              <span key={i} className="text-[10px] bg-amber/10 border border-amber/20 text-amber px-2 py-1 rounded-md font-mono">
                {g}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}