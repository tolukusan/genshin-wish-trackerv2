import { differenceInDays, parseISO, addDays, format } from 'date-fns'
import type {
  PlayerState, ProjectionConfig, Patch, Target,
  ForecastResult, ForecastSnapshot, BreakdownItem,
  ChainStop, ChainStopResult,
} from '@/types'

interface EngineInput {
  player: PlayerState
  config: ProjectionConfig
  patches: Patch[]
  target: Target
  today?: Date
}

// Count how many times a specific day-of-month falls strictly between from and to (exclusive on both ends).
function countMonthlyOccurrences(from: Date, to: Date, dayOfMonth: number): number {
  const days = differenceInDays(to, from)
  if (days <= 0) return 0
  let count = 0
  for (let d = 1; d <= days; d++) {
    const date = addDays(from, d)
    if (date.getDate() === dayOfMonth && date < to) count++
  }
  return count
}

// Count phases from all patches whose startDate falls on or before the cutoff.
function countTrialPhases(patches: Patch[], cutoff: Date): number {
  let count = 0
  for (const p of patches) {
    for (const ph of p.phases) {
      const phStart = parseISO(ph.startDate)
      if (phStart <= cutoff) count++
    }
  }
  return count
}

// Compute a single snapshot to a given cutoff date.
function computeSnapshot(
  player: PlayerState,
  config: ProjectionConfig,
  patches: Patch[],
  cutoff: Date,
  today: Date,
): ForecastSnapshot {
  const r = config.recurring
  const daysToTarget = Math.max(0, differenceInDays(cutoff, today))
  const breakdown: BreakdownItem[] = []

  const push = (item: BreakdownItem) => {
    if (item.primogems > 0 || item.fates > 0) breakdown.push(item)
  }

  // Current resources
  const currentPrimos = player.primogems + player.genesisCrystals
  const currentFates = player.intertwinedFates
  if (currentPrimos > 0) push({ source: 'Current Primogems', primogems: currentPrimos, fates: 0 })
  if (currentFates > 0) push({ source: 'Current Intertwined Fates', primogems: 0, fates: currentFates })

  let gainedPrimos = 0
  let gainedFates = 0

  // Daily Commissions
  if (config.commissionsIncluded) {
    const primos = daysToTarget * r.dailyCommissions
    gainedPrimos += primos
    push({ source: 'Daily Commissions', primogems: primos, fates: 0 })
  }

  // Welkin Moon (capped by days remaining)
  if (player.welkinActive) {
    const welkinDays = Math.min(daysToTarget, player.welkinDaysRemaining)
    const primos = welkinDays * r.welkinDaily
    gainedPrimos += primos
    push({ source: 'Welkin Moon', primogems: primos, fates: 0 })
  }

  // Spiral Abyss — resets on the 16th
  if (config.spiralAbyssEnabled) {
    const resets = countMonthlyOccurrences(today, cutoff, 16)
    const primos = resets * r.spiralAbyssMax
    gainedPrimos += primos
    push({ source: `Spiral Abyss (${resets}×)`, primogems: primos, fates: 0 })
  }

  // Imaginarium Theatre — resets on the 1st
  if (config.imaginariumTheatreEnabled) {
    const resets = countMonthlyOccurrences(today, cutoff, 1)
    const primos = resets * r.imaginariumTheatreMax
    gainedPrimos += primos
    push({ source: `Imaginarium Theatre (${resets}×)`, primogems: primos, fates: 0 })
  }

  // Monthly Shop — resets on the 1st (same count as Theatre)
  if (config.monthlyShopIncluded) {
    const resets = countMonthlyOccurrences(today, cutoff, 1)
    const fates = resets * r.monthlyShopIntertwined
    gainedFates += fates
    push({ source: `Monthly Shop (${resets}×)`, primogems: 0, fates })
  }

  // Stygian Onslaught — patch_start + 7, if that date < cutoff
  if (config.stygianOnslaughtEnabled) {
    const hits = patches
      .map((p) => addDays(parseISO(p.startDate), 7))
      .filter((d) => d > today && d < cutoff)
    const primos = hits.length * r.stygianOnslaughtMax
    gainedPrimos += primos
    push({ source: `Stygian Onslaught (${hits.length}×)`, primogems: primos, fates: 0 })
  }

  // Character Trials — 40 primos per phase whose start date <= cutoff
  if (config.characterTrialsEnabled) {
    const phases = countTrialPhases(patches, cutoff)
    const primos = phases * r.trialPrimosPerPhase
    gainedPrimos += primos
    push({ source: `Character Trials (${phases} phases)`, primogems: primos, fates: 0 })
  }

  // Battle Pass — count patches that fully complete before cutoff
  if (config.battlePassIncluded && player.battlePassMode !== 'off') {
    const cycles = patches.filter((p) => parseISO(p.endDate) <= cutoff).length
    if (player.battlePassMode === 'paid' && cycles > 0) {
      const primos = cycles * r.battlePassPaidPrimos
      const fates = cycles * r.battlePassPaidFates
      gainedPrimos += primos
      gainedFates += fates
      push({ source: `Battle Pass Paid (${cycles}×)`, primogems: primos, fates })
    }
  }

  // Patch Maintenance — available at patch start (Phase 1), count patches where startDate is in (today, cutoff]
  // Only future maintenance (not yet received) is counted; past maintenance is already in the player's balance.
  let maintenanceTotal = 0
  let maintenanceCount = 0
  for (const p of patches) {
    if (!p.maintenanceEnabled) continue
    const pStart = parseISO(p.startDate)
    if (pStart > today && pStart <= cutoff) {
      maintenanceTotal += p.maintenancePrimos ?? 600
      maintenanceCount++
    }
  }
  if (maintenanceTotal > 0) {
    gainedPrimos += maintenanceTotal
    push({ source: `Patch Maintenance (${maintenanceCount}×)`, primogems: maintenanceTotal, fates: 0 })
  }

  // Livestream Codes — occurs 12 days before the NEXT patch's Wednesday start
  // For patch[i]: livestream_date = patches[i+1].startDate - 12 days
  // Count livestream dates that fall strictly before the cutoff
  let livestreamTotal = 0
  let livestreamCount = 0
  for (let i = 0; i < patches.length - 1; i++) {
    const p = patches[i]
    if (!p.livestreamEnabled) continue
    const livestreamDate = addDays(parseISO(patches[i + 1].startDate), -12)
    if (livestreamDate > today && livestreamDate < cutoff) {
      livestreamTotal += p.livestreamPrimos ?? 300
      livestreamCount++
    }
  }
  if (livestreamTotal > 0) {
    gainedPrimos += livestreamTotal
    push({ source: `Livestream Codes (${livestreamCount}×)`, primogems: livestreamTotal, fates: 0 })
  }

  // Custom patch events — phase 1 events available from patch start, phase 2 from phase 2 start
  let eventPrimos = 0
  let eventFates = 0
  for (const p of patches) {
    for (const ev of p.events) {
      if (!ev.enabled) continue
      const ph2Start = p.phases.find((ph) => ph.phase === 2)?.startDate
      const evDate = ev.phase === 2 && ph2Start ? parseISO(ph2Start) : parseISO(p.startDate)
      if (evDate >= cutoff || evDate <= today) continue
      eventPrimos += ev.primogems
      eventFates += ev.fates ?? 0
    }
  }
  if (eventPrimos > 0 || eventFates > 0) {
    gainedPrimos += eventPrimos
    gainedFates += eventFates
    push({ source: 'Custom Events', primogems: eventPrimos, fates: eventFates })
  }

  // Starglitter
  const starglitterFates = Math.floor(player.starglitter / r.starglitterPerFate)
  if (starglitterFates > 0) {
    gainedFates += starglitterFates
    push({ source: 'Starglitter', primogems: 0, fates: starglitterFates })
  }

  // Totals (per spec: all primos summed first, then converted together)
  const totalPrimos = currentPrimos + gainedPrimos
  const totalFates = currentFates + Math.floor(totalPrimos / r.primoPerFate) + gainedFates
  const totalPulls = Math.floor(totalFates)

  return {
    cutoffDate: format(cutoff, 'yyyy-MM-dd'),
    daysToTarget,
    totalPrimos,
    totalPulls,
    breakdown,
  }
}

