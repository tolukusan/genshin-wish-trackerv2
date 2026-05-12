import { usePlannerStore } from '@/store/usePlannerStore'
import type { NavTab } from '@/types'
import { clsx } from 'clsx'

const NAV: { tab: NavTab; label: string; icon: string }[] = [
  { tab: 'dashboard', label: 'Home', icon: '⬡' },
  { tab: 'patches', label: 'Patches', icon: '◈' },
  { tab: 'forecast', label: 'Forecast', icon: '◎' },
  { tab: 'scenarios', label: 'Chain', icon: '⇢' },
  { tab: 'settings', label: 'Settings', icon: '⚙' },
]

export function BottomNav() {
  const { nav, setNav } = usePlannerStore()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        backgroundColor: '#0f1729',
        borderTop: '1px solid rgba(51,65,85,0.6)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV.map(({ tab, label, icon }) => (
        <button
          key={tab}
          onClick={() => setNav(tab)}
          style={{ flex: 1, padding: '0.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
          className={clsx(
            'transition-colors',
            nav === tab ? 'text-accent-purple-light' : 'text-slate-500'
          )}
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{icon}</span>
          <span style={{ fontSize: '0.65rem', fontWeight: nav === tab ? 600 : 400 }}>{label}</span>
        </button>
      ))}
    </nav>
  )
}
