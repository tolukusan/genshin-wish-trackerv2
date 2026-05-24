import { usePlannerStore } from '@/store/usePlannerStore'
import { runProjection, buildTimeline } from '@/engine/projectionEngine'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Toggle } from '@/components/ui/Toggle'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'

export function Forecast() {
  const { player, config, patches, target, setTarget, updateConfig } = usePlannerStore()

  const pityBasedPullsNeeded = config.hardPityCharacter - player.characterBannerPity

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
                  pullsNeeded: pityBasedPullsNeeded,
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
            <label className="label">Pulls Needed</label>
            <div style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(71,85,105,0.4)',
              background: 'rgba(15,23,42,0.5)',
              color: '#a78bfa',
              fontWeight: 700,
              fontSize: '1.05rem',
            }}>
              {pityBasedPullsNeeded}
            </div>
            <p className="text-xs text-slate-500">
              {player.characterBannerPity} pity in · next 5★ is {player.characterBannerGuaranteed ? 'Guaranteed' : 'on 50/50'}
            </p>
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
                  <span className="text-slate-300">{pityBasedPullsNeeded}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Margin</span>
                  <span style={{ color: (forecast.atStart.totalPulls - pityBasedPullsNeeded) >= 0 ? '#34d399' : '#f87171' }}>
                    {forecast.atStart.totalPulls - pityBasedPullsNeeded >= 0 ? '+' : ''}{forecast.atStart.totalPulls - pityBasedPullsNeeded}
                  </span>
                </div>
                {!forecast.canGuaranteeAtStart && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Ends at pity</span>
                    <span style={{ color: '#f87171' }}>
                      {Math.min(forecast.pityAtTarget + forecast.atStart.totalPulls, config.hardPityCharacter)} / {config.hardPityCharacter}
                    </span>
                  </div>
                )}
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
                  <span className="text-slate-300">{pityBasedPullsNeeded}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Margin</span>
                  <span style={{ color: (forecast.atEnd.totalPulls - pityBasedPullsNeeded) >= 0 ? '#34d399' : '#f87171' }}>
                    {forecast.atEnd.totalPulls - pityBasedPullsNeeded >= 0 ? '+' : ''}{forecast.atEnd.totalPulls - pityBasedPullsNeeded}
                  </span>
                </div>
                {!forecast.canGuaranteeAtEnd && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Ends at pity</span>
                    <span style={{ color: '#f87171' }}>
                      {Math.min(forecast.pityAtTarget + forecast.atEnd.totalPulls, config.hardPityCharacter)} / {config.hardPityCharacter}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Guarantee</span>
                  <span style={{ color: forecast.canGuaranteeAtEnd ? '#34d399' : '#f87171' }}>
                    {forecast.canGuaranteeAtEnd ? 'Yes ✓' : 'No ✗'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pulls remaining after spend */}
            {(() => {
              const canAffordAtStart = forecast.canGuaranteeAtStart
              const canAffordAtEnd = forecast.canGuaranteeAtEnd
              const remainAtStart = canAffordAtStart
                ? forecast.atStart.totalPulls - pityBasedPullsNeeded
                : forecast.atStart.totalPulls
              const remainAtEnd = canAffordAtEnd
                ? forecast.atEnd.totalPulls - pityBasedPullsNeeded
                : forecast.atEnd.totalPulls
              return (
                <div
                  className="card p-5 flex flex-col gap-3"
                  style={{ borderColor: canAffordAtEnd ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.25)' }}
                >
                  <div>
                    <p className="label">Pulls Remaining</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {canAffordAtEnd ? 'After spending on this character' : 'Carries over — can\'t afford yet'}
                    </p>
                  </div>
                  <p style={{ fontSize: '2.25rem', fontWeight: 700, color: canAffordAtEnd ? '#34d399' : '#f87171', lineHeight: 1 }}>
                    +{remainAtEnd}
                  </p>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">At banner start</span>
                      <span style={{ color: canAffordAtStart ? '#34d399' : '#f87171' }}>
                        +{remainAtStart}{!canAffordAtStart && ' (carry)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">At banner end</span>
                      <span style={{ color: canAffordAtEnd ? '#34d399' : '#f87171' }}>
                        +{remainAtEnd}{!canAffordAtEnd && ' (carry)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Pity · Status</span>
                      <span className="text-slate-400">
                        {forecast.pityAtTarget} · {forecast.guaranteedAtTarget ? 'Guaranteed' : '50/50'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })()}
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

              {/* End breakdown — incremental only */}
              <div>
                <p className="label mb-2">At Banner End (+{config.recurring.bannerDurationDays}d)</p>
                <div className="flex flex-col divide-y divide-slate-700/40">
                  {/* Summary of what was already counted at banner start */}
                  <div className="flex items-center justify-between py-2 text-xs">
                    <span className="text-slate-400">At banner start</span>
                    <span className="text-slate-300 font-semibold">{forecast.atStart.totalPulls} pulls</span>
                  </div>
                  {/* Only the new income earned during the banner window */}
                  {forecast.deltaAtEnd.breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-xs">
                      <span className="text-slate-400">{item.source}</span>
                      <div className="flex gap-3 text-right">
                        {item.primogems > 0 && <span className="text-slate-300">{item.primogems.toLocaleString()} <span className="text-slate-600">✦</span></span>}
                        {item.fates > 0 && <span style={{ color: '#f0d060' }}>{item.fates} <span className="text-slate-600">fates</span></span>}
                      </div>
                    </div>
                  ))}
                  {forecast.deltaAtEnd.breakdown.length === 0 && (
                    <div className="py-2 text-xs text-slate-600">No additional income during banner window</div>
                  )}
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
