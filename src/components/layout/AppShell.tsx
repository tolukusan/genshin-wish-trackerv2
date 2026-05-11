import { usePlannerStore } from '@/store/usePlannerStore'
import { Sidebar } from './Sidebar'
import { Dashboard } from '@/pages/Dashboard'
import { Patches } from '@/pages/Patches'
import { Forecast } from '@/pages/Forecast'
import { Scenarios } from '@/pages/Scenarios'
import { Settings } from '@/pages/Settings'
import { DriveBanner } from '@/components/ui/DriveBanner'

export function AppShell() {
  const nav = usePlannerStore((s) => s.nav)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {nav === 'dashboard' && <Dashboard />}
        {nav === 'patches' && <Patches />}
        {nav === 'forecast' && <Forecast />}
        {nav === 'scenarios' && <Scenarios />}
        {nav === 'settings' && <Settings />}
      </main>
      <DriveBanner />
    </div>
  )
}