export function runProjection(input: EngineInput): ForecastResult {
  const { player, config, patches, target } = input
  const today = input.today ?? new Date()
  const r = config.recurring

  const targetPatch = patches.find((p) => p.id === target.patchId)
  if (!targetPatch) return emptyResult(target.pullsNeeded, player, config)
  const targetPhase = targetPatch.phases.find((p) => p.phase === target.phase)
  if (!targetPhase) return emptyResult(target.pullsNeeded, player, config)

  const phaseStart = parseISO(targetPhase.startDate)
  const phaseEnd = addDays(phaseStart, r.bannerDurationDays)

  const atStart = computeSnapshot(player, config, patches, phaseStart, today)
  const atEnd = computeSnapshot(player, config, patches, phaseEnd, today)

  // Delta: income earned during the banner window only (phaseStart → phaseEnd).
  // Zero out current resources so only incremental income sources appear.
  const zeroPlayer: PlayerState = {
    ...player,
    primogems: 0, genesisCrystals: 0, intertwinedFates: 0,
    starglitter: 0, stardust: 0, acquaintFates: 0,
  }
  const deltaAtEnd = computeSnapshot(zeroPlayer, config, patches, phaseEnd, phaseStart)

  const pityAtTarget = player.characterBannerPity
  const guaranteedAtTarget = player.characterBannerGuaranteed
  const pullsToPity = config.hardPityCharacter - pityAtTarget

  const pullsForGuarantee = config.hardPityCharacter - pityAtTarget

  return {
    atStart,
    atEnd,
    deltaAtEnd,
    pityAtTarget,
    guaranteedAtTarget,
    pullsToPity,
    pullsNeeded: target.pullsNeeded,
    canGuaranteeAtStart: atStart.totalPulls >= pullsForGuarantee,
    canGuaranteeAtEnd: atEnd.totalPulls >= pullsForGuarantee,
  }
}

