import { clsx } from 'clsx'
import { usePlannerStore } from '@/store/usePlannerStore'
import { PRIMARY_TABS, primaryTabFor } from './navItems'

/** Desktop rail (1b): a 76px column of icon tabs. */
export function Sidebar() {
  const nav = usePlannerStore((s) => s.nav)
  const setNav = usePlannerStore((s) => s.setNav)
  const active = primaryTabFor(nav)

  return (
    <nav aria-label="Main" className="flex w-[76px] shrink-0 flex-col items-center gap-2 py-5 shadow-[1px_0_0_var(--color-divider)]">
      {PRIMARY_TABS.map(({ tab, label, icon: Icon }) => {
        const on = active === tab
        return (
          <button
            key={tab}
            type="button"
            onClick={() => setNav(tab)}
            aria-current={on ? 'page' : undefined}
            className="group flex flex-col items-center gap-1 pb-1"
          >
            <span className={clsx('grid h-11 w-11 place-items-center rounded-lg transition-colors',
              on ? 'bg-accent-900 text-accent-200' : 'text-neutral-300 group-hover:bg-neutral-800/60')}>
              <Icon size={22} weight={on ? 'fill' : 'regular'} aria-hidden />
            </span>
            <span className={clsx('text-[11px]', on ? 'text-accent-300' : 'text-neutral-400')}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
