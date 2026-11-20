// Pure helpers behind the Plan screen (direction 1b, "River"). No React here,
// so everything is unit-tested in planModel.test.ts.

import { addDays, format, parseISO, startOfDay } from 'date-fns'
import { GAME_RULES } from '@/engine/gameRules'
import type { BannerPhase, BreakdownItem, ChainStopResult, Patch, PlayerState, WishBannerType } from '@/types'
import { isSelectableBanner } from '@/utils/banners'

// ── Verdicts ──────────────────────────────────────────────────────────────────

export type Verdict = 'secured' | 'very-likely' | 'likely' | 'risky' | 'short'

/** Chance at or above these floors reads "Very likely" / "Likely" / "Risky"; below RISKY_FLOOR reads "Short". */
export const VERY_LIKELY_FLOOR = 0.9
export const LIKELY_FLOOR = 0.6
export const RISKY_FLOOR = 0.3

export function verdictFor(r: Pick<ChainStopResult, 'availableAtEnd' | 'pullsForGuarantee' | 'successChance'>): Verdict {
  if (r.availableAtEnd >= r.pullsForGuarantee) return 'secured'
  if (r.successChance >= VERY_LIKELY_FLOOR) return 'very-likely'
  if (r.successChance >= LIKELY_FLOOR) return 'likely'
  if (r.successChance >= RISKY_FLOOR) return 'risky'
  return 'short'
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  secured: 'Secured',
  'very-likely': 'Very likely',
  likely: 'Likely',
  risky: 'Risky',
  short: 'Short',
}

// ── Wallet ────────────────────────────────────────────────────────────────────

/** Pulls you could make right now (primogems + genesis crystals, fates, starglitter). */
export function currentPulls(p: PlayerState): number {
  return Math.floor((p.primogems + p.genesisCrystals) / GAME_RULES.primogemsPerFate)
    + p.intertwinedFates
    + Math.floor(p.starglitter / GAME_RULES.starglitterPerFate)
}

// ── Timeline rows ─────────────────────────────────────────────────────────────

export interface PlanPhaseRow {
  phase: BannerPhase
  results: ChainStopResult[]
}

export interface PlanPatchGroup {
  patch: Patch
  phases: PlanPhaseRow[]
}

/** How many upcoming patches to show even when the plan has no banners there. */
export const MIN_PATCHES_SHOWN = 3

/**
 * Upcoming patches in date order, each with its still-running or future phases
 * and the chain results that sit on them. Shows at least MIN_PATCHES_SHOWN
 * upcoming patches, and always reaches the last patch that holds a banner.
 */
export function buildPlanGroups(patches: Patch[], results: ChainStopResult[], today = new Date()): PlanPatchGroup[] {
  const sorted = [...patches].sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime())
  const groups: PlanPatchGroup[] = []
  for (const patch of sorted) {
    const phases = patch.phases
      .filter((ph) => {
        const hasStop = results.some((r) => r.stop.patchId === patch.id && r.stop.phase === ph.phase)
        return isSelectableBanner(ph.endDate, hasStop, today)
      })
      .sort((a, b) => a.phase - b.phase)
      .map((phase) => ({
        phase,
        results: results.filter((r) => r.stop.patchId === patch.id && r.stop.phase === phase.phase),
      }))
    if (phases.length > 0) groups.push({ patch, phases })
  }

  const lastWithStop = groups.reduce((last, g, i) => (g.phases.some((p) => p.results.length > 0) ? i : last), -1)
  return groups.slice(0, Math.max(MIN_PATCHES_SHOWN, lastWithStop + 1))
}

// ── Balance over time ─────────────────────────────────────────────────────────

/** Pulls the roadmap model projects you will have by a date, before any planned spending. */
export type SnapshotFn = (isoDate: string) => number

/** Projected balance at a date: income up to then minus spending on banners that ended before it. */
export function balanceAt(isoDate: string, results: ChainStopResult[], snapshot: SnapshotFn): number {
  const at = parseISO(isoDate).getTime()
  const spent = results
    .filter((r) => parseISO(r.phaseEndDate).getTime() < at)
    .reduce((sum, r) => sum + r.actualSpend, 0)
  return snapshot(isoDate) - spent
}

