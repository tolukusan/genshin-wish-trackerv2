import { useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Trash, X } from '@phosphor-icons/react'
import { clsx } from 'clsx'
import { bannerOdds, chanceCurve, formatChance } from '@/engine/probability'
import { getRoadmapSnapshot } from '@/engine/projectionEngine'
import { usePlannerStore } from '@/store/usePlannerStore'
import { isSelectableBanner } from '@/utils/banners'
import type { ChainStopResult, WishBannerType } from '@/types'
import { VerdictTag } from './BannerCard'
import { bannerName, bannerTypeLabel, featuredText, incomeBuckets, pullLedger, typicalPulls, verdictFor, worstCaseSteps, type SumRow } from './planModel'
import { useModalFocus } from './useModalFocus'

const BUCKET_SHADES = ['var(--color-accent-400)', 'var(--color-accent-600)', 'var(--color-accent-700)', 'var(--color-accent-800)']
const TYPES: { type: WishBannerType; label: string }[] = [
  { type: 'character', label: 'Character' },
  { type: 'weapon', label: 'Weapon' },
  { type: 'chronicled', label: 'Chronicled' },
]

function stateChip(r: ChainStopResult): string {
  if (r.bannerType === 'character') return r.guaranteedBefore ? 'Guaranteed' : 'On 50/50'
  return r.fatePointsBefore > 0 || r.guaranteedBefore ? 'Fate Point' : 'No Fate Point'
}

interface BannerSheetProps {
  result: ChainStopResult
  /** Pulls in the wallet today. */
  wallet: number
  /** The earlier banner of the same kind whose spending set this one's starting pity. */
  pitySource: ChainStopResult | null
  onClose: () => void
}

const signed = (n: number, first: boolean) => (first || n < 0 ? String(n).replace('-', '−') : `+${n}`)

/** A short sum: rows, a rule, and the total. */
function SumTable({ caption, rows, total }: { caption: string; rows: SumRow[]; total: { label: string; pulls: number } }) {
  return (
    <table className="w-full text-[13px] tabular-nums">
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.label} className={row.subtotal ? 'border-t border-neutral-800' : undefined}>
            <th scope="row" className={clsx('py-0.5 pr-3 text-left font-normal', row.subtotal ? 'text-neutral-100' : 'text-neutral-300')}>
              {row.label}
              {row.detail && <span className="text-neutral-500"> · {row.detail}</span>}
            </th>
            <td className={clsx('py-0.5 text-right', row.subtotal ? 'text-neutral-100' : 'text-neutral-200')}>
              {row.subtotal ? row.pulls : signed(row.pulls, i === 0)}
            </td>
          </tr>
        ))}
        <tr className="border-t border-neutral-700">
          <th scope="row" className="pt-1.5 pr-3 text-left font-medium text-neutral-100">{total.label}</th>
          <td className="pt-1.5 text-right font-medium text-neutral-100">{total.pulls}</td>
        </tr>
      </tbody>
    </table>
  )
}

