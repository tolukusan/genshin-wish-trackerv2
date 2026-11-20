import { differenceInDays, parseISO, addDays, format, startOfDay } from 'date-fns'
import type {
  PlayerState, ProjectionConfig, Patch, Target,
  ForecastResult, ForecastSnapshot, BreakdownItem,
  ChainStop, ChainStopResult, PatchModifier, PatchType, WishBannerType,
} from '@/types'
import { bannerOdds, chanceOfSuccess } from './probability'
import { GAME_RULES } from './gameRules'

interface EngineInput {
  player: PlayerState
  config: ProjectionConfig
  patches: Patch[]
  target: Target
  today?: Date
}

function getPatchRewardDrivers(patch: Patch): { baseType: PatchType; modifiers: PatchModifier[] } {
  // Defensive compatibility for manually imported pre-v12 planner JSON.
  const rawType = patch.patchType as string
  const legacyLantern = rawType === 'lantern-rite'
  const baseType = (legacyLantern ? 'standard' : rawType) as PatchType
  const modifiers = [...(patch.modifiers ?? [])]
  if (legacyLantern && !modifiers.includes('lantern-rite')) modifiers.push('lantern-rite')
  return { baseType, modifiers }
}

function getPatchPhaseEventPrimos(patch: Patch, phase: 1 | 2, config: ProjectionConfig): number {
  const r = config.recurring
  const { baseType, modifiers } = getPatchRewardDrivers(patch)
  const baseHalf = (r.patchTypeRewards[baseType] ?? 0) / 2
  if (phase === 2) return baseHalf
  const bonuses = modifiers.reduce((sum, modifier) => sum + (r.patchModifierRewards[modifier] ?? 0), 0)
  return baseHalf + bonuses
}