function emptyResult(pullsNeeded: number, player: PlayerState, config: ProjectionConfig): ForecastResult {
  const currentPulls = Math.floor((player.primogems + player.genesisCrystals) / 160) + player.intertwinedFates
  const empty: ForecastSnapshot = {
    cutoffDate: '',
    daysToTarget: 0,
    totalPrimos: 0,
    totalPulls: currentPulls,
    breakdown: [],
  }
  const emptyDelta: ForecastSnapshot = { cutoffDate: '', daysToTarget: 0, totalPrimos: 0, totalPulls: 0, breakdown: [] }
  return {
    atStart: empty,
    atEnd: empty,
    deltaAtEnd: emptyDelta,
    pityAtTarget: player.characterBannerPity,
    guaranteedAtTarget: player.characterBannerGuaranteed,
    pullsToPity: config.hardPityCharacter - player.characterBannerPity,
    pullsNeeded,
    canGuaranteeAtStart: false,
    canGuaranteeAtEnd: false,
  }
}

// ── Chain Planner ─────────────────────────────────────────────────────────────
// Each stop uses computeSnapshot(today → stop.phaseStart).
// A running deficit tracks cumulative pulls spent at prior stops.
// delta between snapshots = resources earned between two banner dates.

export function runChain(input: {
  player: PlayerState
  config: ProjectionConfig
  patches: Patch[]
  chain: ChainStop[]
  today?: Date
}): ChainStopResult[] {
  const { player, config, patches, chain } = input
  const today = input.today ?? new Date()

  const results: ChainStopResult[] = []
  let deficit = 0
  // pityCarry: the pity already invested toward the next 5-star.
  // Carries through skips unchanged; resets to 0 only after a successful spend.
  // guaranteedCarry: flips on each successful spend.
  let pityCarry = player.characterBannerPity
  let guaranteedCarry = player.characterBannerGuaranteed

  for (const stop of chain) {
    const patch = patches.find((p) => p.id === stop.patchId)
    if (!patch) continue
    const ph = patch.phases.find((p) => p.phase === stop.phase)
    if (!ph) continue

    const phaseDate = parseISO(ph.startDate)
    const phaseEnd = addDays(phaseDate, config.recurring.bannerDurationDays)
    const daysToStop = Math.max(0, differenceInDays(phaseDate, today))
    const daysToEnd = Math.max(0, differenceInDays(phaseEnd, today))

    const snapStart = computeSnapshot(player, config, patches, phaseDate, today)
    const snapEnd = computeSnapshot(player, config, patches, phaseEnd, today)

    // effectiveCost = how many new pulls are still needed (pity already covers the rest).
    // stop.pullsToSpend is the user's target (e.g. 90 or 180); pity reduces what must be acquired.
    const effectiveCost = Math.max(0, stop.pullsToSpend - pityCarry)

    const availableAtStart = snapStart.totalPulls - deficit
    const availableAtEnd = snapEnd.totalPulls - deficit
    const canAfford = availableAtEnd >= effectiveCost
    const actualSpend = canAfford ? effectiveCost : 0
    const remainingAfter = availableAtEnd - actualSpend

    const guaranteed = guaranteedCarry
    deficit += actualSpend
    if (canAfford) {
      pityCarry = 0
      if (guaranteedCarry) {
        guaranteedCarry = false
      } else {
        // 50/50: spent ≥ 2× hard pity → covered both outcomes → next is 50/50
        // Otherwise worst case lost 50/50 → next is guaranteed
        guaranteedCarry = stop.pullsToSpend < config.hardPityCharacter * 2
      }
    }

    results.push({
      stop,
      patchVersion: patch.version,
      phaseDate: ph.startDate,
      phaseEndDate: format(phaseEnd, 'yyyy-MM-dd'),
      daysToStop,
      daysToEnd,
      pullsToSpend: effectiveCost,
      guaranteed,
      availableAtStart,
      availableAtEnd,
      actualSpend,
      canAfford,
      remainingAfter,
    })
  }

  return results
}

