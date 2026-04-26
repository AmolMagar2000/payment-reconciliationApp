import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from 'recharts'

const GAP_META = {
  duplicate_settlement:  { label: 'Duplicate',     color: '#e53e3e' },
  orphan_refund:         { label: 'Orphan Refund',  color: '#f5a623' },
  unmatched_transaction: { label: 'Unmatched',      color: '#ed8936' },
  late_settlement:       { label: 'Late Settle',    color: '#3182ce' },
  rounding_difference:   { label: 'Rounding',       color: '#38a169' },
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-panel border border-rim rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      <div className="text-chalk font-semibold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.fill || p.color }} className="flex gap-2">
          <span>{p.name}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function GapCharts({ summary, gaps }) {
  if (!summary || !gaps) return null

  // Bar chart: count per gap type
  const barData = Object.entries(GAP_META).map(([key, meta]) => ({
    name:  meta.label,
    Count: summary.gap_type_counts?.[key] ?? 0,
    fill:  meta.color,
  }))

  // Pie chart: financial exposure per gap type (excluding 0-diff gaps)
  const pieRaw = {}
  gaps.forEach((g) => {
    if (!pieRaw[g.gap_type]) pieRaw[g.gap_type] = 0
    pieRaw[g.gap_type] += Math.abs(g.difference || 0)
  })
  const pieData = Object.entries(pieRaw)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name:  GAP_META[key]?.label || key,
      value: Math.round(value * 100) / 100,
      color: GAP_META[key]?.color || '#888',
    }))

  const renderLabel = ({ name, percent }) =>
    percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Bar chart */}
      <div className="card p-5 animate-slide-up" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
        <div className="text-xs font-mono uppercase tracking-widest text-ghost mb-5">
          Gap Count by Type
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="Count" radius={[4, 4, 0, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart — financial exposure */}
      <div className="card p-5 animate-slide-up" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
        <div className="text-xs font-mono uppercase tracking-widest text-ghost mb-5">
          $ Exposure by Gap Type
        </div>
        {pieData.length === 0 ? (
          <div className="flex items-center justify-center h-[220px] text-ghost text-sm font-mono">
            No financial exposure
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={renderLabel}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]
                  return (
                    <div className="bg-panel border border-rim rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
                      <div className="text-chalk font-semibold">{d.name}</div>
                      <div style={{ color: d.payload.color }}>${d.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    </div>
                  )
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(val) => (
                  <span style={{ color: '#8892a4', fontSize: 11, fontFamily: 'JetBrains Mono' }}>{val}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}