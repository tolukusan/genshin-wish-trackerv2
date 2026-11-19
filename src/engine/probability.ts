// Chance of success: probability of getting N copies of the featured item
// within a given number of pulls, from the player's current pity state.
//
// Rates (HoYoverse publishes base rate, hard pity and the 50/50; the soft-pity
// ramp is a community-derived model from large pull datasets):
//   - Character / Chronicled: 0.6% base, +6% per pull from soft pity, 100% at hard pity.
//   - Weapon:                 0.7% base, +7% per pull from soft pity, 100% at hard pity.
// Featured chance on a 5-star (when not already guaranteed):
//   - Character: 50%. Capturing Radiance (5.0+) is not modelled, so this is
//     slightly pessimistic.
//   - Weapon: 37.5% for the specific weapon (75% featured × 50% of the two).
//   - Chronicled: 50% for the chosen item.
// After an off-target 5-star the next 5-star is guaranteed (character
// "guaranteed", or one Fate Point on weapon/chronicled).

import type { ProjectionConfig, WishBannerType } from '@/types'

export interface BannerOdds {
  baseRate: number
  softPityStart: number // first pull number (since last 5-star) with a raised rate
  rateStep: number
  hardPity: number
  featuredChance: number
}

export function bannerOdds(config: ProjectionConfig, type: WishBannerType): BannerOdds {
  if (type === 'weapon') {
    return { baseRate: 0.007, softPityStart: config.softPityWeapon, rateStep: 0.07, hardPity: config.hardPityWeapon, featuredChance: 0.375 }
  }
  if (type === 'chronicled') {
    return { baseRate: 0.006, softPityStart: config.softPityChronicle, rateStep: 0.06, hardPity: config.hardPityChronicle, featuredChance: 0.5 }
  }
  return { baseRate: 0.006, softPityStart: config.softPityCharacter, rateStep: 0.06, hardPity: config.hardPityCharacter, featuredChance: 0.5 }
}

// 5-star rate for the n-th pull since the last 5-star (n is 1-based).
export function fiveStarRate(odds: BannerOdds, n: number): number {
  if (n >= odds.hardPity) return 1
  if (n < odds.softPityStart) return odds.baseRate
  return Math.min(1, odds.baseRate + odds.rateStep * (n - odds.softPityStart + 1))
}

export interface OddsStart {
  pity: number        // pulls since the last 5-star
  guaranteed: boolean // next 5-star is the featured/chosen item
}

/**
 * Probability of getting at least `copies` featured items within `pulls` pulls.
 * Exact dynamic programme over (pity, guaranteed, copies obtained).
 */
export function chanceOfSuccess(odds: BannerOdds, start: OddsStart, pulls: number, copies = 1): number {
  const want = Math.max(1, Math.floor(copies))
  const n = Math.max(0, Math.floor(pulls))
  const hard = Math.max(1, Math.floor(odds.hardPity))
  // Every copy needs at most two 5-stars, each within hard pity.
  if (n >= want * 2 * hard) return 1
  if (n === 0) return 0

  // dist[(c * 2 + g) * hard + k] = probability of having c copies, guaranteed g,
  // and k pulls since the last 5-star, without having succeeded yet.
  const size = want * 2 * hard
  let dist = new Float64Array(size)
  let next = new Float64Array(size)
  const idx = (c: number, g: number, k: number) => (c * 2 + g) * hard + k
  dist[idx(0, start.guaranteed ? 1 : 0, Math.min(Math.max(0, Math.floor(start.pity)), hard - 1))] = 1

  let success = 0
  for (let pull = 0; pull < n; pull++) {
    next.fill(0)
    for (let c = 0; c < want; c++) {
      for (let g = 0; g < 2; g++) {
        for (let k = 0; k < hard; k++) {
          const p = dist[idx(c, g, k)]
          if (p === 0) continue
          const rate = fiveStarRate(odds, k + 1)
          const win = g === 1 ? 1 : odds.featuredChance
          // Featured 5-star
          const hit = p * rate * win
          if (c + 1 >= want) success += hit
          else next[idx(c + 1, 0, 0)] += hit
          // Off-target 5-star: next one is guaranteed
          next[idx(c, 1, 0)] += p * rate * (1 - win)
          // No 5-star
          if (rate < 1) next[idx(c, g, k + 1)] += p * (1 - rate)
        }
      }
    }
    ;[dist, next] = [next, dist]
  }
  // Snap floating-point dust so a certain outcome reads as 100%, not ">99%".
  if (success > 1 - 1e-9) return 1
  return Math.max(0, success)
}

export function formatChance(p: number): string {
  if (p >= 0.995 && p < 1) return '>99%'
  if (p > 0 && p < 0.01) return '<1%'
  return `${Math.round(p * 100)}%`
}
