import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
  accent?: 'purple' | 'gold' | 'green' | 'red' | 'default'
  className?: string
}

const accentMap = {
  purple: 'border-accent-purple/30 shadow-glow',
  gold: 'border-accent-gold/30',
  green: 'border-emerald-500/30',
  red: 'border-red-500/30',
  default: 'border-slate-300/50',
}

const iconMap = {
  purple: 'text-accent-purple-light',
  gold: 'text-accent-gold-light',
  green: 'text-emerald-600',
  red: 'text-red-600',
  default: 'text-slate-600',
}

export function StatCard({ label, value, sub, icon, accent = 'default', className }: StatCardProps) {
  return (
    <div className={clsx('card p-4 flex flex-col gap-1 animate-fade-in border', accentMap[accent], className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="label">{label}</span>
        {icon && <span className={clsx('text-lg', iconMap[accent])}>{icon}</span>}
      </div>
      <span className="text-2xl font-semibold text-slate-900 tabular-nums">{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  )
}
