import { usePlannerStore } from '@/store/usePlannerStore'
import { getRoadmapBridge, runChain } from '@/engine/projectionEngine'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { NumberInput } from '@/components/ui/NumberInput'
import { format, parseISO } from 'date-fns'
import type { ChainStopResult } from '@/types'

type Tier = 'safe' | 'partial' | 'none'

interface PityState {
  pity: number
  guaranteed: boolean
}

function getPityStates(
  results: ChainStopResult[],
  startingPity: number,
  startingGuaranteed: boolean,
  hardPity: number,
): PityState[] {
  let pity = startingPity
  let guaranteed = startingGuaranteed

  return results.map((result) => {
    const before = { pity, guaranteed }

    if (result.actualSpend > 0) {
      let total = pity + result.actualSpend
      while (total >= hardPity) {
        total -= hardPity
        guaranteed = !guaranteed
      }
      pity = total
    }

    return before
  })
}

function outcomeFor(
  result: ChainStopResult | undefined,
  state: PityState,
  hardPity: number,
): {
  tier: Tier
  title: string
  detail: string
  pullsToNextFiveStar: number
  pullsToGuaranteeFeatured: number
} {
  const pullsToNextFiveStar = Math.max(0, hardPity - state.pity)
  const pullsToGuaranteeFeatured = state.guaranteed
    ? pullsToNextFiveStar
    : pullsToNextFiveStar + hardPity

  if (!result) {
    return {
      tier: 'none',
      title: 'Select a banner',
      detail: 'Choose a banner to see the projection.',
      pullsToNextFiveStar,
      pullsToGuaranteeFeatured,
    }
  }

  if (!result.canAfford) {
    const short = Math.max(0, result.pullsToSpend - result.availableAtEnd)
    return {
      tier: 'none',
      title: `Plan is short by ${short} pull${short === 1 ? '' : 's'}`,
      detail: `The planner spends 0 here and carries all ${result.availableAtEnd} pulls forward.`,
      pullsToNextFiveStar,
      pullsToGuaranteeFeatured,
    }
  }

  if (result.actualSpend >= pullsToGuaranteeFeatured) {
    return {
      tier: 'safe',
      title: 'Featured character guaranteed ✓',
      detail: `Your ${result.actualSpend}-pull plan covers the worst-case guarantee.`,
      pullsToNextFiveStar,
      pullsToGuaranteeFeatured,
    }
  }

  if (result.actualSpend >= pullsToNextFiveStar) {
    return {
      tier: 'partial',
      title: state.guaranteed ? 'Featured character guaranteed ✓' : 'You can reach a 5★, but it is 50/50',
      detail: state.guaranteed
        ? `Your plan reaches the next 5★ while your featured guarantee is active.`
        : `Your plan reaches one 5★, but does not cover a lost 50/50 plus the guaranteed 5★ after it.`,
      pullsToNextFiveStar,
      pullsToGuaranteeFeatured,
    }
  }

  return {
    tier: 'partial',
    title: 'Plan does not guarantee a 5★',
    detail: `In the worst case you need ${pullsToNextFiveStar} pulls from this pity, but your plan spends ${result.actualSpend}.`,
    pullsToNextFiveStar,
    pullsToGuaranteeFeatured,
  }
}

const tierColor: Record<Tier, string> = {
  safe: '#059669',
  partial: '#b45309',
  none: '#dc2626',
}