// ── Timeline (uses banner start cutoff) ──────────────────────────────────────

export interface TimelinePoint {
  label: string
  cumulativePrimos: number
  cumulativePulls: number
}

export function buildTimeline(input: EngineInput): TimelinePoint[] {
  const { player, config, patches, target } = input
  const today = input.today ?? new Date()
  const r = config.recurring

  const targetPatch = patches.find((p) => p.id === target.patchId)
  if (!targetPatch) return []
  const targetPhase = targetPatch.phases.find((p) => p.phase === target.phase)
  if (!targetPhase) return []

  const targetDate = parseISO(targetPhase.startDate)
  const totalDays = differenceInDays(targetDate, today)
  if (totalDays <= 0) return []

  const step = Math.max(7, Math.floor(totalDays / 20))
  const points: TimelinePoint[] = []
  let cumPrimos = player.primogems + player.genesisCrystals

  for (let d = 0; d <= totalDays; d += step) {
    const dailyRate =
      (config.commissionsIncluded ? r.dailyCommissions : 0) +
      (config.welkinIncluded && player.welkinActive && d < player.welkinDaysRemaining ? r.welkinDaily : 0)

    cumPrimos += dailyRate * Math.min(step, totalDays - d)
    const cumFates = player.intertwinedFates + Math.floor(cumPrimos / r.primoPerFate)

    points.push({
      label: format(addDays(today, d), 'MMM d'),
      cumulativePrimos: Math.round(cumPrimos),
      cumulativePulls: Math.round(cumFates),
    })
  }

  return points
}
