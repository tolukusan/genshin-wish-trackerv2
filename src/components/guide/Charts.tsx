import { useState } from 'react'
import { usePlannerStore } from '@/store/usePlannerStore'
import { GAME_RULES } from '@/engine/gameRules'
import { bannerOdds, fiveStarRate } from '@/engine/probability'
import type { WishBannerType } from '@/types'
import { LineChart } from './LineChart'
import { VIZ } from './vizTheme'

const MONTHS_PER_PATCH = 42 / 30.44

// Horizontal bar row with a hover tooltip (title) and a direct value label.
function BarRow({ label, segments, max, value, detail }: {
  label: string
  segments: { value: number; color: string }[]
  max: number
  value: string
  detail: string
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      className="grid items-center gap-2"
      style={{ gridTemplateColumns: 'minmax(7rem, 11rem) 1fr 3.5rem' }}
      title={detail}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <span className="text-xs text-slate-700 truncate">{label}</span>
      <div className="flex h-4 gap-[2px]" style={{ opacity: hover ? 1 : 0.92 }}>
        {segments.map((s, i) => (
          <div
            key={i}
            style={{
              width: `${(s.value / max) * 100}%`, background: s.color, minWidth: s.value > 0 ? 3 : 0,
              borderRadius: i === segments.length - 1 ? '0 4px 4px 0' : 0,
              outline: hover ? `2px solid ${VIZ.surface}` : 'none',
            }}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-slate-900 tabular-nums">{value}</span>
    </div>
  )
}

// ── How projections are counted: income sources for one typical patch ───────
export function IncomeVisual() {
  const r = usePlannerStore((s) => s.config.recurring)
  const ppf = GAME_RULES.primogemsPerFate
  const sources = [
    { label: 'Events & new content', primos: r.patchTypeRewards.standard },
    { label: 'Daily commissions', primos: r.dailyCommissions * 42 },
    { label: 'Imaginarium Theater', primos: r.imaginariumTheatreMax * MONTHS_PER_PATCH },
    { label: 'Spiral Abyss', primos: r.spiralAbyssMax * MONTHS_PER_PATCH },
    { label: 'Monthly shop', primos: r.monthlyShopIntertwined * MONTHS_PER_PATCH * ppf },
    { label: 'Maintenance', primos: r.maintenancePrimos },
    { label: 'Stygian Onslaught', primos: r.stygianOnslaughtMax },
    { label: 'Livestream codes', primos: r.livestreamPrimos },
    { label: 'Character trials', primos: r.trialPrimosPerPhase * 2 },
  ].sort((a, b) => b.primos - a.primos)
  const max = Math.max(...sources.map((s) => s.primos))
  const total = sources.reduce((sum, s) => sum + s.primos, 0)
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="text-xs text-slate-600 mb-1">
        Free wishes from one typical standard patch (42 days): about <b className="text-slate-900">{Math.round(total / ppf)}</b>.
        Welkin and Battle Pass are added on top if you have them.
      </figcaption>
      {sources.map((s) => (
        <BarRow
          key={s.label}
          label={s.label}
          segments={[{ value: s.primos, color: VIZ.series1 }]}
          max={max}
          value={`≈${Math.round(s.primos / ppf)}`}
          detail={`${s.label}: ${Math.round(s.primos).toLocaleString()} primogems ≈ ${(s.primos / ppf).toFixed(1)} wishes`}
        />
      ))}
      <p className="text-[11px] text-slate-500 mt-1">Values are wishes per patch, from your Settings. Hover a bar for primogems.</p>
    </figure>
  )
}

// ── Patch types: base + bonus wishes per patch ──────────────────────────────
export function PatchTypesVisual({ compact = false }: { compact?: boolean }) {
  const r = usePlannerStore((s) => s.config.recurring)
  const base = r.patchTypeTotalWishes
  const bonus = r.patchModifierTotalWishes
  const rows = [
    { label: 'Standard', base: base.standard, bonus: 0 },
    { label: 'Sub-area', base: base['sub-area'], bonus: 0 },
    { label: 'New Region', base: base['new-region'], bonus: 0 },
    { label: 'Standard + Anniversary', base: base.standard, bonus: bonus.anniversary },
    { label: 'Standard + Lantern Rite', base: base.standard, bonus: bonus['lantern-rite'] },
  ]
  const shown = compact ? rows.slice(0, 3) : rows
  const max = Math.max(...rows.map((x) => x.base + x.bonus))
  return (
    <figure className="flex flex-col gap-1.5">
      {shown.map((x) => (
        <BarRow
          key={x.label}
          label={x.label}
          segments={x.bonus ? [{ value: x.base, color: VIZ.series1 }, { value: x.bonus, color: VIZ.series2 }] : [{ value: x.base, color: VIZ.series1 }]}
          max={max}
          value={`${Math.round(x.base + x.bonus)}`}
          detail={x.bonus ? `${x.label}: ${x.base} base + ${x.bonus} bonus = ${x.base + x.bonus} wishes` : `${x.label}: ${x.base} wishes`}
        />
      ))}
      {!compact && (
        <div className="flex gap-4 text-xs text-slate-600 mt-1" aria-label="Legend">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: VIZ.series1 }} />Base patch content</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: VIZ.series2 }} />Special bonus</span>
        </div>
      )}
      <figcaption className="text-[11px] text-slate-500 mt-0.5">Estimated free wishes per patch (all sources), from your Settings.</figcaption>
    </figure>
  )
}