/** Banner detail (1b): chance curve, a what-if slider, and where the pulls come from. */
export function BannerSheet({ result: r, wallet, pitySource, onClose }: BannerSheetProps) {
  const player = usePlannerStore((s) => s.player)
  const config = usePlannerStore((s) => s.config)
  const patches = usePlannerStore((s) => s.patches)
  const updateChainStop = usePlannerStore((s) => s.updateChainStop)
  const deleteChainStop = usePlannerStore((s) => s.deleteChainStop)
  const [editing, setEditing] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const available = Math.max(0, r.availableAtEnd)
  // Follows "you" until the slider is moved.
  const [whatIfOverride, setWhatIf] = useState<number | null>(null)

  const dialogRef = useRef<HTMLDivElement>(null)
  useModalFocus(dialogRef, onClose, closeRef)

  const xMax = Math.max(20, Math.ceil(Math.max(r.pullsForGuarantee, available) * 1.1 / 10) * 10)
  const whatIf = Math.min(xMax, whatIfOverride ?? available)
  const curve = useMemo(
    () => chanceCurve(
      bannerOdds(config, r.bannerType),
      { pity: r.pityBefore, guaranteed: r.guaranteedBefore || r.fatePointsBefore > 0 },
      xMax,
      r.copies,
    ),
    [config, r.bannerType, r.pityBefore, r.guaranteedBefore, r.fatePointsBefore, r.copies, xMax],
  )
  const typical = typicalPulls(curve)
  const at = (n: number) => curve[Math.min(curve.length - 1, Math.max(0, Math.round(n)))] ?? 0

  const income = useMemo(() => {
    const snap = getRoadmapSnapshot({ player, config, patches, cutoff: r.phaseEndDate })
    return incomeBuckets(snap.breakdown)
  }, [player, config, patches, r.phaseEndDate])
  const incomeTotal = income.reduce((s, b) => s + b.pulls, 0)

  // Chart geometry (viewBox 340 × 160 plot).
  const W = 340
  const H = 160
  const cx = (n: number) => (n / xMax) * W
  const cy = (p: number) => H - p * (H - 8)
  const step = Math.max(1, Math.floor(xMax / 120))
  const pts: string[] = []
  for (let n = 0; n <= xMax; n += step) pts.push(`${cx(n).toFixed(1)} ${cy(curve[n]).toFixed(1)}`)
  pts.push(`${cx(xMax).toFixed(1)} ${cy(curve[xMax]).toFixed(1)}`)
  const line = `M${pts.join(' L')}`
  const area = `${line} L${W} ${H} L0 ${H} Z`
  const marks = [
    ...(typical !== null && typical > 1 ? [{ key: 'typ', n: typical, label: 'Typical', you: false }] : []),
    { key: 'you', n: available, label: 'You', you: true },
    { key: 'worst', n: r.pullsForGuarantee, label: 'Worst', you: false },
  ]
  // Keep marker labels from running off the right edge.
  const labelX = (n: number) => Math.min(W - 40, cx(n) + 4)

  const thing = r.bannerType === 'character' ? (r.copies > 1 ? 'them' : 'the featured 5★') : 'your chosen 5★'
  const verdict = verdictFor(r)
  const end = format(parseISO(r.phaseEndDate), 'MMM d')
  const title = `v${r.patchVersion} Phase ${r.stop.phase} · ${bannerTypeLabel(r.bannerType, r.copies)}`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/60 md:items-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet-up max-h-[calc(100dvh-56px)] w-full overflow-y-auto rounded-t-2xl px-5 pb-8 pt-2 shadow-lg md:max-w-[440px] md:rounded-2xl"
        style={{ background: 'linear-gradient(to bottom, #20233a, var(--color-surface) 280px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-sm bg-neutral-700 md:hidden" aria-hidden />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-neutral-400">
            {title}{bannerName(r) ? ` · ${bannerName(r)}` : ''}
          </span>
          <button ref={closeRef} type="button" className="btn-secondary btn-icon rounded-full" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="mt-0.5 text-[84px] font-medium leading-none tracking-[-0.05em]">{formatChance(r.successChance)}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <VerdictTag verdict={verdict} />
          <span className="text-sm text-neutral-300">
            {r.pullsForGuarantee} pulls guarantee {thing}. You&apos;ll have {r.availableAtEnd} by {format(parseISO(r.phaseEndDate), 'MMM d')}.
          </span>
        </div>

        <svg viewBox={`0 -24 ${W} 220`} className="mt-[22px] block w-full overflow-visible" role="img"
          aria-label={`Chance rises with pulls: ${formatChance(at(available))} at your ${available} pulls; certain at ${r.pullsForGuarantee}.`}>
          <defs>
            <linearGradient id="sheet-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--color-accent-600)" stopOpacity={0.55} />
              <stop offset="1" stopColor="var(--color-accent-600)" stopOpacity={0} />
            </linearGradient>
            <filter id="sheet-glow"><feGaussianBlur stdDeviation="3" /></filter>
          </defs>
          <line x1={0} x2={W} y1={H} y2={H} stroke="var(--color-neutral-700)" />
          <path d={area} fill="url(#sheet-fill)" />
          <path d={line} fill="none" stroke="var(--color-accent-400)" strokeWidth={4} filter="url(#sheet-glow)" opacity={0.7} />
          <path d={line} fill="none" stroke="var(--color-accent-300)" strokeWidth={2} />
          {marks.map((m) => (
            <g key={m.key}>
              <rect x={cx(m.n)} y={-24} width={m.you ? 1.5 : 1} height={H + 24} fill={m.you ? 'var(--color-accent-300)' : 'var(--color-neutral-600)'} />
              <circle cx={cx(m.n)} cy={cy(at(m.n))} r={m.you ? 6 : 4} fill={m.you ? 'var(--color-accent-200)' : 'var(--color-neutral-300)'} />
            </g>
          ))}
          {marks.map((m, i) => {
            // Stagger labels vertically when markers sit close together.
            const prev = marks[i - 1]
            const crowded = prev && Math.abs(cx(m.n) - cx(prev.n)) < 44
            const dy = crowded ? 30 : 0
            return (
              <g key={`l-${m.key}`}>
                <text x={labelX(m.n)} y={-12 + dy} fontSize={11} fill={m.you ? 'var(--color-accent-300)' : 'var(--color-neutral-300)'}>{m.label}</text>
                <text x={labelX(m.n)} y={2 + dy} fontSize={13} fontWeight={600} fill={m.you ? 'var(--color-accent-200)' : 'var(--color-text)'}>{Math.round(m.n)}</text>
              </g>
            )
          })}
          <text x={0} y={180} fontSize={10} fill="var(--color-neutral-500)">0 pulls</text>
          <text x={W} y={180} fontSize={10} textAnchor="end" fill="var(--color-neutral-500)">{xMax}</text>
        </svg>

        <div className="mt-[22px]">
          <label htmlFor="what-if" className="flex justify-between text-[13px]">
            <span>What if I had</span>
            <span className="font-semibold text-accent-300">{whatIf} pulls → {formatChance(at(whatIf))}</span>
          </label>
          <input
            id="what-if"
            type="range"
            min={0}
            max={xMax}
            value={whatIf}
            onChange={(e) => setWhatIf(Number(e.target.value))}
            className="h-11 w-full accent-[var(--color-accent)]"
          />
          <div className="flex flex-wrap gap-1.5">
            <span className="tag tag-neutral h-8">Pity {r.pityBefore}</span>
            <span className="tag tag-neutral h-8">{stateChip(r)}</span>
            <button type="button" className={clsx('tag tag-outline h-8 cursor-pointer', editing && 'bg-accent/15')} onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
              Edit
            </button>
          </div>
        </div>

        {editing && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg p-3 shadow-sm">
            <label className="flex flex-col gap-1">
              <span className="label">Banner</span>
              <select
                className="input-base"
                value={`${r.stop.patchId}:${r.stop.phase}`}
                onChange={(e) => {
                  const [patchId, phase] = e.target.value.split(':')
                  updateChainStop(r.stop.id, { patchId, phase: Number(phase) as 1 | 2 })
                }}
              >
                {patches.map((p) => p.phases
                  .filter((ph) => isSelectableBanner(ph.endDate, r.stop.patchId === p.id && r.stop.phase === ph.phase))
                  .map((ph) => (
                    <option key={`${p.id}:${ph.phase}`} value={`${p.id}:${ph.phase}`}>
                      v{p.version} Phase {ph.phase} · {format(parseISO(ph.startDate), 'MMM d')}{featuredText(ph.featuredCharacters) ? ` · ${featuredText(ph.featuredCharacters)}` : ''}
                    </option>
                  )))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">Name (optional)</span>
              <input
                className="input-base"
                value={r.stop.label}
                placeholder="e.g. who you're pulling for"
                onChange={(e) => updateChainStop(r.stop.id, { label: e.target.value })}
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className="label">Banner type</span>
              <div className="flex overflow-hidden rounded-lg border border-divider" role="radiogroup" aria-label="Banner type">
                {TYPES.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    role="radio"
                    aria-checked={r.bannerType === t.type}
                    onClick={() => updateChainStop(r.stop.id, { bannerType: t.type })}
                    className={clsx('flex-1 py-2 text-[13px] [&+&]:border-l [&+&]:border-divider',
                      r.bannerType === t.type ? 'text-accent-300 shadow-[inset_0_0_0_1px_var(--color-accent)]' : 'text-neutral-300 hover:bg-neutral-800')}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="label">{r.bannerType === 'character' ? 'Copies wanted' : '5★ items wanted'}</span>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-secondary btn-icon" aria-label="Fewer" disabled={r.copies <= 1}
                  onClick={() => updateChainStop(r.stop.id, { copies: r.copies - 1 })}>−</button>
                <span className="w-6 text-center text-lg">{r.copies}</span>
                <button type="button" className="btn-secondary btn-icon" aria-label="More" disabled={r.copies >= 7}
                  onClick={() => updateChainStop(r.stop.id, { copies: r.copies + 1 })}>+</button>
              </div>
            </div>
            <button type="button" className="btn-danger self-start" onClick={() => { deleteChainStop(r.stop.id); onClose() }}>
              <Trash aria-hidden /> Remove banner
            </button>
          </div>
        )}

        <section className="mt-[22px]" aria-labelledby="adds-up">
          <h2 id="adds-up" className="text-[13px] font-normal text-neutral-400">How it adds up</h2>

          <div className="mt-2 rounded-lg p-3 shadow-sm">
            <SumTable
              caption="Pulls by the end of this banner"
              rows={pullLedger(r, wallet)}
              total={{ label: `By the end · ${end}`, pulls: Math.max(0, r.availableAtEnd) }}
            />
            <p className="mt-2 text-xs text-neutral-400">
              {r.actualSpend > 0
                ? `The plan spends ${r.actualSpend} here and carries ${Math.max(0, r.remainingAfter)} to the next banner.`
                : 'Nothing is left for this banner, so nothing carries forward.'}
              {` Pity ${r.pityBefore} at the start, ${r.pityAfter} after`}
              {r.bannerType === 'character' && r.guaranteedAfter ? ' and guaranteed' : ''}
              {' (worst case).'}
            </p>
          </div>

          <div className="mt-2 rounded-lg p-3 shadow-sm">
            <p className="mb-1.5 text-xs text-neutral-400">
              Starts at pity {r.pityBefore}
              {r.bannerType === 'character' ? (r.guaranteedBefore ? ', guaranteed' : ' on a 50/50') : ''}
              {pitySource
                ? `, after ${pitySource.actualSpend} pulls on v${pitySource.patchVersion} P${pitySource.stop.phase}${bannerName(pitySource) ? ` · ${bannerName(pitySource)}` : ''}`
                : ', from your Wallet'}
              . Worst case means every 5★ comes at hard pity and loses.
            </p>
            <SumTable
              caption="Worst case pulls for this banner"
              rows={worstCaseSteps(r)}
              total={{ label: 'Worst case', pulls: r.pullsForGuarantee }}
            />
            <p className="mt-2 text-xs text-neutral-400">
              {r.availableAtEnd >= r.pullsForGuarantee
                ? `You'll have ${Math.max(0, r.availableAtEnd)}: covered, with ${r.availableAtEnd - r.pullsForGuarantee} to spare.`
                : `You'll have ${Math.max(0, r.availableAtEnd)}: ${r.pullsForGuarantee - Math.max(0, r.availableAtEnd)} short of certain. The ${formatChance(r.successChance)} above is your real chance with those pulls.`}
            </p>
          </div>
        </section>

        {incomeTotal > 0 && (
          <>
            <div className="mt-[22px] text-[13px] text-neutral-400">
              Where income comes from · today to {end} ≈ {incomeTotal} pulls
            </div>
            <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-[5px]" aria-hidden>
              {income.map((b, i) => (
                <span key={b.label} style={{ flex: b.pulls, background: BUCKET_SHADES[Math.min(i, BUCKET_SHADES.length - 1)] }} />
              ))}
            </div>
            <ul className="mt-2.5 grid grid-cols-2 gap-x-3.5 gap-y-1.5 text-[13px] text-neutral-300">
              {income.map((b) => <li key={b.label}>{b.label} ≈ {b.pulls}</li>)}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
