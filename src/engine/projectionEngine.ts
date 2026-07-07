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

// Count how many times a specific day-of-month falls in [from, to] (inclusive of both ends).
// 'from' (today) is included because its reset is treated as still-pending/unclaimed,
// consistent with how Daily Commissions counts today as a not-yet-done day.
function countMonthlyOccurrences(from: Date, to: Date, dayOfMonth: number): number {
  const days = differenceInDays(to, from)
  if (days <= 0) return 0
  let count = 0
  for (let d = 0; d <= days; d++) {
    const date = addDays(from, d)
    if (date.getDate() === dayOfMonth && date <= to) count++
  }
  return count
}

// Count phases from all patches whose startDate falls in the window (today, cutoff].
function countTrialPhases(patches: Patch[], cutoff: Date, today: Date): number {
  let count = 0
  for (const p of patches) {
    for (const ph of p.phases) {
      const phStart = parseISO(ph.startDate)
      if (phStart > today && phStart <= cutoff) count++
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

  // Welkin Moon: Automatically included if active, or if the toggle is on (for future projection)
  const isWelkinIncluded = player.welkinActive || config.welkinIncluded
  if (isWelkinIncluded) {
    // If active, cap by days remaining; otherwise assume infinite (or config-driven)
    const welkinDays = player.welkinActive 
      ? Math.min(daysToTarget, player.welkinDaysRemaining)
      : daysToTarget
    const primos = welkinDays * r.welkinDaily
    if (primos > 0) {
      gainedPrimos += primos
      push({ source: 'Welkin Moon', primogems: primos, fates: 0 })
    }
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

  // Stygian Onslaught — patch_start + 7, if that date in (today, cutoff]
  if (config.stygianOnslaughtEnabled) {
    const hits = patches
      .map((p) => addDays(parseISO(p.startDate), 7))
      .filter((d) => d > today && d <= cutoff)
    const primos = hits.length * r.stygianOnslaughtMax
    gainedPrimos += primos
    push({ source: `Stygian Onslaught (${hits.length}×)`, primogems: primos, fates: 0 })
  }

  // Character Trials — 20 primos per phase whose start date is in (today, cutoff]
  if (config.characterTrialsEnabled) {
    const phases = countTrialPhases(patches, cutoff, today)
    const primos = phases * r.trialPrimosPerPhase
    gainedPrimos += primos
    push({ source: `Character Trials (${phases} phases)`, primogems: primos, fates: 0 })
  }

  // Battle Pass — becomes available at Phase 2 start
  if (config.battlePassIncluded && player.battlePassMode !== 'off') {
    let bpPrimos = 0
    let bpFates = 0
    let bpCount = 0

    for (const p of patches) {
      const ph2 = p.phases.find(ph => ph.phase === 2)
      if (!ph2) continue
      const ph2Start = parseISO(ph2.startDate)
      
      if (ph2Start > today && ph2Start <= cutoff) {
        bpCount++
        if (player.battlePassMode === 'paid') {
          bpPrimos += r.battlePassPaidPrimos
          bpFates += r.battlePassPaidFates
        }
      }
    }

    if (bpCount > 0) {
      gainedPrimos += bpPrimos
      gainedFates += bpFates
      push({ 
        source: `Battle Pass ${player.battlePassMode === 'paid' ? 'Paid' : 'Free'} (${bpCount}×)`, 
        primogems: bpPrimos, 
        fates: bpFates 
      })
    }
  }

  // Patch Maintenance — available at patch start (Phase 1), count patches where startDate is in (today, cutoff]
  if (config.maintenanceIncluded) {
    const hits = patches
      .map((p) => parseISO(p.startDate))
      .filter((d) => d > today && d <= cutoff)
    const primos = hits.length * r.maintenancePrimos
    gainedPrimos += primos
    push({ source: `Patch Maintenance (${hits.length}×)`, primogems: primos, fates: 0 })
  }

  // Livestream Codes — occurs 12 days before the NEXT patch's Wednesday start
  if (config.livestreamIncluded) {
    const hits = []
    for (let i = 0; i < patches.length - 1; i++) {
      const livestreamDate = addDays(parseISO(patches[i + 1].startDate), -12)
      if (livestreamDate > today && livestreamDate <= cutoff) hits.push(livestreamDate)
    }
    const primos = hits.length * r.livestreamPrimos
    gainedPrimos += primos
    push({ source: `Livestream Codes (${hits.length}×)`, primogems: primos, fates: 0 })
  }

  // Patch Type reward estimate — a lump sum per patch, split 50/50 across its two phases.
  // Only applies to patches that haven't started yet: once a patch is underway (or over),
  // the player is expected to track its actual event income themselves via Data Entry
  // rather than trust the generic patch-type prediction.
  let patchTypePrimos = 0
  let patchTypeHits = 0
  for (const p of patches) {
    const pStart = parseISO(p.startDate)
    if (pStart <= today) continue
    const half = r.patchTypeRewards[p.patchType] / 2
    for (const ph of p.phases) {
      const phStart = parseISO(ph.startDate)
      if (phStart > today && phStart <= cutoff) {
        patchTypePrimos += half
        patchTypeHits++
      }
    }
  }
  if (patchTypePrimos > 0) {
    gainedPrimos += patchTypePrimos
    push({ source: `Patch Events (${patchTypeHits} phases)`, primogems: patchTypePrimos, fates: 0 })
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

// Roadmap (long-term chain) snapshot — unlike computeSnapshot, this doesn't sum the
// granular mechanics (dailies, Abyss, Theatre, Stygian, Trials, Monthly Shop, Maintenance,
// Livestream, patch events) one by one. Over a long multi-patch horizon that precision isn't
// worth it, so instead each future patch just contributes one all-inclusive wish estimate per
// patch type (calibrated from historical data), split 50/50 across its two phases. The current
// patch is excluded — the player is expected to track it directly via Data Entry. Welkin and
// Battle Pass are added on top, but only if the player has actually configured them.
function computeRoadmapSnapshot(
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

  const currentPrimos = player.primogems + player.genesisCrystals
  const currentFates = player.intertwinedFates
  if (currentPrimos > 0) push({ source: 'Current Primogems', primogems: currentPrimos, fates: 0 })
  if (currentFates > 0) push({ source: 'Current Intertwined Fates', primogems: 0, fates: currentFates })

  let gainedPrimos = 0
  let gainedFates = 0

  // Welkin Moon — only if actually active right now, capped to remaining days
  if (player.welkinActive) {
    const welkinDays = Math.min(daysToTarget, player.welkinDaysRemaining)
    const primos = welkinDays * r.welkinDaily
    if (primos > 0) {
      gainedPrimos += primos
      push({ source: 'Welkin Moon', primogems: primos, fates: 0 })
    }
  }

  // Battle Pass — only if a mode is actually set
  if (player.battlePassMode !== 'off') {
    let bpPrimos = 0
    let bpFates = 0
    let bpCount = 0
    for (const p of patches) {
      const ph2 = p.phases.find((ph) => ph.phase === 2)
      if (!ph2) continue
      const ph2Start = parseISO(ph2.startDate)
      if (ph2Start > today && ph2Start <= cutoff) {
        bpCount++
        if (player.battlePassMode === 'paid') {
          bpPrimos += r.battlePassPaidPrimos
          bpFates += r.battlePassPaidFates
        }
      }
    }
    if (bpCount > 0) {
      gainedPrimos += bpPrimos
      gainedFates += bpFates
      push({
        source: `Battle Pass ${player.battlePassMode === 'paid' ? 'Paid' : 'Free'} (${bpCount}×)`,
        primogems: bpPrimos,
        fates: bpFates,
      })
    }
  }

  // Patch estimate — all-inclusive wishes per patch type, split 50/50 across phases.
  let wishEstimate = 0
  let wishHits = 0
  for (const p of patches) {
    const pStart = parseISO(p.startDate)
    if (pStart <= today) continue
    const half = r.patchTypeTotalWishes[p.patchType] / 2
    for (const ph of p.phases) {
      const phStart = parseISO(ph.startDate)
      if (phStart > today && phStart <= cutoff) {
        wishEstimate += half
        wishHits++
      }
    }
  }
  if (wishEstimate > 0) {
    gainedFates += wishEstimate
    push({ source: `Patch Estimate (${wishHits} phases)`, primogems: 0, fates: wishEstimate })
  }

  // Starglitter
  const starglitterFates = Math.floor(player.starglitter / r.starglitterPerFate)
  if (starglitterFates > 0) {
    gainedFates += starglitterFates
    push({ source: 'Starglitter', primogems: 0, fates: starglitterFates })
  }

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

  // Delta: income earned during the banner window only.
  // We use Math.max(today, phaseStart) so that if the banner is already active,
  // the delta reflects only the income REMAINING until the banner ends.
  const deltaStart = today > phaseStart ? today : phaseStart
  const zeroPlayer: PlayerState = {
    ...player,
    primogems: 0, genesisCrystals: 0, intertwinedFates: 0,
    starglitter: 0, stardust: 0, acquaintFates: 0,
  }
  const deltaAtEnd = computeSnapshot(zeroPlayer, config, patches, phaseEnd, deltaStart)

  const pityAtTarget = player.characterBannerPity
  const guaranteedAtTarget = player.characterBannerGuaranteed
  const pullsToPity = config.hardPityCharacter - pityAtTarget

  // Worst case: pulls needed to guarantee THIS character (doubles if on 50/50, since you might lose it)
  const pullsForGuarantee = config.strictGuarantee && !guaranteedAtTarget
    ? pullsToPity + config.hardPityCharacter
    : pullsToPity

  // Same idea, but using soft pity as the per-copy cost instead of hard pity —
  // where the 5-star drop rate starts climbing, rather than where it's guaranteed.
  const pullsToSoftPity = Math.max(0, config.softPityCharacter - pityAtTarget)
  const pullsForGuaranteeSoftPity = config.strictGuarantee && !guaranteedAtTarget
    ? pullsToSoftPity + config.softPityCharacter
    : pullsToSoftPity

  return {
    atStart,
    atEnd,
    deltaAtEnd,
    pityAtTarget,
    guaranteedAtTarget,
    pullsToPity,
    pullsNeeded: target.pullsNeeded,
    pullsForGuarantee,
    canGuaranteeAtStart: atStart.totalPulls >= pullsForGuarantee,
    canGuaranteeAtEnd: atEnd.totalPulls >= pullsForGuarantee,
    pullsToSoftPity,
    pullsForGuaranteeSoftPity,
    canGuaranteeAtStartSoftPity: atStart.totalPulls >= pullsForGuaranteeSoftPity,
    canGuaranteeAtEndSoftPity: atEnd.totalPulls >= pullsForGuaranteeSoftPity,
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
    pullsForGuarantee: 0,
    canGuaranteeAtStart: false,
    canGuaranteeAtEnd: false,
    pullsToSoftPity: 0,
    pullsForGuaranteeSoftPity: 0,
    canGuaranteeAtStartSoftPity: false,
    canGuaranteeAtEndSoftPity: false,
  }
}

// ── Chain Planner (Roadmap) ───────────────────────────────────────────────────
// Each stop uses computeRoadmapSnapshot(today → stop.phaseStart), the lump per-patch
// estimate rather than the granular short-term engine.
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
  let pityCarry = player.characterBannerPity
  let guaranteedCarry = player.characterBannerGuaranteed

  // Realistic track: same spend/afford numbers, but assumes each 5-star lands at
  // soft pity instead of always at hard pity.
  let pityCarryRealistic = player.characterBannerPity
  let guaranteedCarryRealistic = player.characterBannerGuaranteed

  for (const stop of chain) {
    const patch = patches.find((p) => p.id === stop.patchId)
    if (!patch) continue
    const ph = patch.phases.find((p) => p.phase === stop.phase)
    if (!ph) continue

    const phaseDate = parseISO(ph.startDate)
    const phaseEnd = addDays(phaseDate, config.recurring.bannerDurationDays)
    const daysToStop = Math.max(0, differenceInDays(phaseDate, today))
    const daysToEnd = Math.max(0, differenceInDays(phaseEnd, today))

    const snapStart = computeRoadmapSnapshot(player, config, patches, phaseDate, today)
    const snapEnd = computeRoadmapSnapshot(player, config, patches, phaseEnd, today)

    // availableAtEnd is the total pulls user will have at the end of this banner,
    // minus any pulls committed to previous stops in the chain.
    const availableAtStart = snapStart.totalPulls - deficit
    const availableAtEnd = snapEnd.totalPulls - deficit
    
    // user target: stop.pullsToSpend.
    // actualSpend is what we deduct from our balance.
    const actualSpend = availableAtEnd >= stop.pullsToSpend ? stop.pullsToSpend : 0
    const canAfford = actualSpend > 0

    const guaranteed = guaranteedCarry
    const guaranteedRealistic = guaranteedCarryRealistic

    if (canAfford) {
      deficit += actualSpend

      // Calculate total investment including carry-over pity
      let totalPityInvestment = pityCarry + actualSpend

      // How many 5-stars did we hit?
      while (totalPityInvestment >= config.hardPityCharacter) {
        totalPityInvestment -= config.hardPityCharacter
        if (guaranteedCarry) {
          guaranteedCarry = false
        } else {
          // If we hit a 5-star on 50/50, we assume worst case (lost)
          // unless the user spent enough to hit a second 5-star.
          guaranteedCarry = true
        }
      }
      pityCarry = totalPityInvestment

      // Same spend, but each 5-star assumed to land at soft pity instead of hard pity.
      let totalPityInvestmentRealistic = pityCarryRealistic + actualSpend
      while (totalPityInvestmentRealistic >= config.softPityCharacter) {
        totalPityInvestmentRealistic -= config.softPityCharacter
        if (guaranteedCarryRealistic) {
          guaranteedCarryRealistic = false
        } else {
          guaranteedCarryRealistic = true
        }
      }
      pityCarryRealistic = totalPityInvestmentRealistic
    }

    results.push({
      stop,
      patchVersion: patch.version,
      phaseDate: ph.startDate,
      phaseEndDate: format(phaseEnd, 'yyyy-MM-dd'),
      daysToStop,
      daysToEnd,
      pullsToSpend: stop.pullsToSpend, // User's requested spend
      guaranteed,
      guaranteedRealistic,
      availableAtStart,
      availableAtEnd,
      actualSpend,
      canAfford,
      remainingAfter: availableAtEnd - actualSpend,
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
