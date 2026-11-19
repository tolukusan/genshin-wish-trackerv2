// Fixed Genshin Impact rules. These are not user settings: changing them would
// silently break worst-case numbers and the odds model (which is calibrated to
// these values). Estimates that players can reasonably disagree on (income,
// patch content, 50/50 win rate) stay in ProjectionConfig instead.

import type { WishBannerType } from '@/types'

export const GAME_RULES = {
  /** 5★ is guaranteed on this pull number since the last 5★. */
  hardPity: { character: 90, weapon: 80, chronicled: 90 } satisfies Record<WishBannerType, number>,
  /** First pull with a raised 5★ rate (community-derived soft-pity model). */
  softPity: { character: 74, weapon: 63, chronicled: 74 } satisfies Record<WishBannerType, number>,
  primogemsPerFate: 160,
  starglitterPerFate: 5,
  battlePassPaid: { primogems: 680, fates: 4 },
} as const