/** Pulls earned during a patch (its phases' income), from its start (or today) to its end. */
export function patchIncome(patch: Patch, snapshot: SnapshotFn, today = new Date()): number {
  const t = startOfDay(today)
  const start = parseISO(patch.startDate)
  // Snapshots include phases starting on the cutoff day, so measure from the day
  // before this patch to the day before the next one.
  const from = start > t ? format(addDays(start, -1), 'yyyy-MM-dd') : format(t, 'yyyy-MM-dd')
  const to = format(addDays(parseISO(patch.endDate), -1), 'yyyy-MM-dd')
  if (parseISO(to) <= parseISO(from)) return 0
  return Math.max(0, snapshot(to) - snapshot(from))
}

export interface BalancePoint {
  date: string
  value: number
}

/**
 * Projected pull balance from today to `endDate`, as a step series: it rises
 * with income and drops at the end of each banner by what the plan spends.
 */
export function balanceSeries(
  results: ChainStopResult[],
  snapshot: SnapshotFn,
  patches: Patch[],
  endDate: string,
  today = new Date(),
): BalancePoint[] {
  const t = format(startOfDay(today), 'yyyy-MM-dd')
  const end = parseISO(endDate)
  const dates = new Set<string>([t, endDate])
  for (const p of patches) {
    for (const ph of p.phases) {
      const d = parseISO(ph.startDate)
      if (d > parseISO(t) && d < end) dates.add(ph.startDate)
    }
  }
  for (const r of results) if (parseISO(r.phaseEndDate) <= end) dates.add(r.phaseEndDate)

  const points: BalancePoint[] = []
  for (const date of [...dates].sort()) {
    points.push({ date, value: balanceAt(date, results, snapshot) })
    const spentHere = results.filter((r) => r.phaseEndDate === date).reduce((s, r) => s + r.actualSpend, 0)
    if (spentHere > 0) points.push({ date, value: points[points.length - 1].value - spentHere })
  }
  return points
}

// ── Income breakdown for the banner sheet ─────────────────────────────────────

export interface IncomeBucket {
  label: string
  pulls: number
}

/** Groups a roadmap snapshot's income (not the wallet you already hold) into a few readable buckets. */
export function incomeBuckets(breakdown: BreakdownItem[]): IncomeBucket[] {
  const buckets: Record<string, number> = {}
  const add = (label: string, pulls: number) => { buckets[label] = (buckets[label] ?? 0) + pulls }
  for (const item of breakdown) {
    const pulls = item.primogems / GAME_RULES.primogemsPerFate + item.fates
    const s = item.source
    if (s.startsWith('Current Primogems') || s.startsWith('Current Intertwined') || s === 'Starglitter') continue
    if (s.startsWith('Patch Estimate')) add('Patch rewards', pulls)
    else if (s.startsWith('Current-patch')) add('Rest of this patch', pulls)
    else if (s.startsWith('Welkin') || s.startsWith('Battle Pass')) add('Welkin & Battle Pass', pulls)
    else add('Other', pulls)
  }
  return Object.entries(buckets)
    .map(([label, pulls]) => ({ label, pulls: Math.round(pulls) }))
    .filter((b) => b.pulls > 0)
    .sort((a, b) => b.pulls - a.pulls)
}

// ── River geometry ────────────────────────────────────────────────────────────

export interface RiverNode {
  y: number
  value: number
}

export const RIVER_MIN_WIDTH = 6
export const RIVER_MAX_WIDTH = 48

/** Width of the river at a balance, scaled against the largest balance shown. */
export function riverWidth(value: number, max: number): number {
  if (max <= 0) return RIVER_MIN_WIDTH
  const share = Math.min(1, Math.max(0, value / max))
  return RIVER_MIN_WIDTH + share * (RIVER_MAX_WIDTH - RIVER_MIN_WIDTH)
}

