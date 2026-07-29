import { useEffect } from 'react'
import { usePlannerStore } from '@/store/usePlannerStore'
import { runProjection, buildTimeline } from '@/engine/projectionEngine'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { NumberInput } from '@/components/ui/NumberInput'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { Patch } from '@/types'

// One "need X more" line. Green when already met; red for a hard blocker (can't get
// any 5-star yet), amber for a softer/not-guaranteed-yet goal.
function NeedLine({ label, need, blocker = false }: { label: string; need: number; blocker?: boolean }) {
  const met = need <= 0
  const color = met ? '#059669' : blocker ? '#dc2626' : '#b45309'
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span style={{ color, fontWeight: met ? 500 : 600 }}>
        {met ? 'Have enough ✓' : `Need ${need} more`}
      </span>
    </div>
  )
}

// Earliest phase, across all patches, that hasn't started yet.
function findNextPhase(patches: Patch[], today: Date) {
  let best: { patch: Patch; phase: Patch['phases'][number] } | null = null
  for (const patch of patches) {
    for (const phase of patch.phases) {
      if (parseISO(phase.startDate) <= today) continue
      if (!best || parseISO(phase.startDate) < parseISO(best.phase.startDate)) {
        best = { patch, phase }
      }
    }
  }
  return best
}

