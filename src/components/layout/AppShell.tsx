import { lazy, Suspense } from 'react'
import { usePlannerStore } from '@/store/usePlannerStore'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { DriveBanner } from '@/components/ui/DriveBanner'

// Each page is its own chunk, so the first load only downloads the page being
// opened (Recharts, the largest dependency, is only needed by Next Character).
const NextCharacter = lazy(() => import('@/pages/NextCharacter').then((m) => ({ default: m.NextCharacter })))
const DataEntry = lazy(() => import('@/pages/DataEntry').then((m) => ({ default: m.DataEntry })))
const Patches = lazy(() => import('@/pages/Patches').then((m) => ({ default: m.Patches })))
const Roadmap = lazy(() => import('@/pages/Roadmap').then((m) => ({ default: m.Roadmap })))
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })))

function PageLoading() {
  return <div className="p-6 text-sm text-slate-500" role="status">Loading…</div>
}

export function AppShell() {
  const nav = usePlannerStore((s) => s.nav)

  return (
    <div className={`app-shell flex h-screen overflow-hidden${nav === 'roadmap' ? ' print-roadmap' : ''}`}>
      {/* Sidebar — desktop only */}
      <div className="hidden sm:flex print-hide">
        <Sidebar />
      </div>

      {/* Main content — add bottom padding on mobile to clear the bottom nav */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6">
        <Suspense fallback={<PageLoading />}>
          {nav === 'next-character' && <NextCharacter />}
          {nav === 'data-entry' && <DataEntry />}
          {nav === 'patches' && <Patches />}
          {nav === 'roadmap' && <Roadmap />}
          {nav === 'settings' && <Settings />}
        </Suspense>
      </main>

      {/* Bottom nav — mobile only */}
      <div className="sm:hidden print-hide">
        <BottomNav />
      </div>

      <div className="print-hide">
        <DriveBanner />
      </div>
    </div>
  )
}
