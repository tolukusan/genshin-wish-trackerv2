// Shared test fixtures: default config/player and a fixed patch schedule.
import type { ChainStop, Patch, PlayerState, ProjectionConfig, WishBannerType } from '@/types'

export const config: ProjectionConfig = {
  recurring: {
    dailyCommissions: 60, welkinDaily: 90, spiralAbyssMax: 800, imaginariumTheatreMax: 1000,
    stygianOnslaughtMax: 450, monthlyShopIntertwined: 5,
    trialPrimosPerPhase: 40, bannerDurationDays: 20, patchLengthDays: 42, phase2OffsetDays: 21,
    patchAnchorVersion: '7.2', patchAnchorDate: '2026-11-04', starglitterRefundPercent: 10,
    maintenancePrimos: 600, livestreamPrimos: 300,
    patchTypeRewards: { standard: 3052, 'sub-area': 4812, 'new-region': 9670 },
    patchModifierRewards: { anniversary: 3200, 'lantern-rite': 6768 },
    patchTypeTotalWishes: { standard: 67, 'sub-area': 78, 'new-region': 102 },
    patchModifierTotalWishes: { anniversary: 24, 'lantern-rite': 20 },
  },
  commissionsIncluded: true, welkinIncluded: false, spiralAbyssEnabled: true,
  imaginariumTheatreEnabled: true, stygianOnslaughtEnabled: true, characterTrialsEnabled: true,
  battlePassIncluded: true, monthlyShopIncluded: true, maintenanceIncluded: true, livestreamIncluded: true,

  fiftyFiftyWinPercent: 50, starglitterRefundIncluded: false,
}

export const player: PlayerState = {
  primogems: 0, intertwinedFates: 0, acquaintFates: 0, starglitter: 0, stardust: 0, genesisCrystals: 0,
  characterBannerPity: 0, characterBanner4Pity: 0, characterBannerGuaranteed: false,
  weaponBannerPity: 0, weaponBannerFatePoints: 0, standardBannerPity: 0,
  chronicleBannerPity: 0, chronicleBannerFatePoints: 0,
  welkinActive: false, welkinDaysRemaining: 0, battlePassMode: 'off',
}

function patch(id: string, version: string, start: string, p2: string, end: string): Patch {
  return {
    id, version, startDate: start, endDate: end, patchType: 'standard', modifiers: [],
    phases: [
      { id: `${id}a`, phase: 1, startDate: start, endDate: p2, featuredCharacters: [''] },
      { id: `${id}b`, phase: 2, startDate: p2, endDate: end, featuredCharacters: [''] },
    ],
  }
}

export const patches: Patch[] = [
  patch('p72', '7.2', '2026-11-04', '2026-11-25', '2026-12-16'),
  patch('p73', '7.3', '2026-12-16', '2027-01-06', '2027-01-27'),
  patch('p74', '7.4', '2027-01-27', '2027-02-17', '2027-03-10'),
  patch('p75', '7.5', '2027-03-10', '2027-03-31', '2027-04-21'),
]

export function stop(id: string, patchId: string, phase: 1 | 2, bannerType: WishBannerType, copies = 1): ChainStop {
  return { id, patchId, phase, label: '', bannerType, copies }
}