export function Roadmap() {
  const { player, config, patches, chain, addChainStop, updateChainStop, deleteChainStop, moveChainStop } =
    usePlannerStore()

  const results = chain.length > 0 ? runChain({ player, config, patches, chain }) : []
  const bridge = getRoadmapBridge({ player, config, patches })
  const currentPulls = Math.floor((player.primogems + player.genesisCrystals) / config.recurring.primoPerFate)
    + player.intertwinedFates
    + Math.floor(player.starglitter / config.recurring.starglitterPerFate)
  const bridgeRewards = bridge ? Math.max(0, bridge.totalPulls - currentPulls) : 0
  const pityStates = getPityStates(
    results,
    player.characterBannerPity,
    player.characterBannerGuaranteed,
    config.hardPityCharacter,
  )

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Roadmap</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Plan future banners in order. Each stop shows what you will have, what you need for the featured character,
          what your spend plan does, and what carries forward.
        </p>
      </div>

      {bridge && (
        <section className="card p-5 flex flex-col gap-3">
          <SectionHeader
            title="Before the Roadmap"
            sub={`Predictable rewards before ${format(parseISO(bridge.cutoffDate), 'MMM d, yyyy')}; unclaimed current-patch event rewards are not estimated.`}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
              <div className="label mb-1">Current resources</div>
              <div className="text-lg font-semibold text-slate-900">{currentPulls} pulls</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
              <div className="label mb-1">Before next patch</div>
              <div className="text-lg font-semibold text-amber-700">+{bridgeRewards} pulls</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
              <div className="label mb-1">Starting roadmap balance</div>
              <div className="text-lg font-semibold text-emerald-700">{bridge.totalPulls} pulls</div>
            </div>
          </div>
        </section>
      )}

      <section className="card p-5 flex flex-col gap-4">
        <SectionHeader
          title="Pull Chain"
          sub="If a spend cap cannot be reached by banner end, that stop is skipped and the pulls carry forward."
          action={
            <button className="btn-primary text-xs px-3 py-1.5" onClick={addChainStop}>
              + Add Stop
            </button>
          }
        />

        {chain.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">Add your first banner stop above.</p>
          </div>
        )}

        {chain.map((stop, idx) => {
          const result = results[idx]
          const availableAtStart = result?.availableAtStart ?? 0
          const rewardsDuringBanner = result?.rewardsDuringBanner ?? 0
          const availableAtEnd = result?.availableAtEnd ?? 0
          const remainingAfter = result?.remainingAfter ?? availableAtEnd
          const state = pityStates[idx] ?? {
            pity: player.characterBannerPity,
            guaranteed: player.characterBannerGuaranteed,
          }
          const outcome = outcomeFor(result, state, config.hardPityCharacter)
          const shortBy = result ? Math.max(0, result.pullsToSpend - result.availableAtEnd) : 0

          return (
            <div
              key={stop.id}
              style={{
                borderRadius: '0.75rem',
                border: '1px solid',
                borderColor:
                  outcome.tier === 'safe'
                    ? 'rgba(16,185,129,0.3)'
                    : outcome.tier === 'partial'
                      ? 'rgba(240,180,41,0.3)'
                      : 'rgba(239,68,68,0.25)',
                backgroundColor: 'rgba(241,245,249,0.7)',
                padding: '1rem',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    backgroundColor:
                      outcome.tier === 'safe'
                        ? 'rgba(16,185,129,0.2)'
                        : outcome.tier === 'partial'
                          ? 'rgba(240,180,41,0.2)'
                          : 'rgba(239,68,68,0.15)',
                    color: tierColor[outcome.tier],
                    border: '1px solid',
                    borderColor:
                      outcome.tier === 'safe'
                        ? 'rgba(16,185,129,0.4)'
                        : outcome.tier === 'partial'
                          ? 'rgba(240,180,41,0.4)'
                          : 'rgba(239,68,68,0.3)',
                  }}
                >
                  {idx + 1}
                </span>
                <span className="text-xs text-slate-600 flex-1">
                  {result
                    ? `v${result.patchVersion} Phase ${stop.phase} · ${format(parseISO(result.phaseDate), 'MMM d')}–${format(parseISO(result.phaseEndDate), 'MMM d, yyyy')} · ${result.daysToStop}d away`
                    : 'Select a banner'}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveChainStop(stop.id, 'up')}
                    disabled={idx === 0}
                    style={{
                      padding: '0.2rem 0.45rem',
                      fontSize: '0.7rem',
                      borderRadius: '0.375rem',
                      border: '1px solid rgba(203,213,225,0.9)',
                      background: 'transparent',
                      color: idx === 0 ? '#cbd5e1' : '#64748b',
                      cursor: idx === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveChainStop(stop.id, 'down')}
                    disabled={idx === chain.length - 1}
                    style={{
                      padding: '0.2rem 0.45rem',
                      fontSize: '0.7rem',
                      borderRadius: '0.375rem',
                      border: '1px solid rgba(203,213,225,0.9)',
                      background: 'transparent',
                      color: idx === chain.length - 1 ? '#cbd5e1' : '#64748b',
                      cursor: idx === chain.length - 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => deleteChainStop(stop.id)}
                    style={{
                      padding: '0.2rem 0.45rem',
                      fontSize: '0.7rem',
                      borderRadius: '0.375rem',
                      border: '1px solid rgba(239,68,68,0.3)',
                      background: 'transparent',
                      color: '#dc2626',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="label">Banner</label>
                  <select
                    className="input-base"
                    value={`${stop.patchId}:${stop.phase}`}
                    onChange={(e) => {
                      if (!e.target.value) return
                      const [patchId, phase] = e.target.value.split(':')
                      const p = patches.find((x) => x.id === patchId)
                      const ph2 = p?.phases.find((x) => x.phase === parseInt(phase))
                      updateChainStop(stop.id, {
                        patchId,
                        phase: parseInt(phase) as 1 | 2,
                        label: ph2?.featuredCharacters[0] || `v${p?.version} Phase ${phase}`,
                      })
                    }}
                  >
                    {patches.map((p) =>
                      p.phases.map((ph2) => (
                        <option key={`${p.id}:${ph2.phase}`} value={`${p.id}:${ph2.phase}`}>
                          v{p.version} Phase {ph2.phase}
                          {ph2.featuredCharacters[0] ? ` — ${ph2.featuredCharacters[0]}` : ''}
                          {' · '}{format(parseISO(ph2.startDate), 'MMM d')}
                        </option>
                      )),
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <NumberInput
                    label="Planned Spend Cap"
                    value={stop.pullsToSpend}
                    min={1}
                    max={180}
                    onChange={(v) => updateChainStop(stop.id, { pullsToSpend: v })}
                  />
                  <p className="text-xs text-slate-500">
                    The planner spends this amount only if you have all of it by banner end.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                  <div className="label mb-2">Banner Resources</div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Entering banner</span>
                    <span className="text-slate-900 font-semibold">{availableAtStart} pulls</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Rewards during banner</span>
                    <span className="text-amber-700 font-semibold">+{rewardsDuringBanner} pulls</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Available by end</span>
                    <span className="text-slate-900 font-semibold">{availableAtEnd} pulls</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Entering banner</span>
                    <span className="text-slate-700 font-medium">
                      {state.pity} pity · {state.guaranteed ? 'Guaranteed' : '50/50'}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                  <div className="label mb-2">What You Need</div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Next 5★ worst case</span>
                    <span className="text-slate-900 font-semibold">{outcome.pullsToNextFiveStar}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Featured guarantee</span>
                    <span className="text-slate-900 font-semibold">{outcome.pullsToGuaranteeFeatured}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {availableAtEnd >= outcome.pullsToGuaranteeFeatured
                      ? 'Your total resources can guarantee the featured character.'
                      : `Your resources are ${outcome.pullsToGuaranteeFeatured - availableAtEnd} short of a worst-case featured guarantee.`}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white/70 p-3">
                  <div className="label mb-2">Your Plan</div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Spend cap</span>
                    <span className="text-slate-900 font-semibold">{stop.pullsToSpend}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Planner spends</span>
                    <span className="text-slate-900 font-semibold">{result?.actualSpend ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Carries forward</span>
                    <span className="font-semibold" style={{ color: '#059669' }}>{remainingAfter}</span>
                  </div>
                  {shortBy > 0 && (
                    <div className="text-xs mt-1" style={{ color: '#dc2626' }}>
                      Short by {shortBy}; this stop is skipped.
                    </div>
                  )}
                </div>
              </div>

              <div
                className="mt-3 rounded-lg px-3 py-2.5"
                style={{
                  backgroundColor:
                    outcome.tier === 'safe'
                      ? 'rgba(16,185,129,0.08)'
                      : outcome.tier === 'partial'
                        ? 'rgba(245,158,11,0.08)'
                        : 'rgba(239,68,68,0.07)',
                  border: '1px solid',
                  borderColor:
                    outcome.tier === 'safe'
                      ? 'rgba(16,185,129,0.22)'
                      : outcome.tier === 'partial'
                        ? 'rgba(245,158,11,0.22)'
                        : 'rgba(239,68,68,0.18)',
                }}
              >
                <div className="text-sm font-semibold" style={{ color: tierColor[outcome.tier] }}>
                  {outcome.title}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">{outcome.detail}</div>
              </div>
            </div>
          )
        })}
      </section>

      {results.length > 0 && (
        <section className="card p-5">
          <SectionHeader title="Chain Summary" sub="What each banner does to your pull plan" />
          <div className="overflow-x-auto overscroll-x-contain">
            <table style={{ minWidth: '760px', width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(203,213,225,0.7)' }}>
                  {['#', 'Banner', 'By End', 'Pity / State', 'Need to Guarantee', 'Plan', 'Actually Spent', 'Carry', 'Outcome'].map((h) => (
                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const state = pityStates[i] ?? { pity: player.characterBannerPity, guaranteed: player.characterBannerGuaranteed }
                  const outcome = outcomeFor(r, state, config.hardPityCharacter)
                  return (
                    <tr key={r.stop.id} style={{ borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>{i + 1}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#334155', whiteSpace: 'nowrap' }}>
                        v{r.patchVersion} P{r.stop.phase}{r.stop.label ? ` · ${r.stop.label}` : ''}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#1e293b', fontWeight: 600 }}>{r.availableAtEnd}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {state.pity} · {state.guaranteed ? 'Guaranteed' : '50/50'}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#334155', fontWeight: 600 }}>{outcome.pullsToGuaranteeFeatured}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#334155' }}>{r.pullsToSpend}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: r.actualSpend > 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>{r.actualSpend}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#059669', fontWeight: 600 }}>{r.remainingAfter}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: tierColor[outcome.tier], fontWeight: 600, minWidth: '180px' }}>
                        {outcome.title}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
