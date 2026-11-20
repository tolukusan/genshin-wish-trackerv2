import { lazy, Suspense } from 'react'
import { CaretLeft } from '@phosphor-icons/react'
import { usePlannerStore } from '@/store/usePlannerStore'
import type { NavTab } from '@/types'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { resolveNav } from './navItems'
import { DriveBanner } from '@/components/ui/DriveBanner'

// Each page is its own chunk, so the first load only downloads the page being opened.
const Plan = lazy(() => import('@/pages/Plan').then((m) => ({ default: m.Plan })))
const DataEntry = lazy(() => import('@/pages/DataEntry').then((m) => ({ default: m.DataEntry })))
const More = lazy(() => import('@/pages/More').then((m) => ({ default: m.More })))
const Patches = lazy(() => import('@/pages/Patches').then((m) => ({ default: m.Patches })))
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })))
const Guide = lazy(() => import('@/pages/Guide').then((m) => ({ default: m.Guide })))

/** Secondary pages, opened from More (or from Plan, for patch guesses). */
const SECONDARY: Partial<Record<NavTab, { back: NavTab; backLabel: string }>> = {
  patches: { back: 'roadmap', backLabel: 'Plan' },
  settings: { back: 'more', backLabel: 'More' },
  guide: { back: 'more', backLabel: 'More' },
}

function PageLoading() {
  return <div className="p-6 text-sm text-neutral-400" role="status">Loading…</div>
}

export function AppShell() {
  const nav = resolveNav(usePlannerStore((s) => s.nav))
  const setNav = usePlannerStore((s) => s.setNav)
  const secondary = SECONDARY[nav]

  return (
    <div className="app-shell app-ground flex h-dvh overflow-hidden">
      {/* Rail — desktop and tablet */}
      <div className="hidden md:flex print-hide">
        <Sidebar />
      </div>

      {/* Main content — bottom padding on mobile clears the tab bar */}
      <main className="flex-1 overflow-y-auto pb-24 pt-3 md:pb-0 md:pt-0">
        {secondary && (
          <div className="px-4 pt-1 md:px-6 md:pt-4 print-hide">
            <button type="button" className="btn-ghost -ml-1 px-1.5" onClick={() => setNav(secondary.back)}>
              <CaretLeft aria-hidden /> {secondary.backLabel}
            </button>
          </div>
        )}
        <Suspense fallback={<PageLoading />}>
          {nav === 'roadmap' && <Plan />}
          {nav === 'data-entry' && <DataEntry />}
          {nav === 'more' && <More />}
          {secondary && (
            <div className="p-4 sm:p-6">
              {nav === 'patches' && <Patches />}
              {nav === 'settings' && <Settings />}
              {nav === 'guide' && <Guide />}
            </div>
          )}
        </Suspense>
      </main>

      {/* Tab bar — mobile only */}
      <div className="md:hidden print-hide">
        <BottomNav />
      </div>

      <div className="print-hide">
        <DriveBanner />
      </div>
    </div>
  )
}