function getPatchRoadmapPhaseWishes(patch: Patch, phase: 1 | 2, config: ProjectionConfig): number {
  const r = config.recurring
  const { baseType, modifiers } = getPatchRewardDrivers(patch)
  const baseHalf = (r.patchTypeTotalWishes[baseType] ?? 0) / 2
  if (phase === 2) return baseHalf
  const bonuses = modifiers.reduce((sum, modifier) => sum + (r.patchModifierTotalWishes[modifier] ?? 0), 0)
  return baseHalf + bonuses
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

// Optional estimate of starglitter refunded by spending pulls (4★/5★ duplicates).
// Community F2P bookkeeping puts it at roughly +10% of pulls. Off by default.
function withStarglitterRefund(
  pulls: number,
  config: ProjectionConfig,
  push: (item: BreakdownItem) => void,
): number {
  if (!config.starglitterRefundIncluded || pulls <= 0) return pulls
  const percent = Math.max(0, config.recurring.starglitterRefundPercent ?? 10)
  const refund = Math.floor((pulls * percent) / 100)
  if (refund > 0) push({ source: `Starglitter refunds (est. ${percent}%)`, primogems: 0, fates: refund })
  return pulls + refund
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

  // Character Trials — trialPrimosPerPhase (2 banners × 20) per phase starting in (today, cutoff]
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
          bpPrimos += GAME_RULES.battlePassPaid.primogems
          bpFates += GAME_RULES.battlePassPaid.fates
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

  // Base patch content is split 50/50; special bonuses arrive wholly in Phase 1.
  // Only applies to patches that haven't started yet; active patches use Data Entry instead.
  let patchTypePrimos = 0
  let patchTypeHits = 0
  for (const p of patches) {
    const pStart = parseISO(p.startDate)
    if (pStart <= today) continue
    for (const ph of p.phases) {
      const phStart = parseISO(ph.startDate)
      if (phStart > today && phStart <= cutoff) {
        patchTypePrimos += getPatchPhaseEventPrimos(p, ph.phase, config)
        patchTypeHits++
      }
    }
  }
  if (patchTypePrimos > 0) {
    gainedPrimos += patchTypePrimos
    push({ source: `Patch Events + Bonuses (${patchTypeHits} phases)`, primogems: patchTypePrimos, fates: 0 })
  }

  // Starglitter
  const starglitterFates = Math.floor(player.starglitter / GAME_RULES.starglitterPerFate)
  if (starglitterFates > 0) {
    gainedFates += starglitterFates
    push({ source: 'Starglitter', primogems: 0, fates: starglitterFates })
  }

  // Totals (per spec: all primos summed first, then converted together)
  const totalPrimos = currentPrimos + gainedPrimos
  const totalFates = currentFates + Math.floor(totalPrimos / GAME_RULES.primogemsPerFate) + gainedFates
  const totalPulls = withStarglitterRefund(Math.floor(totalFates), config, push)

  return {
    cutoffDate: format(cutoff, 'yyyy-MM-dd'),
    daysToTarget,
    totalPrimos,
    totalPulls,
    breakdown,
  }
}

// Roadmap (long-term chain) snapshot — each future patch contributes its base
// all-inclusive estimate split across phases, with special bonuses in Phase 1.
// The current patch is excluded because the player tracks it directly via Data Entry.
function computeRoadmapSnapshot(
  player: PlayerState,
  config: ProjectionConfig,
  patches: Patch[],
  cutoff: Date,
  today: Date,
  includePhasesStartingAtCutoff = true,
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

  // Bridge Data Entry to the first future patch. Generic active-patch event
  // rewards stay excluded because claimed rewards cannot be inferred.
  const firstFuturePatchStart = patches
    .map((p) => parseISO(p.startDate))
    .filter((date) => date > today)
    .sort((a, b) => a.getTime() - b.getTime())[0]
  const bridgeCutoff = firstFuturePatchStart && firstFuturePatchStart < cutoff
    ? firstFuturePatchStart
    : cutoff
  const bridgeDays = Math.max(0, differenceInDays(bridgeCutoff, today))

  if (config.commissionsIncluded) {
    const primos = bridgeDays * r.dailyCommissions
    gainedPrimos += primos
    push({ source: 'Current-patch Daily Commissions', primogems: primos, fates: 0 })
  }

  const bridgeMonthlyOccurrences = (day: number) => {
    let count = 0
    for (let d = 0; d < bridgeDays; d++) {
      if (addDays(today, d).getDate() === day) count++
    }
    return count
  }
  if (config.spiralAbyssEnabled) {
    const primos = bridgeMonthlyOccurrences(16) * r.spiralAbyssMax
    gainedPrimos += primos
    push({ source: 'Current-patch Spiral Abyss', primogems: primos, fates: 0 })
  }
  if (config.imaginariumTheatreEnabled) {
    const primos = bridgeMonthlyOccurrences(1) * r.imaginariumTheatreMax
    gainedPrimos += primos
    push({ source: 'Current-patch Imaginarium Theatre', primogems: primos, fates: 0 })
  }
  if (config.monthlyShopIncluded) {
    const fates = bridgeMonthlyOccurrences(1) * r.monthlyShopIntertwined
    gainedFates += fates
    push({ source: 'Current-patch Monthly Shop', primogems: 0, fates })
  }
  if (config.stygianOnslaughtEnabled) {
    const hits = patches.map((p) => addDays(parseISO(p.startDate), 7))
      .filter((date) => date > today && date < bridgeCutoff).length
    const primos = hits * r.stygianOnslaughtMax
    gainedPrimos += primos
    push({ source: 'Current-patch Stygian Onslaught', primogems: primos, fates: 0 })
  }
  if (config.characterTrialsEnabled) {
    const phases = patches.flatMap((p) => p.phases).filter((phase) => {
      const date = parseISO(phase.startDate)
      return date > today && date < bridgeCutoff
    }).length
    const primos = phases * r.trialPrimosPerPhase
    gainedPrimos += primos
    push({ source: 'Current-patch Character Trials', primogems: primos, fates: 0 })
  }
  if (config.livestreamIncluded) {
    const hits = patches.slice(1).filter((patch) => {
      const date = addDays(parseISO(patch.startDate), -12)
      return date > today && date < bridgeCutoff
    }).length
    const primos = hits * r.livestreamPrimos
    gainedPrimos += primos
    push({ source: 'Current-patch Livestream Codes', primogems: primos, fates: 0 })
  }

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
      if (ph2Start > today && (ph2Start < cutoff || (includePhasesStartingAtCutoff && ph2Start <= cutoff))) {
        bpCount++
        if (player.battlePassMode === 'paid') {
          bpPrimos += GAME_RULES.battlePassPaid.primogems
          bpFates += GAME_RULES.battlePassPaid.fates
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

  // Patch estimate — base all-inclusive wishes + additive modifiers, split 50/50 across phases.
  let wishEstimate = 0
  let wishHits = 0
  for (const p of patches) {
    const pStart = parseISO(p.startDate)
    if (pStart <= today) continue
    for (const ph of p.phases) {
      const phStart = parseISO(ph.startDate)
      if (phStart > today && (phStart < cutoff || (includePhasesStartingAtCutoff && phStart <= cutoff))) {
        wishEstimate += getPatchRoadmapPhaseWishes(p, ph.phase, config)
        wishHits++
      }
    }
  }
  if (wishEstimate > 0) {
    gainedFates += wishEstimate
    push({ source: `Patch Estimate + Bonuses (${wishHits} phases)`, primogems: 0, fates: wishEstimate })
  }

  // Starglitter
  const starglitterFates = Math.floor(player.starglitter / GAME_RULES.starglitterPerFate)
  if (starglitterFates > 0) {
    gainedFates += starglitterFates
    push({ source: 'Starglitter', primogems: 0, fates: starglitterFates })
  }

  const totalPrimos = currentPrimos + gainedPrimos
  const totalFates = currentFates + Math.floor(totalPrimos / GAME_RULES.primogemsPerFate) + gainedFates
  const totalPulls = withStarglitterRefund(Math.floor(totalFates), config, push)

  return {
    cutoffDate: format(cutoff, 'yyyy-MM-dd'),
    daysToTarget,
    totalPrimos,
    totalPulls,
    breakdown,
  }
}

export function getRoadmapBridge(input: {
  player: PlayerState
  config: ProjectionConfig
  patches: Patch[]
  today?: Date
}): ForecastSnapshot | null {
  const today = startOfDay(input.today ?? new Date())
  const firstFuturePatch = input.patches
    .filter((patch) => parseISO(patch.startDate) > today)
    .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime())[0]
  if (!firstFuturePatch) return null
  return computeRoadmapSnapshot(input.player, input.config, input.patches, parseISO(firstFuturePatch.startDate), today, false)
}

/** Roadmap-model balance and income breakdown at a cutoff date (the same model runChain uses). */
export function getRoadmapSnapshot(input: {
  player: PlayerState
  config: ProjectionConfig
  patches: Patch[]
  cutoff: string
  today?: Date
}): ForecastSnapshot {
  const today = startOfDay(input.today ?? new Date())
  return computeRoadmapSnapshot(input.player, input.config, input.patches, parseISO(input.cutoff), today)
}

export function runProjection(input: EngineInput): ForecastResult {
  const { player, config, patches, target } = input
  const today = startOfDay(input.today ?? new Date())
  const r = config.recurring

  const targetPatch = patches.find((p) => p.id === target.patchId)
  if (!targetPatch) return emptyResult(target.pullsNeeded, player)
  const targetPhase = targetPatch.phases.find((p) => p.phase === target.phase)
  if (!targetPhase) return emptyResult(target.pullsNeeded, player)

  const phaseStart = parseISO(targetPhase.startDate)
  const phaseEnd = addDays(phaseStart, r.bannerDurationDays)

  const atStart = computeSnapshot(player, config, patches, phaseStart, today)
  const atEnd = computeSnapshot(player, config, patches, phaseEnd, today)

  // Delta: income earned during the banner window only.
  // We use Math.max(today, phaseStart) so that if the banner is already active,
  // the delta reflects only the income REMAINING until the banner ends.
  const deltaStart = today > phaseStart ? today : phaseStart
  const elapsedBeforeDelta = Math.max(0, differenceInDays(deltaStart, today))
  const remainingWelkinDays = player.welkinActive
    ? Math.max(0, player.welkinDaysRemaining - elapsedBeforeDelta)
    : 0
  const zeroPlayer: PlayerState = {
    ...player,
    primogems: 0, genesisCrystals: 0, intertwinedFates: 0,
    starglitter: 0, stardust: 0, acquaintFates: 0,
    welkinActive: player.welkinActive && remainingWelkinDays > 0,
    welkinDaysRemaining: remainingWelkinDays,
  }
  const deltaAtEnd = computeSnapshot(zeroPlayer, config, patches, phaseEnd, deltaStart)

  const pityAtTarget = player.characterBannerPity
  const guaranteedAtTarget = player.characterBannerGuaranteed
  const hardPity = GAME_RULES.hardPity.character
  const pullsToPity = hardPity - pityAtTarget

  // Worst case: pulls needed to guarantee THIS character (doubles if on 50/50, since you might lose it)
  const pullsForGuarantee = guaranteedAtTarget ? pullsToPity : pullsToPity + hardPity

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
  }
}

function emptyResult(pullsNeeded: number, player: PlayerState): ForecastResult {
  const currentPulls = Math.floor((player.primogems + player.genesisCrystals) / GAME_RULES.primogemsPerFate) + player.intertwinedFates
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
    pullsToPity: GAME_RULES.hardPity.character - player.characterBannerPity,
    pullsNeeded,
    pullsForGuarantee: 0,
    canGuaranteeAtStart: false,
    canGuaranteeAtEnd: false,
  }
}

