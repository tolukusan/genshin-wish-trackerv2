import { usePlannerStore } from '@/store/usePlannerStore'
import { runProjection, buildTimeline } from '@/engine/projectionEngine'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { NumberInput } from '@/components/ui/NumberInput'
import { Toggle } from '@/components/ui/Toggle'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'

export function Forecast() {
  const { player, config, patches, target, setTarget, updateConfig } = usePlannerStore()

  const pityBasedPullsNeeded = player.characterBannerGuaranteed
    ? config.hardPityCharacter - player.characterBannerPity
    : config.hardPityCharacter * 2 - player.characterBannerPity

  const forecast = target ? runProjection({ player, config, patches, target }) : null
  const timeline = target ? buildTimeline({ player, config, patches, target }) : []

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Forecast</h1>
        <p className="text-sm text-slate-500 mt-0.5">Select a target banner and see your projected pull count.</p>
      </div>

      {/* Target selector */}
      <section className="card p-5">
        <SectionHeader title="Target Banner" sub="Which banner are you saving for?" />
        <div className="grid sm:grid-cols-2 gap-4">
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
                  pullsNeeded: target?.pullsNeeded ?? pityBasedPullsNeeded,
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

          <div className="flex flex-col gap-1">
            <label className="label">Target Label (optional)</label>
            <input
              className="input-base"
              placeholder="e.g. Mavuika rerun"
              value={target?.label ?? ''}
              onChange={(e) => target && setTarget({ ...target, label: e.target.value })}
              disabled={!target}
            />
          </div>

          <div className="flex flex-col gap-1">
            <NumberInput
              label="Pulls Needed"
              value={target?.pullsNeeded ?? pityBasedPullsNeeded}
              min={1}
              max={360}
              onChange={(v) => target && setTarget({ ...target, pullsNeeded: v })}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Based on pity: <span className="text-slate-300">{pityBasedPullsNeeded}</span>
                {' '}({player.characterBannerGuaranteed ? 'guaranteed' : '50/50 worst case'}, {player.characterBannerPity} pity)
              </p>
              {target && target.pullsNeeded !== pityBasedPullsNeeded && (
                <button
                  className="text-xs text-accent-purple-light hover:underline"
                  onClick={() => setTarget({ ...target, pullsNeeded: pityBasedPullsNeeded })}
                >
                  Reset ↺
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Income toggles */}
        <div className="mt-4 pt-4 border-t border-slate-700/40">
          <p className="label mb-3">Include in projection</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Toggle label="Daily Commissions" checked={config.commissionsIncluded} onChange={(v) => updateConfig({ commissionsIncluded: v })} />
            <Toggle label="Welkin Moon" checked={config.welkinIncluded} onChange={(v) => updateConfig({ welkinIncluded: v })} hint="Uses days remaining from Dashboard" />
            <Toggle label="Spiral Abyss" checked={config.spiralAbyssEnabled} onChange={(v) => updateConfig({ spiralAbyssEnabled: v })} hint="Resets on the 16th" />
            <Toggle label="Imaginarium Theatre" checked={config.imaginariumTheatreEnabled} onChange={(v) => updateConfig({ imaginariumTheatreEnabled: v })} hint="Resets on the 1st" />
            <Toggle label="Stygian Onslaught" checked={config.stygianOnslaughtEnabled} onChange={(v) => updateConfig({ stygianOnslaughtEnabled: v })} hint="7 days after each patch start" />
            <Toggle label="Character Trials" checked={config.characterTrialsEnabled} onChange={(v) => updateConfig({ characterTrialsEnabled: v })} hint="40 primos per phase (2 × 20)" />
            <Toggle label="Monthly Shop" checked={config.monthlyShopIncluded} onChange={(v) => updateConfig({ monthlyShopIncluded: v })} hint="Resets on the 1st" />
            <Toggle label="Battle Pass" checked={config.battlePassIncluded} onChange={(v) => updateConfig({ battlePassIncluded: v })} hint="Mode set on Dashboard (free = 0 primos)" />
          </div>
        </div>
      </section>

      {/* Empty state */}
      {!target && (
        <div className="card p-10 text-center">
          <p className="text-slate-500">Select a target banner above to see your forecast.</p>
        </div>
      )}

      {forecast && (
        <>
          {/* Three primary numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <p style={{ fontSize: '2.25rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>
                {forecast.atStart.totalPulls}
              </p>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Need</span>
                  <span className="text-slate-300">{forecast.pullsNeeded}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Margin</span>
                  <span style={{ color: (forecast.atStart.totalPulls - forecast.pullsNeeded) >= 0 ? '#34d399' : '#f87171' }}>
                    {forecast.atStart.totalPulls - forecast.pullsNeeded >= 0 ? '+' : ''}{forecast.atStart.totalPulls - forecast.pullsNeeded}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Guarantee</span>
                  <span style={{ color: forecast.canGuaranteeAtStart ? '#34d399' : '#f87171' }}>
                    {forecast.canGuaranteeAtStart ? 'Yes ✓' : 'No ✗'}
                  </span>
                </div>
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
              <p style={{ fontSize: '2.25rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>
                {forecast.atEnd.totalPulls}
              </p>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Need</span>
                  <span className="text-slate-300">{forecast.pullsNeeded}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Margin</span>
                  <span style={{ color: (forecast.atEnd.totalPulls - forecast.pullsNeeded) >= 0 ? '#34d399' : '#f87171' }}>
                    {forecast.atEnd.totalPulls - forecast.pullsNeeded >= 0 ? '+' : ''}{forecast.atEnd.totalPulls - forecast.pullsNeeded}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Guarantee</span>
                  <span style={{ color: forecast.canGuaranteeAtEnd ? '#34d399' : '#f87171' }}>
                    {forecast.canGuaranteeAtEnd ? 'Yes ✓' : 'No ✗'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pity info */}
            <div className="card p-5 flex flex-col gap-3">
              <div>
                <p className="label">Pulls to Next Pity</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {forecast.guaranteedAtTarget ? 'Guaranteed (no 50/50)' : 'On 50/50'}
                </p>
              </div>
              <p style={{ fontSize: '2.25rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>
                {forecast.pullsToPity}
              </p>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Current pity</span>
                  <span className="text-slate-300">{forecast.pityAtTarget} / 90</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Soft pity</span>
                  <span style={{ color: forecast.pityAtTarget >= config.softPityCharacter ? '#fbbf24' : '#64748b' }}>
                    {forecast.pityAtTarget >= config.softPityCharacter ? `Active (${forecast.pityAtTarget}+)` : `Starts at ${config.softPityCharacter}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Status</span>
                  <span style={{ color: forecast.guaranteedAtTarget ? '#34d399' : '#94a3b8' }}>
                    {forecast.guaranteedAtTarget ? 'Guaranteed' : '50/50'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          {timeline.length > 0 && (
            <section className="card p-5">
              <SectionHeader title="Pull Growth Timeline" sub="Cumulative pulls from today to banner start" />
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pullGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.4} />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1a2332', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#94a3b8' }}
                      itemStyle={{ color: '#a78bfa' }}
                    />
                    {target && (
                      <ReferenceLine y={target.pullsNeeded} stroke="#d4af37" strokeDasharray="4 2"
                        label={{ value: `Need ${target.pullsNeeded}`, fill: '#d4af37', fontSize: 11 }} />
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
                <div className="flex flex-col divide-y divide-slate-700/40">
                  {forecast.atStart.breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-xs">
                      <span className="text-slate-400">{item.source}</span>
                      <div className="flex gap-3 text-right">
                        {item.primogems > 0 && <span className="text-slate-300">{item.primogems.toLocaleString()} <span className="text-slate-600">✦</span></span>}
                        {item.fates > 0 && <span style={{ color: '#f0d060' }}>{item.fates} <span className="text-slate-600">fates</span></span>}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2 text-sm font-semibold">
                    <span className="text-slate-100">Total Pulls</span>
                    <span style={{ color: '#a78bfa' }}>{forecast.atStart.totalPulls}</span>
                  </div>
                </div>
              </div>

              {/* End breakdown */}
              <div>
                <p className="label mb-2">At Banner End (+{config.recurring.bannerDurationDays}d)</p>
                <div className="flex flex-col divide-y divide-slate-700/40">
                  {forecast.atEnd.breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-xs">
                      <span className="text-slate-400">{item.source}</span>
                      <div className="flex gap-3 text-right">
                        {item.primogems > 0 && <span className="text-slate-300">{item.primogems.toLocaleString()} <span className="text-slate-600">✦</span></span>}
                        {item.fates > 0 && <span style={{ color: '#f0d060' }}>{item.fates} <span className="text-slate-600">fates</span></span>}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2 text-sm font-semibold">
                    <span className="text-slate-100">Total Pulls</span>
                    <span style={{ color: '#a78bfa' }}>{forecast.atEnd.totalPulls}</span>
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
