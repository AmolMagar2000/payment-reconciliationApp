import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Filter, X } from 'lucide-react'

const GAP_LABELS = {
  duplicate_settlement:  'Duplicate',
  orphan_refund:         'Orphan Refund',
  unmatched_transaction: 'Unmatched',
  late_settlement:       'Late Settle',
  rounding_difference:   'Rounding',
}

const SEV_BADGE = {
  critical: 'badge-critical',
  high:     'badge-high',
  medium:   'badge-medium',
  low:      'badge-low',
}

const fmt = (n) =>
  n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function SortIcon({ col, active, dir }) {
  return (
    <span className="inline-flex flex-col ml-1 opacity-40">
      <ChevronUp   size={10} className={active && dir === 'asc'  ? 'opacity-100 text-amber' : ''} />
      <ChevronDown size={10} className={active && dir === 'desc' ? 'opacity-100 text-amber' : ''} />
    </span>
  )
}

export default function GapsTable({ gaps }) {
  const [filterType, setFilterType] = useState('all')
  const [filterSev,  setFilterSev]  = useState('all')
  const [sortCol,    setSortCol]    = useState('gap_type')
  const [sortDir,    setSortDir]    = useState('asc')
  const [expanded,   setExpanded]   = useState(null)

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    return (gaps || [])
      .filter((g) => filterType === 'all' || g.gap_type === filterType)
      .filter((g) => filterSev  === 'all' || g.severity  === filterSev)
      .sort((a, b) => {
        let va = a[sortCol], vb = b[sortCol]
        if (typeof va === 'string') va = va.toLowerCase()
        if (typeof vb === 'string') vb = vb.toLowerCase()
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ?  1 : -1
        return 0
      })
  }, [gaps, filterType, filterSev, sortCol, sortDir])

  const gapTypes   = [...new Set((gaps || []).map((g) => g.gap_type))]
  const severities = [...new Set((gaps || []).map((g) => g.severity))]

  if (!gaps || gaps.length === 0) return null

  return (
    <div className="card animate-slide-up" style={{ animationDelay: '550ms', animationFillMode: 'both' }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-rim">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-ghost">Gap Register</div>
          <div className="text-chalk font-semibold mt-0.5">{filtered.length} of {gaps.length} gaps</div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={12} className="text-ghost" />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-ink border border-rim text-slate text-xs font-mono px-3 py-1.5 rounded-lg
                       focus:outline-none focus:border-ghost hover:border-ghost transition-colors"
          >
            <option value="all">All Types</option>
            {gapTypes.map((t) => (
              <option key={t} value={t}>{GAP_LABELS[t] || t}</option>
            ))}
          </select>

          <select
            value={filterSev}
            onChange={(e) => setFilterSev(e.target.value)}
            className="bg-ink border border-rim text-slate text-xs font-mono px-3 py-1.5 rounded-lg
                       focus:outline-none focus:border-ghost hover:border-ghost transition-colors"
          >
            <option value="all">All Severities</option>
            {severities.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          {(filterType !== 'all' || filterSev !== 'all') && (
            <button
              onClick={() => { setFilterType('all'); setFilterSev('all') }}
              className="text-ghost hover:text-ruby-light transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-rim">
              {[
                { col: 'gap_type',            label: 'Gap Type'     },
                { col: 'severity',             label: 'Severity'     },
                { col: 'transaction_id',       label: 'TXN ID'       },
                { col: 'transaction_date',     label: 'TXN Date'     },
                { col: 'transaction_amount',   label: 'TXN Amount'   },
                { col: 'settlement_amount',    label: 'Settled'      },
                { col: 'difference',           label: 'Difference'   },
                { col: 'settled_date',         label: 'Settled Date' },
              ].map(({ col, label }) => (
                <th
                  key={col}
                  onClick={() => toggleSort(col)}
                  className="px-4 py-3 text-left text-ghost uppercase tracking-wider cursor-pointer
                             hover:text-chalk select-none whitespace-nowrap"
                >
                  {label}
                  <SortIcon col={col} active={sortCol === col} dir={sortDir} />
                </th>
              ))}
              <th className="px-4 py-3 text-left text-ghost uppercase tracking-wider w-8" />
            </tr>
          </thead>

          <tbody>
            {filtered.map((gap, i) => {
              const isOpen = expanded === i
              const diffColor =
                gap.difference > 0 ? 'text-jade-light'
                : gap.difference < 0 ? 'text-ruby-light'
                : 'text-ghost'

              return (
                <React.Fragment key={i}>
                  <tr
                    className={`border-b border-rim/50 hover:bg-white/[0.02] cursor-pointer transition-colors
                                ${isOpen ? 'bg-white/[0.03]' : ''}`}
                    onClick={() => setExpanded(isOpen ? null : i)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={SEV_BADGE[gap.severity]}>
                        {GAP_LABELS[gap.gap_type] || gap.gap_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`${SEV_BADGE[gap.severity]} text-[10px]`}>
                        {gap.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-chalk whitespace-nowrap">{gap.transaction_id}</td>
                    <td className="px-4 py-3 text-slate whitespace-nowrap">{gap.transaction_date}</td>
                    <td className="px-4 py-3 text-chalk whitespace-nowrap">
                      {gap.transaction_amount != null ? `$${fmt(gap.transaction_amount)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate whitespace-nowrap">
                      {gap.settlement_amount != null ? `$${fmt(gap.settlement_amount)}` : '—'}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap font-semibold ${diffColor}`}>
                      {gap.difference != null ? `${gap.difference >= 0 ? '+' : ''}$${fmt(Math.abs(gap.difference))}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate whitespace-nowrap">
                      {gap.settled_date || '—'}
                    </td>
                    <td className="px-4 py-3 text-ghost">
                      {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </td>
                  </tr>

                  {/* Expanded description row */}
                  {isOpen && (
                    <tr className="bg-ink/40">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="text-ghost uppercase text-[10px] tracking-widest mb-1">
                            Analysis
                          </div>
                          <p className="text-slate leading-relaxed text-xs">{gap.description}</p>
                          {gap.settlement_ids?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="text-ghost text-[10px]">Settlement IDs:</span>
                              {gap.settlement_ids.map((id) => (
                                <span key={id} className="text-[10px] bg-muted px-2 py-0.5 rounded text-chalk">
                                  {id}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer totals */}
      <div className="px-5 py-3 border-t border-rim flex flex-wrap gap-6">
        {['critical', 'high', 'medium', 'low'].map((sev) => {
          const count = filtered.filter((g) => g.severity === sev).length
          return count > 0 ? (
            <div key={sev} className="flex items-center gap-2">
              <span className={SEV_BADGE[sev]}>{sev}</span>
              <span className="text-slate text-xs">×{count}</span>
            </div>
          ) : null
        })}
      </div>
    </div>
  )
}