const r1 = (n: number) => Math.round(n * 10) / 10

/**
 * A closed SVG path for a vertical river centred on `cx`, whose width at each
 * node follows the balance. Edges curve smoothly between nodes.
 */
export function riverPath(nodes: RiverNode[], cx = 28): string {
  if (nodes.length === 0) return ''
  const sorted = [...nodes].sort((a, b) => a.y - b.y)
  const max = Math.max(...sorted.map((n) => n.value))
  const pts = sorted.map((n) => ({ y: n.y, h: riverWidth(n.value, max) / 2 }))
  if (pts.length === 1) pts.push({ y: pts[0].y + 1, h: pts[0].h })

  let d = `M${r1(cx - pts[0].h)} ${r1(pts[0].y)} L${r1(cx + pts[0].h)} ${r1(pts[0].y)}`
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const my = (a.y + b.y) / 2
    d += ` C${r1(cx + a.h)} ${r1(my)} ${r1(cx + b.h)} ${r1(my)} ${r1(cx + b.h)} ${r1(b.y)}`
  }
  const last = pts[pts.length - 1]
  d += ` L${r1(cx - last.h)} ${r1(last.y)}`
  for (let i = pts.length - 2; i >= 0; i--) {
    const a = pts[i + 1]
    const b = pts[i]
    const my = (a.y + b.y) / 2
    d += ` C${r1(cx - a.h)} ${r1(my)} ${r1(cx - b.h)} ${r1(my)} ${r1(cx - b.h)} ${r1(b.y)}`
  }
  return `${d} Z`
}

// ── Chance chart for the banner sheet ─────────────────────────────────────────

/** Fewest pulls at which the cumulative chance reaches one half ("typical"), or null. */
export function typicalPulls(curve: number[]): number | null {
  const i = curve.findIndex((p) => p >= 0.5)
  return i < 0 ? null : i
}

// ── Card text ─────────────────────────────────────────────────────────────────

export function bannerTypeLabel(type: WishBannerType, copies: number): string {
  const name = type === 'weapon' ? 'Weapon' : type === 'chronicled' ? 'Chronicled' : 'Character'
  return copies > 1 || type === 'character' ? `${name} ×${copies}` : name
}

/** The names typed in Settings → Featured Characters for a phase, e.g. "Mitya, Linnea". */
export function featuredText(names: readonly string[] | undefined): string {
  return (names ?? []).map((n) => n.trim()).filter(Boolean).join(', ')
}

/**
 * What a banner is called: the name you gave it, otherwise the phase's
 * featured characters. Older versions saved "v7.3 Phase 1" as the name when
 * none was known; that adds nothing to the title, so it doesn't count.
 */
export function bannerName(r: Pick<ChainStopResult, 'stop' | 'featured'>): string {
  const own = r.stop.label?.trim() ?? ''
  if (own && !/^v?[\d.]+ Phase [12]$/i.test(own)) return own
  return featuredText(r.featured)
}

/** "v7.3 Phase 1" (or "Phase 1" where a patch header already names the version). Dates sit on the start and end rows. */
export function bannerTitle(r: ChainStopResult, withVersion: boolean): string {
  const phase = `Phase ${r.stop.phase}`
  return withVersion ? `v${r.patchVersion} ${phase}` : phase
}

/**
 * What the plan does with your pulls on this banner. It goes all-in up to the
 * guarantee, so either it covers the worst case and carries the rest, or it
 * spends everything and says how far short of the guarantee that leaves you.
 */
export function spendLine(r: ChainStopResult): string {
  const pity = `pity ${r.pityAfter} after`
  if (r.actualSpend <= 0) return `No pulls left · carry 0 · ${pity}`
  if (r.actualSpend >= r.pullsForGuarantee) return `Spend ${r.actualSpend} · carry ≈ ${r.remainingAfter} · ${pity}`
  return `All ${r.actualSpend} in · carry 0 · ${pity}`
}

export interface CardRow {
  label: string
  text: string
}