// ── Chain Planner (Roadmap) ───────────────────────────────────────────────────
// Each stop uses computeRoadmapSnapshot(today → stop.phaseStart), the lump per-patch
// estimate rather than the granular short-term engine.
// A running deficit tracks cumulative pulls spent at prior stops.

interface ChainPityState {
  pity: number
  guaranteed: boolean
  fatePoints: number
}

function bannerTypeFor(stop: ChainStop): WishBannerType {
  return stop.bannerType ?? 'character'
}

function bannerCopiesFor(stop: ChainStop): number {
  return Math.max(1, Math.min(7, stop.copies ?? 1))
}

function bannerPityState(player: PlayerState, type: WishBannerType): ChainPityState {
  if (type === 'weapon') {
    return { pity: player.weaponBannerPity, guaranteed: false, fatePoints: player.weaponBannerFatePoints }
  }
  if (type === 'chronicled') {
    return {
      pity: player.chronicleBannerPity,
      guaranteed: false,
      fatePoints: player.chronicleBannerFatePoints ?? 0,
    }
  }
  return { pity: player.characterBannerPity, guaranteed: player.characterBannerGuaranteed, fatePoints: 0 }
}

function bannerHardPity(type: WishBannerType): number {
  return GAME_RULES.hardPity[type]
}

