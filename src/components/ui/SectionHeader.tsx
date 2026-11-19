import { type ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  sub?: string
  action?: ReactNode
}

export function SectionHeader({ title, sub, action }: SectionHeaderProps) {
  return (
    // Wraps on narrow screens so header actions drop below the title instead of overflowing.
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-4">
      <div className="flex-1 min-w-[12rem]">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