// ── Pity: 5★ rate by pull number ─────────────────────────────────────────────
export function PityVisual({ compact = false }: { compact?: boolean }) {
  const config = usePlannerStore((s) => s.config)
  const [type, setType] = useState<WishBannerType>('character')
  const odds = bannerOdds(config, type)
  const hard = GAME_RULES.hardPity[type]
  const soft = GAME_RULES.softPity[type]
  const values = Array.from({ length: hard }, (_, i) => fiveStarRate(odds, i + 1))
  // Median pull of the first 5★, from the same rate curve.
  let survive = 1
  let median = hard
  for (let n = 1; n <= hard; n++) {
    survive *= 1 - values[n - 1]
    if (survive <= 0.5) { median = n; break }
  }
  const pct = (y: number) => `${y > 0 && y < 0.1 ? (y * 100).toFixed(1) : Math.round(y * 100)}%`
  return (
    <div className="flex flex-col gap-2">
      {!compact && (
        <div className="flex gap-1" role="group" aria-label="Banner">
          {(['character', 'weapon'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className="text-xs px-2.5 py-1 rounded-md border"
              style={type === t
                ? { background: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.45)', color: '#5b21b6', fontWeight: 600 }
                : { background: '#fff', borderColor: '#cbd5e1', color: VIZ.textSecondary }}
            >
              {t === 'character' ? 'Character & Chronicled' : 'Weapon'}
            </button>
          ))}
        </div>
      )}
      <LineChart
        values={values}
        xStart={1}
        yMax={1}
        formatY={pct}
        formatX={(x) => `Pull ${x}`}
        xTicks={compact ? [1, soft, hard] : [1, 20, 40, 60, soft, hard]}
        yTicks={[0, 0.5, 1]}
        markers={[
          { x: soft, label: `Soft pity ${soft}`, tone: 'accent' },
          { x: hard, label: `Guaranteed ${hard}`, tone: 'good' },
        ]}
        summary={`5★ chance per pull on the ${type} banner: ${pct(values[0])} until pull ${soft - 1}, then rising each pull until it is certain at pull ${hard}.`}
        height={compact ? 110 : 190}
        compact={compact}
      />
      {!compact && (
        <p className="text-xs text-slate-600">
          Flat at {pct(values[0])} per pull, then the rate jumps every pull from {soft}. Half of all 5★ arrive by pull {median}, and none later than {hard}.
        </p>
      )}
    </div>
  )
}
