import { usePlannerStore } from '@/store/usePlannerStore'
import { runChain } from '@/engine/projectionEngine'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { format, parseISO } from 'date-fns'

export function Scenarios() {
  const { player, config, patches, chain, addChainStop, updateChainStop, deleteChainStop, moveChainStop } =
    usePlannerStore()

  const results = chain.length > 0 ? runChain({ player, config, patches, chain }) : []

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Scenarios</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Plan a sequence of banners. Set how many pulls you'll spend at each stop and see if the math works out.
        </p>
      </div>

      {/* Builder */}
      <section className="card p-5 flex flex-col gap-4">
        <SectionHeader
          title="Pull Chain"
          sub="Banners in order — resources carry forward after each spend"
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
          const canAfford = result?.canAfford ?? false
          const availableAtStart = result?.availableAtStart ?? 0
          const availableAtEnd = result?.availableAtEnd ?? 0
          const remainingAfter = result?.remainingAfter ?? 0

          return (
            <div
              key={stop.id}
              style={{
                borderRadius: '0.75rem',
                border: '1px solid',
                borderColor: canAfford ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)',
                backgroundColor: 'rgba(15,23,42,0.4)',
                padding: '1rem',
              }}
            >
              {/* Stop header */}
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
                    backgroundColor: canAfford ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)',
                    color: canAfford ? '#34d399' : '#f87171',
                    border: '1px solid',
                    borderColor: canAfford ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.3)',
                  }}
                >
                  {idx + 1}
                </span>
                <span className="text-xs text-slate-400 flex-1">
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
                      border: '1px solid rgba(71,85,105,0.5)',
                      background: 'transparent',
                      color: idx === 0 ? '#334155' : '#64748b',
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
                      border: '1px solid rgba(71,85,105,0.5)',
                      background: 'transparent',
                      color: idx === chain.length - 1 ? '#334155' : '#64748b',
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
                      color: '#f87171',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Config row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Patch select */}
                <div className="flex flex-col gap-1 sm:col-span-2">
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
                      ))
                    )}
                  </select>
                </div>

                {/* Pulls to spend (computed) */}
                <div className="flex flex-col gap-1">
                  <span className="label">Pulls Needed</span>
                  <div style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(71,85,105,0.4)',
                    background: 'rgba(15,23,42,0.5)',
                    color: '#a78bfa',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                  }}>
                    {result?.pullsToSpend ?? '—'}
                  </div>
                  <p className="text-xs text-slate-500">
                    {idx === 0
                      ? <>{player.characterBannerPity} pity in · {player.characterBannerGuaranteed ? 'Guaranteed' : '50/50'}</>
                      : '90 pulls · pity resets after each 5★'}
                  </p>
                </div>

                {/* Result */}
                <div className="flex flex-col gap-1">
                  <span className="label">Pulls Available</span>
                  <div className="flex flex-col gap-0.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">At start</span>
                      <span className="text-slate-200 font-medium">{availableAtStart}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">At end</span>
                      <span className="text-slate-200 font-medium">{availableAtEnd}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">
                        {canAfford ? 'After spend' : 'Rolls over'}
                      </span>
                      <span style={{ color: '#34d399', fontWeight: 500 }}>
                        +{remainingAfter}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-0.5">
                      <span className="text-slate-500">Can afford</span>
                      <span style={{ color: canAfford ? '#34d399' : '#f87171', fontWeight: 600 }}>
                        {canAfford ? 'Yes ✓' : 'No ✗'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      {/* Summary table */}
      {results.length > 0 && (
        <section className="card p-5">
          <SectionHeader title="Chain Summary" sub="Cumulative pull flow across all stops" />
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(51,65,85,0.6)' }}>
                  {['#', 'Banner', 'Window', '@Start', '@End', 'Spend', 'Remaining', 'Status', 'OK?'].map((h) => (
                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr
                    key={r.stop.id}
                    style={{ borderBottom: '1px solid rgba(30,41,59,0.6)' }}
                  >
                    <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>{i + 1}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#cbd5e1' }}>
                      v{r.patchVersion} P{r.stop.phase}
                      {r.stop.label ? ` · ${r.stop.label}` : ''}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {format(parseISO(r.phaseDate), 'MMM d')}–{format(parseISO(r.phaseEndDate), 'MMM d')}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#e2e8f0', fontWeight: 600 }}>{r.availableAtStart}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#a78bfa', fontWeight: 600 }}>{r.availableAtEnd}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: r.canAfford ? '#94a3b8' : '#f87171' }}>
                      {r.canAfford ? r.pullsToSpend : `skip (${r.pullsToSpend})`}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: r.remainingAfter >= 0 ? '#34d399' : '#f87171' }}>
                      {r.remainingAfter >= 0 ? '+' : ''}{r.remainingAfter}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: r.guaranteed ? '#34d399' : '#94a3b8', fontSize: '0.75rem' }}>
                      {r.guaranteed ? 'Guaranteed' : '50/50'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: r.canAfford ? '#34d399' : '#f87171' }}>
                      {r.canAfford ? '✓' : '✗'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