export function NextCharacter() {
  const { player, config, patches, target, setTarget } = usePlannerStore()

  const pityBasedPullsNeeded = config.hardPityCharacter - player.characterBannerPity
  const copies = target?.copies ?? 1

  // Default to the next upcoming banner phase the first time this view is opened.
  useEffect(() => {
    if (target) return
    const next = findNextPhase(patches, new Date())
    if (!next) return
    setTarget({
      patchId: next.patch.id,
      phase: next.phase.phase,
      label: next.phase.featuredCharacters[0] || `${next.patch.version} Phase ${next.phase.phase}`,
      pullsNeeded: pityBasedPullsNeeded,
      copies: 1,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // No user-facing toggles here: the automatic F2P sources (Commissions, Abyss,
  // Theatre, Stygian, Trials, Monthly Shop) always count, and Welkin/Battle Pass
  // already follow whatever the player actually set on Data Entry.
  const engineConfig = {
    ...config,
    commissionsIncluded: true,
    spiralAbyssEnabled: true,
    imaginariumTheatreEnabled: true,
    stygianOnslaughtEnabled: true,
    characterTrialsEnabled: true,
    monthlyShopIncluded: true,
    welkinIncluded: false,
    battlePassIncluded: true,
  }

  const forecast = target ? runProjection({ player, config: engineConfig, patches, target }) : null
  const timeline = target ? buildTimeline({ player, config: engineConfig, patches, target }) : []

  // Scale the single-copy thresholds for wanting multiple copies (constellations).
  // The first copy uses the real pity-aware cost; every additional copy assumes a
  // fresh cycle (pity resets to 0 after each 5-star, regardless of the outcome).
  const extraCopies = copies - 1
  const scaled = forecast ? {
    pullsToPity: forecast.pullsToPity + extraCopies * config.hardPityCharacter,
    pullsForGuarantee: forecast.pullsForGuarantee + extraCopies * 2 * config.hardPityCharacter,
    pullsToSoftPity: forecast.pullsToSoftPity + extraCopies * config.softPityCharacter,
    pullsForGuaranteeSoftPity: forecast.pullsForGuaranteeSoftPity + extraCopies * 2 * config.softPityCharacter,
  } : null
  const copyWord = copies > 1 ? `${copies} copies` : 'a character'

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Next Character</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your pull projection toward the next banner you're saving for.</p>
      </div>

      {/* Target selector */}
      <section className="card p-5">
        <SectionHeader title="Target Banner" sub="Defaults to the next upcoming banner — change it to check a further-out one" />
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="label">Patch & Phase</label>
            <select
              className="input-base"
              value={target ? `${target.patchId}:${target.phase}` : ''}
              onChange={(e) => {
                if (!e.target.value) { setTarget(null); return }
                const [patchId, phase] = e.target.value.split(':')
                const patch = patches.find((p) => p.id === patchId)
                const ph = patch?.phases.find((p) => p.phase === parseInt(phase))
                if (!patch || !ph) return
                setTarget({
                  patchId,
                  phase: parseInt(phase) as 1 | 2,
                  label: ph.featuredCharacters[0] || `${patch.version} Phase ${phase}`,
                  pullsNeeded: pityBasedPullsNeeded,
                  copies,
                })
              }}
            >
              <option value="">— Select banner —</option>
              {patches.map((p) =>
                p.phases.map((ph) => (
                  <option key={`${p.id}:${ph.phase}`} value={`${p.id}:${ph.phase}`}>
                    v{p.version} Phase {ph.phase} — {format(parseISO(ph.startDate), 'MMM d, yyyy')}
                    {ph.featuredCharacters[0] ? ` · ${ph.featuredCharacters[0]}` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <NumberInput
            label="Copies Wanted"
            value={copies}
            min={1}
            max={7}
            onChange={(v) => target && setTarget({ ...target, copies: v })}
            hint="1 = C0, 7 = C6"
          />

          <div className="flex flex-col gap-1">
            <label className="label">Pulls Needed</label>
            <div style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(203,213,225,0.9)',
              background: 'rgba(241,245,249,0.8)',
              color: '#6d28d9',
              fontWeight: 700,
              fontSize: '1.05rem',
            }}>
              {pityBasedPullsNeeded + (copies - 1) * config.hardPityCharacter}
            </div>
            <p className="text-xs text-slate-500">
              {player.characterBannerPity} pity in · next 5★ is {player.characterBannerGuaranteed ? 'Guaranteed' : 'on 50/50'}
            </p>
          </div>
        </div>
      </section>

      {/* Empty state */}
      {!target && (
        <div className="card p-10 text-center">
          <p className="text-slate-500">No upcoming banners in the patch schedule — add one in Patches.</p>
        </div>
      )}

      {forecast && (
        <>
          {/* Two primary numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* At banner start */}
            <div
              className="card p-5 flex flex-col gap-3"
              style={{ borderColor: forecast.canGuaranteeAtStart ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.25)' }}
            >
              <div>
                <p className="label">Pulls at Banner Start</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {forecast.atStart.cutoffDate ? format(parseISO(forecast.atStart.cutoffDate), 'MMM d, yyyy') : '—'}
                  {' · '}{forecast.atStart.daysToTarget}d away
                </p>
              </div>
              <p style={{ fontSize: '2.25rem', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
                {forecast.atStart.totalPulls}
              </p>
              <div className="flex flex-col gap-1">
                <NeedLine
                  label={`For ${copyWord}`}
                  need={Math.max(0, scaled!.pullsToPity - forecast.atStart.totalPulls)}
                  blocker
                />
                <NeedLine
                  label={`To guarantee ${copyWord}`}
                  need={Math.max(0, scaled!.pullsForGuarantee - forecast.atStart.totalPulls)}
                />
                <NeedLine
                  label="To reach soft pity"
                  need={Math.max(0, scaled!.pullsToSoftPity - forecast.atStart.totalPulls)}
                />
                <NeedLine
                  label="To guarantee (soft pity)"
                  need={Math.max(0, scaled!.pullsForGuaranteeSoftPity - forecast.atStart.totalPulls)}
                />
              </div>
            </div>

            {/* At banner end */}
            <div
              className="card p-5 flex flex-col gap-3"
              style={{ borderColor: forecast.canGuaranteeAtEnd ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.25)' }}
            >
              <div>
                <p className="label">Pulls at Banner End</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {forecast.atEnd.cutoffDate ? format(parseISO(forecast.atEnd.cutoffDate), 'MMM d, yyyy') : '—'}
                  {' · '}{forecast.atEnd.daysToTarget}d away
                </p>
              </div>
              <p style={{ fontSize: '2.25rem', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
                {forecast.atEnd.totalPulls}
              </p>
              <div className="flex flex-col gap-1">
                <NeedLine
                  label={`For ${copyWord}`}
                  need={Math.max(0, scaled!.pullsToPity - forecast.atEnd.totalPulls)}
                  blocker
                />
                <NeedLine
                  label={`To guarantee ${copyWord}`}
                  need={Math.max(0, scaled!.pullsForGuarantee - forecast.atEnd.totalPulls)}
                />
                <NeedLine
                  label="To reach soft pity"
                  need={Math.max(0, scaled!.pullsToSoftPity - forecast.atEnd.totalPulls)}
                />
                <NeedLine
                  label="To guarantee (soft pity)"
                  need={Math.max(0, scaled!.pullsForGuaranteeSoftPity - forecast.atEnd.totalPulls)}
                />
              </div>
            </div>
          </div>

          {/* Chart */}
          {timeline.length > 0 && (
            <section className="card p-5">
              <SectionHeader title="Pull Growth Timeline" sub="Cumulative pulls from today through banner end" />
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pullGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.4} />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#475569' }}
                      itemStyle={{ color: '#6d28d9' }}
                    />
                    {scaled && (
                      <ReferenceLine y={scaled.pullsToPity} stroke="#d4af37" strokeDasharray="4 2"
                        label={{ value: `Need ${scaled.pullsToPity}`, fill: '#b45309', fontSize: 11 }} />
                    )}
                    <Area type="monotone" dataKey="cumulativePulls" stroke="#7c3aed" strokeWidth={2} fill="url(#pullGrad)" name="Pulls" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Breakdown — two columns: start vs end */}
          <section className="card p-5">
            <SectionHeader title="Breakdown" sub="All sources contributing to your pull count" />
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Start breakdown */}
              <div>
                <p className="label mb-2">At Banner Start</p>
                <div className="flex flex-col divide-y divide-slate-300/40">
                  {forecast.atStart.breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-xs">
                      <span className="text-slate-600">{item.source}</span>
                      <div className="flex gap-3 text-right">
                        {item.primogems > 0 && <span className="text-slate-700">{item.primogems.toLocaleString()} <span className="text-slate-400">✦</span></span>}
                        {item.fates > 0 && <span style={{ color: '#b45309' }}>{item.fates} <span className="text-slate-400">fates</span></span>}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2 text-sm font-semibold">
                    <span className="text-slate-900">Total Pulls</span>
                    <span style={{ color: '#6d28d9' }}>{forecast.atStart.totalPulls}</span>
                  </div>
                </div>
              </div>

              {/* End breakdown — incremental only */}
              <div>
                <p className="label mb-2">At Banner End (+{config.recurring.bannerDurationDays}d)</p>
                <div className="flex flex-col divide-y divide-slate-300/40">
                  {/* Summary of what was already counted at banner start */}
                  <div className="flex items-center justify-between py-2 text-xs">
                    <span className="text-slate-600">At banner start</span>
                    <span className="text-slate-700 font-semibold">{forecast.atStart.totalPulls} pulls</span>
                  </div>
                  {/* Only the new income earned during the banner window */}
                  {forecast.deltaAtEnd.breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-xs">
                      <span className="text-slate-600">{item.source}</span>
                      <div className="flex gap-3 text-right">
                        {item.primogems > 0 && <span className="text-slate-700">{item.primogems.toLocaleString()} <span className="text-slate-400">✦</span></span>}
                        {item.fates > 0 && <span style={{ color: '#b45309' }}>{item.fates} <span className="text-slate-400">fates</span></span>}
                      </div>
                    </div>
                  ))}
                  {forecast.deltaAtEnd.breakdown.length === 0 && (
                    <div className="py-2 text-xs text-slate-400">No additional income during banner window</div>
                  )}
                  <div className="flex items-center justify-between py-2 text-sm font-semibold">
                    <span className="text-slate-900">Total Pulls</span>
                    <span style={{ color: '#6d28d9' }}>{forecast.atEnd.totalPulls}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
