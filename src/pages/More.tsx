import { format, isWithinInterval, parseISO } from 'date-fns'
import { BookOpen, CaretRight, CloudSun, Gear, Printer, type Icon } from '@phosphor-icons/react'
import { usePlannerStore } from '@/store/usePlannerStore'
import type { NavTab } from '@/types'

interface Item {
  label: string
  detail: string
  icon: Icon
  onClick: () => void
}

/** The More tab: everything that isn't the Plan or the Wallet. */
export function More() {
  const setNav = usePlannerStore((s) => s.setNav)
  const openGuide = usePlannerStore((s) => s.openGuide)
  const patches = usePlannerStore((s) => s.patches)

  const today = new Date()
  const current = patches.find((p) => isWithinInterval(today, { start: parseISO(p.startDate), end: parseISO(p.endDate) }))
  const go = (tab: NavTab) => () => setNav(tab)

  const items: Item[] = [
    { label: 'Patch guesses', detail: 'Mark upcoming patches as standard, sub-area or new region', icon: CloudSun, onClick: go('patches') },
    { label: 'Settings', detail: 'Income assumptions, 50/50 win rate, patch schedule, backup', icon: Gear, onClick: go('settings') },
    { label: 'Guide', detail: 'How pity, the 50/50 and the projections work', icon: BookOpen, onClick: () => openGuide() },
    {
      label: 'Print the plan',
      detail: 'Save your planned banners as a PDF',
      icon: Printer,
      onClick: () => {
        setNav('roadmap')
        // Let the Plan render before the print dialog snapshots the page.
        window.setTimeout(() => window.print(), 300)
      },
    },
  ]

  return (
    <div className="mx-auto max-w-2xl animate-fade-in md:mx-0 px-4 pb-6 pt-1.5 lg:px-9 lg:pt-7">
      <h1 className="px-1 text-2xl lg:text-[30px]">More</h1>
      {current && (
        <p className="mt-1 px-1 text-[13px] text-neutral-400">
          Currently v{current.version} · ends {format(parseISO(current.endDate), 'MMM d')}
        </p>
      )}
      <ul className="mt-4 flex flex-col gap-1.5">
        {items.map(({ label, detail, icon: ItemIcon, onClick }) => (
          <li key={label}>
            <button
              type="button"
              onClick={onClick}
              className="flex min-h-[60px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-neutral-800/50"
            >
              <ItemIcon size={22} className="flex-none text-accent-300" aria-hidden />
              <span className="flex-1">
                <span className="block text-[15px]">{label}</span>
                <span className="block text-xs text-neutral-400">{detail}</span>
              </span>
              <CaretRight className="flex-none text-neutral-500" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