/**
 * The card's start and end rows: "Start · Nov 25" "9 pulls · pity 10" and
 * "End · Dec 15" "41 pulls · worst case 170". A banner already running starts "Now".
 */
export function pullsRows(r: ChainStopResult, today = new Date()): { start: CardRow; end: CardRow } {
  const pulls = (n: number) => `${n} pull${n === 1 ? '' : 's'}`
  const running = parseISO(r.phaseDate) <= startOfDay(today)
  return {
    start: {
      label: running ? 'Now' : `Start · ${format(parseISO(r.phaseDate), 'MMM d')}`,
      text: `${pulls(Math.max(0, r.availableAtStart))} · pity ${r.pityBefore}`,
    },
    end: {
      label: `End · ${format(parseISO(r.phaseEndDate), 'MMM d')}`,
      text: `${pulls(Math.max(0, r.availableAtEnd))} · worst case ${r.pullsForGuarantee}`,
    },
  }
}

// ── How it adds up (banner sheet) ─────────────────────────────────────────────

export interface SumRow {
  label: string
  detail?: string
  /** Signed amount: income is positive, spending negative. A subtotal is the running total so far. */
  pulls: number
  subtotal?: boolean
}

/**
 * Where a banner's pulls come from: wallet today, plus income up to the
 * banner's end, minus what earlier banners in the plan spent. The rows add up
 * to availableAtEnd exactly; income is whatever makes up the difference, so a
 * rounding gap in the projection can never make the sum look wrong.
 */
export function pullLedger(r: ChainStopResult, wallet: number): SumRow[] {
  const start = format(parseISO(r.phaseDate), 'MMM d')
  const rows: SumRow[] = [{ label: 'In your wallet now', pulls: wallet }]
  const running = parseISO(r.phaseDate) <= startOfDay(new Date())
  if (!running) rows.push({ label: `Income to ${start}`, detail: 'estimate', pulls: r.availableAtStart + r.spentBefore - wallet })
  if (r.spentBefore > 0) rows.push({ label: 'Spent on earlier banners', pulls: -r.spentBefore })
  rows.push({ label: running ? 'Now' : `At the start · ${start}`, detail: `pity ${r.pityBefore}`, pulls: r.availableAtStart, subtotal: true })
  rows.push({ label: 'Earned during the banner', detail: 'estimate', pulls: r.availableAtEnd - r.availableAtStart })
  return rows
}

/**
 * Why the worst case is what it is: pulls to the next 5★ from the pity you
 * start at, then a lost 50/50 (or Fate Point) and any extra copies. The rows
 * add up to pullsForGuarantee, mirroring the engine's bannerThresholds.
 */
export function worstCaseSteps(r: ChainStopResult): SumRow[] {
  const hard = GAME_RULES.hardPity[r.bannerType]
  const nextSecured = r.guaranteedBefore || (r.bannerType !== 'character' && r.fatePointsBefore > 0)
  const rows: SumRow[] = [{
    label: 'Next 5★',
    detail: `from pity ${r.pityBefore}, certain by ${hard}`,
    pulls: r.pullsToNextFiveStar,
  }]
  if (!nextSecured) {
    rows.push(r.bannerType === 'character'
      ? { label: 'If it loses the 50/50', detail: 'the next 5★ is guaranteed', pulls: hard }
      : { label: 'If it isn’t your pick', detail: 'a Fate Point makes the next one yours', pulls: hard })
  }
  const extra = Math.max(0, r.copies - 1)
  if (extra > 0) {
    rows.push({ label: `${extra} more cop${extra === 1 ? 'y' : 'ies'}`, detail: 'each could take two 5★', pulls: extra * 2 * hard })
  }
  return rows
}

/** The latest earlier banner of the same kind that spent pulls: it set this banner's starting pity. */
export function pitySource(results: ChainStopResult[], r: ChainStopResult): ChainStopResult | null {
  const i = results.indexOf(r)
  for (let j = i - 1; j >= 0; j--) {
    if (results[j].bannerType === r.bannerType && results[j].actualSpend > 0) return results[j]
  }
  return null
}
