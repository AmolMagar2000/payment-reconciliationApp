import React from 'react'
import {
  CheckCircle2, AlertTriangle, DollarSign, FileText,
  Building2, TrendingDown, Layers, Clock,
} from 'lucide-react'

const fmt  = (n) => n?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtN = (n) => n?.toLocaleString()

function StatCard({ icon: Icon, label, value, sub, accent, delay = 0 }) {
  const accents = {
    amber:  'border-amber/30 glow-amber',
    ruby:   'border-ruby/30 glow-ruby',
    jade:   'border-jade/30 glow-jade',
    sky:    'border-sky/30',
    ghost:  'border-rim',
  }
  const iconColors = {
    amber: 'text-amber',
    ruby:  'text-ruby-light',
    jade:  'text-jade-light',
    sky:   'text-sky-light',
    ghost: 'text-ghost',
  }

  return (
    <div
      className={`card border ${accents[accent] || accents.ghost} p-5 flex flex-col gap-3 animate-slide-up`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-ghost">{label}</span>
        <Icon size={16} className={iconColors[accent] || 'text-ghost'} />
      </div>
      <div className="count-animate">
        <div className={`text-2xl font-mono font-semibold ${iconColors[accent] || 'text-chalk'}`}>
          {value}
        </div>
        {sub && <div className="text-xs text-ghost mt-1 font-mono">{sub}</div>}
      </div>
    </div>
  )
}

export default function SummaryCards({ summary }) {
  if (!summary) return null
  const {
    total_transactions, total_settlements, matched, gaps_found,
    total_txn_amount, total_set_amount, book_difference,
    total_gap_amount, rounding_cumulative, gap_type_counts,
  } = summary

  const matchRate = total_transactions > 0
    ? ((matched / total_transactions) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-4">
      {/* Row 1 — core counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={FileText}      label="Transactions"    value={fmtN(total_transactions)}   sub="October 2024"             accent="ghost"  delay={0}   />
        <StatCard icon={Building2}     label="Settlements"     value={fmtN(total_settlements)}    sub={`${matched} matched`}     accent="ghost"  delay={50}  />
        <StatCard icon={CheckCircle2}  label="Match Rate"      value={`${matchRate}%`}            sub={`${matched} clean`}       accent="jade"   delay={100} />
        <StatCard icon={AlertTriangle} label="Gaps Found"      value={fmtN(gaps_found)}           sub="requires review"         accent="ruby"   delay={150} />
      </div>

      {/* Row 2 — money */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={DollarSign}    label="Total Billed"    value={`$${fmt(total_txn_amount)}`}  sub="platform records"        accent="ghost"  delay={200} />
        <StatCard icon={DollarSign}    label="Total Settled"   value={`$${fmt(total_set_amount)}`}  sub="bank records"            accent="ghost"  delay={250} />
        <StatCard icon={TrendingDown}  label="Book Difference" value={`$${fmt(Math.abs(book_difference))}`} sub={book_difference >= 0 ? 'bank excess' : 'under-settled'} accent={Math.abs(book_difference) > 0.01 ? 'amber' : 'jade'} delay={300} />
        <StatCard icon={Layers}        label="Gap Exposure"    value={`$${fmt(total_gap_amount)}`}  sub={`$${fmt(rounding_cumulative)} rounding`} accent="amber" delay={350} />
      </div>

      {/* Row 3 — gap type breakdown */}
      <div className="card p-5 animate-slide-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
        <div className="text-xs font-mono uppercase tracking-widest text-ghost mb-4">Gap Type Breakdown</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { key: 'duplicate_settlement',  label: 'Duplicate',      cls: 'badge-critical' },
            { key: 'orphan_refund',         label: 'Orphan Refund',  cls: 'badge-high'     },
            { key: 'unmatched_transaction', label: 'Unmatched',      cls: 'badge-high'     },
            { key: 'late_settlement',       label: 'Late Settle',    cls: 'badge-medium'   },
            { key: 'rounding_difference',   label: 'Rounding',       cls: 'badge-low'      },
          ].map(({ key, label, cls }) => (
            <div key={key} className="flex flex-col items-start gap-2 bg-ink/60 rounded-lg p-3 border border-rim/50">
              <span className={cls}>{label}</span>
              <span className="text-xl font-mono font-semibold text-chalk">
                {gap_type_counts?.[key] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}