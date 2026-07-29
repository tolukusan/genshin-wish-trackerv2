import { type ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  sub?: string
  action?: ReactNode
}

export function SectionHeader({ title, sub, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