// A roadmap stop spends only at a meaningful 5-star milestone. This prevents
// an unaffordable 180-pull guarantee from consuming/carrying every pull when
// the player has enough to reach the next 5-star (for example, 117 available
// with an 80-pull hard pity spends 80 and carries 37).
function bannerThresholds(
  type: WishBannerType,
  copies: number,
  state: ChainPityState,
): { nextFiveStar: number; targetGuarantee: number } {
  const hard = bannerHardPity(type)
  const nextFiveStar = Math.max(1, hard - state.pity)
  const nextFeatured = state.guaranteed || ((type === 'weapon' || type === 'chronicled') && state.fatePoints > 0)
    ? nextFiveStar
    : nextFiveStar + hard
  const extraCopies = Math.max(0, copies - 1)
  return {
    nextFiveStar,
    targetGuarantee: nextFeatured + extraCopies * 2 * hard,
  }
}

function applyChainSpend(
  type: WishBannerType,
  state: ChainPityState,
  spend: number,
): ChainPityState {
  const hard = bannerHardPity(type)
  const pity = state.pity
  let guaranteed = state.guaranteed
  let fatePoints = state.fatePoints
  let remaining = pity + spend

  while (remaining >= hard) {
    remaining -= hard
    if (type === 'weapon' || type === 'chronicled') {
      // One Fate Point (or the chronicled "guaranteed" flag) secures the chosen
      // item on the next 5-star, which consumes it. Otherwise assume the worst
      // case: the 5-star is off-target and earns a Fate Point.
      const secured = guaranteed || fatePoints > 0
      guaranteed = false
      fatePoints = secured ? 0 : 1
    } else {
      guaranteed = !guaranteed
    }
  }

  return { pity: remaining, guaranteed, fatePoints }
}

