import { clsx } from 'clsx'
import { usePlannerStore } from '@/store/usePlannerStore'
import { PRIMARY_TABS, primaryTabFor } from './navItems'

/** Mobile tab bar (1b): Plan · Wallet · More. */
export function BottomNav() {
  const nav = usePlannerStore((s) => s.nav)
  const setNav = usePlannerStore((s) => s.setNav)
  const active = primaryTabFor(nav)

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 bg-bg/92 shadow-[0_-1px_0_var(--color-divider)] backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {PRIMARY_TABS.map(({ tab, label, icon: Icon }) => {
        const on = active === tab
        return (
          <button
            key={tab}
            type="button"
            onClick={() => setNav(tab)}
            aria-current={on ? 'page' : undefined}
            className={clsx('flex h-[62px] flex-col items-center justify-center gap-0.5 text-[11px] transition-colors', on ? 'text-accent-300' : 'text-neutral-400 hover:text-neutral-200')}
          >
            <Icon size={24} weight={on ? 'fill' : 'regular'} aria-hidden />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
