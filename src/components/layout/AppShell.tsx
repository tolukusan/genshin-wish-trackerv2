import { usePlannerStore } from '@/store/usePlannerStore'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { NextCharacter } from '@/pages/NextCharacter'
import { DataEntry } from '@/pages/DataEntry'
import { Patches } from '@/pages/Patches'
import { Roadmap } from '@/pages/Roadmap'
import { Settings } from '@/pages/Settings'
import { DriveBanner } from '@/components/ui/DriveBanner'

export function AppShell() {
  const nav = usePlannerStore((s) => s.nav)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop only */}
      <div className="hidden sm:flex">
        <Sidebar />
      </div>

      {/* Main content — add bottom padding on mobile to clear the bottom nav */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6">
        {nav === 'next-character' && <NextCharacter />}
        {nav === 'data-entry' && <DataEntry />}
        {nav === 'patches' && <Patches />}
        {nav === 'roadmap' && <Roadmap />}
        {nav === 'settings' && <Settings />}
      </main>

      {/* Bottom nav — mobile only */}
      <div className="sm:hidden">
        <BottomNav />
      </div>

      <DriveBanner />
    </div>
  )
}
