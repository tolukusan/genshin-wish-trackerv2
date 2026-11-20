import { useCallback, useMemo, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { CloudSun, Plus } from '@phosphor-icons/react'
import { usePlannerStore } from '@/store/usePlannerStore'
import { GettingStarted } from '@/components/ui/GettingStarted'
import { BannerCard } from '@/features/plan/BannerCard'
import { BannerSheet } from '@/features/plan/BannerSheet'
import { AddBannerDialog } from '@/features/plan/AddBannerDialog'
import { BalanceChart } from '@/features/plan/BalanceChart'
import { RiverTimeline } from '@/features/plan/RiverTimeline'
import { PrintPlan } from '@/features/plan/PrintPlan'
import { balanceSeries, pitySource } from '@/features/plan/planModel'
import { usePlanData } from '@/features/plan/usePlanData'

type Adding = { patchId: string; phase: 1 | 2 } | 'free' | null

export function Plan() {
  const setNav = usePlannerStore((s) => s.setNav)
  const characterPity = usePlannerStore((s) => s.player.characterBannerPity)
  const patches = usePlannerStore((s) => s.patches)
  const { today, results, snapshot, groups, wallet } = usePlanData()
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState<Adding>(null)

  const open = results.find((r) => r.stop.id === openId) ?? null
  const closeSheet = useCallback(() => setOpenId(null), [])
  const closeAdd = useCallback(() => setAdding(null), [])

  const todayIso = format(today, 'yyyy-MM-dd')
  // End the day before the last patch ends: the next patch starts on its end
  // date, and its income would otherwise show as a spike at the right edge.
  const lastEnd = groups.at(-1)?.patch.endDate
  const chartEnd = lastEnd ? format(addDays(parseISO(lastEnd), -1), 'yyyy-MM-dd') : todayIso
  const series = useMemo(
    () => balanceSeries(results, snapshot, patches, chartEnd, today),
    [results, snapshot, patches, chartEnd, today],
  )

  return (
    <div className="animate-fade-in">
      <PrintPlan results={results} wallet={wallet} characterPity={characterPity} today={today} />

      {/* ── Mobile / tablet: the river ─────────────────────────────────── */}
      <div className="lg:hidden print-hide md:max-w-[600px]">
        <header className="flex items-center justify-between pb-3 pl-5 pr-4 pt-1.5">
          <h1 className="text-2xl">Plan</h1>
          <div className="flex gap-1.5 print-hide">
            <button type="button" className="btn-secondary btn-icon" aria-label="Patch guesses" title="Patch guesses" onClick={() => setNav('patches')}>
              <CloudSun size={18} />
            </button>
            <button type="button" className="btn-primary btn-icon" aria-label="Add banner" title="Add banner" onClick={() => setAdding('free')}>
              <Plus size={18} />
            </button>
          </div>
        </header>
        <div className="px-4 pb-3">
          <GettingStarted hasBanners={results.length > 0} layout="river" />
        </div>
        <RiverTimeline
          groups={groups}
          results={results}
          snapshot={snapshot}
          wallet={wallet}
          today={today}
          onOpen={setOpenId}
          onAdd={(patchId, phase) => setAdding({ patchId, phase })}
        />
      </div>

      {/* ── Desktop: balance chart + banner cards ──────────────────────── */}
      <div className="hidden px-9 py-7 lg:block print-hide">
        <header className="flex items-end justify-between gap-6">
          <div>
            <div className="text-[13px] text-neutral-400">Teyvat Pull Planner</div>
            <h1 className="text-[30px] leading-tight">Plan</h1>
          </div>
          <div className="flex items-center gap-2 print-hide">
            <span className="mr-3 text-sm text-neutral-400">
              Wallet <b className="text-xl font-medium text-text">{wallet}</b> pulls · pity {characterPity}
            </span>
            <button type="button" className="btn-secondary h-11" onClick={() => setNav('patches')}>
              <CloudSun aria-hidden /> Patch guesses
            </button>
            <button type="button" className="btn-primary h-11" onClick={() => setAdding('free')}>
              <Plus aria-hidden /> Add banner
            </button>
          </div>
        </header>

        <div className="mt-5 max-w-xl">
          <GettingStarted hasBanners={results.length > 0} layout="desktop" />
        </div>

        <section className="mt-7" aria-labelledby="balance-h">
          <div className="mb-2 flex justify-between text-xs text-neutral-400">
            <span id="balance-h">Projected pull balance</span>
            <span>estimate · based on your patch guesses</span>
          </div>
          <BalanceChart series={series} results={results} start={todayIso} end={chartEnd} onOpen={setOpenId} />
        </section>

        <section className="mt-9" aria-label="Planned banners">
          {results.length === 0 ? (
            <button
              type="button"
              onClick={() => setAdding('free')}
              className="flex h-28 w-full max-w-md flex-col items-start justify-center gap-1 rounded-lg border border-dashed border-neutral-700 px-5 text-left transition-colors hover:border-accent hover:bg-accent/10"
            >
              <span className="flex items-center gap-1.5 text-accent-300"><Plus aria-hidden /> Add the first banner you’re saving for</span>
              <span className="text-[13px] text-neutral-400">Its chance of success and what carries forward show up here.</span>
            </button>
          ) : (
            <ul className="grid grid-cols-3 gap-3.5">
              {results.map((r) => (
                <li key={r.stop.id}>
                  <BannerCard result={r} withVersion size="desktop" today={today} onOpen={() => setOpenId(r.stop.id)} />
                </li>
              ))}
            </ul>
          )}
          {results.length > 0 && (
            <p className="mt-4 text-xs text-neutral-500">
              Banners are planned in date order; pity and leftover pulls carry into the next one.
              {groups.length > 0 && ` Showing through v${groups.at(-1)!.patch.version}, ending ${format(parseISO(chartEnd), 'MMM d')}.`}
            </p>
          )}
        </section>
      </div>

      {open && <BannerSheet result={open} wallet={wallet} pitySource={pitySource(results, open)} onClose={closeSheet} />}
      {adding && (
        <AddBannerDialog
          initial={adding === 'free' ? undefined : adding}
          onClose={closeAdd}
          onAdded={(id) => { setAdding(null); setOpenId(id) }}
        />
      )}
    </div>
  )
}
