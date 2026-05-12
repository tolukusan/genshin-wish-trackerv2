import { usePlannerStore } from '@/store/usePlannerStore'
import type { NavTab } from '@/types'
import { clsx } from 'clsx'
import { parseISO, isWithinInterval, format } from 'date-fns'

const NAV: { tab: NavTab; label: string; icon: string }[] = [
  { tab: 'dashboard', label: 'Dashboard', icon: '⬡' },
  { tab: 'patches', label: 'Patches', icon: '◈' },
  { tab: 'forecast', label: 'Forecast', icon: '◎' },
  { tab: 'scenarios', label: 'Scenarios', icon: '⇢' },
  { tab: 'settings', label: 'Settings', icon: '⚙' },
]

function prevVersion(v: string) {
  const [maj, min] = v.split('.').map(Number)
  return min === 0 ? `${maj - 1}.7` : `${maj}.${min - 1}`
}

export function Sidebar() {
  const { nav, setNav, patches, config } = usePlannerStore()

  const today = new Date()
  const currentPatch = patches.find((p) =>
    isWithinInterval(today, { start: parseISO(p.startDate), end: parseISO(p.endDate) })
  )
  const firstPatch = patches[0]
  const beforeAnchor = !currentPatch && firstPatch && today < parseISO(firstPatch.startDate)

  const footerLine1 = currentPatch
    ? `Currently v${currentPatch.version}`
    : beforeAnchor && firstPatch
    ? `Currently v${prevVersion(firstPatch.version)}`
    : firstPatch
    ? `v${firstPatch.version}`
    : 'No patches'

  const footerLine2 = currentPatch
    ? `ends ${format(parseISO(currentPatch.endDate), 'MMM d')}`
    : beforeAnchor && firstPatch
    ? `v${firstPatch.version} starts ${format(parseISO(firstPatch.startDate), 'MMM d')}`
    : `${config.recurring.patchLengthDays}d cycles`

  return (
    <aside className="w-56 shrink-0 bg-navy-800 border-r border-slate-700/50 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-accent-purple text-xl">✦</span>
          <div>
            <p className="text-sm font-semibold text-slate-100 leading-tight">Teyvat Pull</p>
            <p className="text-xs text-slate-500 leading-tight">Planner</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {NAV.map(({ tab, label, icon }) => (
          <button
            key={tab}
            onClick={() => setNav(tab)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full',
              nav === tab
                ? 'bg-accent-purple/20 text-accent-purple-light border border-accent-purple/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            )}
          >
            <span className="text-base w-5 text-center">{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-400">{footerLine1}</p>
        <p className="text-xs text-slate-500">{footerLine2}</p>
      </div>
    </aside>
  )
}