export function runChain(input: {
  player: PlayerState
  config: ProjectionConfig
  patches: Patch[]
  chain: ChainStop[]
  today?: Date
}): ChainStopResult[] {
  const { player, config, patches, chain } = input
  const today = startOfDay(input.today ?? new Date())

  const results: ChainStopResult[] = []
  let deficit = 0

  const pityCarry: Record<WishBannerType, ChainPityState> = {
    character: bannerPityState(player, 'character'),
    weapon: bannerPityState(player, 'weapon'),
    chronicled: bannerPityState(player, 'chronicled'),
  }

  // Chronicled Fate Points expire when a Chronicled Wish ends (pity carries over).
  // The player's current Fate Point belongs to the phase running today.
  const phaseKey = (patchId: string, phase: number) => `${patchId}:${phase}`
  let chronicledPhase: string | null = null
  for (const p of patches) {
    for (const ph of p.phases) {
      if (parseISO(ph.startDate) <= today && today < parseISO(ph.endDate)) chronicledPhase = phaseKey(p.id, ph.phase)
    }
  }

  for (const stop of chain) {
    const patch = patches.find((p) => p.id === stop.patchId)
    if (!patch) continue
    const ph = patch.phases.find((p) => p.phase === stop.phase)
    if (!ph) continue

    if (bannerTypeFor(stop) === 'chronicled') {
      const key = phaseKey(stop.patchId, stop.phase)
      if (key !== chronicledPhase) {
        pityCarry.chronicled = { ...pityCarry.chronicled, guaranteed: false, fatePoints: 0 }
        chronicledPhase = key
      }
    }

    const phaseDate = parseISO(ph.startDate)
    const phaseEnd = addDays(phaseDate, config.recurring.bannerDurationDays)
    const daysToStop = Math.max(0, differenceInDays(phaseDate, today))
    const daysToEnd = Math.max(0, differenceInDays(phaseEnd, today))

    const type = bannerTypeFor(stop)
    const copies = bannerCopiesFor(stop)
    const stateBefore = { ...pityCarry[type] }
    const thresholds = bannerThresholds(type, copies, stateBefore)

    const snapStart = computeRoadmapSnapshot(player, config, patches, phaseDate, today, false)
    const snapEnd = computeRoadmapSnapshot(player, config, patches, phaseEnd, today)

    const availableAtStart = snapStart.totalPulls - deficit
    const availableAtEnd = snapEnd.totalPulls - deficit

    // All-in up to the guarantee: spend every pull available by the banner's
    // end, but never more than the worst case needs. The chance below is
    // computed on this same spend, and later banners only get what is left, so
    // two banners can never both count the same pulls.
    const plannedSpend = Math.max(0, Math.min(availableAtEnd, thresholds.targetGuarantee))
    const actualSpend = plannedSpend
    const canAfford = availableAtEnd >= thresholds.nextFiveStar

    if (actualSpend > 0) {
      deficit += actualSpend
      pityCarry[type] = applyChainSpend(type, stateBefore, actualSpend)
    }

    const stateAfter = { ...pityCarry[type] }

    results.push({
      stop,
      bannerType: type,
      copies,
      patchVersion: patch.version,
      phaseDate: ph.startDate,
      phaseEndDate: format(phaseEnd, 'yyyy-MM-dd'),
      daysToStop,
      daysToEnd,
      pullsToSpend: plannedSpend,
      pullsToNextFiveStar: thresholds.nextFiveStar,
      pullsForGuarantee: thresholds.targetGuarantee,
      availableAtStart,
      rewardsDuringBanner: Math.max(0, availableAtEnd - availableAtStart),
      availableAtEnd,
      actualSpend,
      canAfford,
      remainingAfter: availableAtEnd - actualSpend,
      pityBefore: stateBefore.pity,
      guaranteedBefore: stateBefore.guaranteed,
      fatePointsBefore: stateBefore.fatePoints,
      pityAfter: stateAfter.pity,
      guaranteedAfter: stateAfter.guaranteed,
      fatePointsAfter: stateAfter.fatePoints,
      successChance: chanceOfSuccess(
        bannerOdds(config, type),
        { pity: stateBefore.pity, guaranteed: stateBefore.guaranteed || stateBefore.fatePoints > 0 },
        actualSpend,
        copies,
      ),
    })
  }

  return results
}

// ── Timeline (today through banner end) ───────────────────────────────────────

export interface TimelinePoint {
  label: string
  cumulativePrimos: number
  cumulativePulls: number
}

export function buildTimeline(input: EngineInput): TimelinePoint[] {
  const { player, config, patches, target } = input
  const today = startOfDay(input.today ?? new Date())
  const r = config.recurring

  const targetPatch = patches.find((p) => p.id === target.patchId)
  if (!targetPatch) return []
  const targetPhase = targetPatch.phases.find((p) => p.phase === target.phase)
  if (!targetPhase) return []

  const phaseStart = parseISO(targetPhase.startDate)
  const phaseEnd = addDays(phaseStart, r.bannerDurationDays)
  const totalDays = differenceInDays(phaseEnd, today)
  if (totalDays <= 0) return []

  const step = Math.max(1, Math.floor(totalDays / 20))
  const points: TimelinePoint[] = []

  for (let d = 0; d <= totalDays; d += step) {
    const cutoff = addDays(today, d)
    const snap = computeSnapshot(player, config, patches, cutoff, today)
    points.push({
      label: format(cutoff, 'MMM d'),
      cumulativePrimos: snap.totalPrimos,
      cumulativePulls: snap.totalPulls,
    })
  }

  const lastCutoff = addDays(today, points.length ? (points.length - 1) * step : 0)
  if (differenceInDays(phaseEnd, lastCutoff) > 0) {
    const snap = computeSnapshot(player, config, patches, phaseEnd, today)
    points.push({
      label: format(phaseEnd, 'MMM d'),
      cumulativePrimos: snap.totalPrimos,
      cumulativePulls: snap.totalPulls,
    })
  }

  return points
}
