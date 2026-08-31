// ── Player State ──────────────────────────────────────────────────────────────

export interface PlayerState {
  primogems: number
  intertwinedFates: number
  acquaintFates: number
  starglitter: number
  stardust: number
  genesisCrystals: number
  characterBannerPity: number
  characterBanner4Pity: number
  characterBannerGuaranteed: boolean
  weaponBannerPity: number
  weaponBannerFatePoints: number
  standardBannerPity: number
  chronicleBannerPity: number
  chronicleBannerGuaranteed: boolean
  welkinActive: boolean
  welkinDaysRemaining: number
  battlePassMode: 'off' | 'free' | 'paid'
}

// ── Patches & reward drivers ─────────────────────────────────────────────────

export type PatchType = 'standard' | 'sub-area' | 'new-region'
export type PatchModifier = 'anniversary' | 'lantern-rite'

// ── Config (all user-editable per issues2.md) ────────────────────────────────

export interface RecurringConfig {
  dailyCommissions: number       // primos/day
  welkinDaily: number            // primos/day
  spiralAbyssMax: number         // primos per reset (resets on 16th)
  imaginariumTheatreMax: number  // primos per reset (resets on 1st)
  stygianOnslaughtMax: number    // primos per reset (patch_start + 7)
  monthlyShopIntertwined: number // fates per monthly reset (1st)
  battlePassPaidPrimos: number   // primos per cycle (paid)
  battlePassPaidFates: number    // fates per cycle (paid)
  trialPrimosPerPhase: number    // primos per phase (2 trials × 20)
  bannerDurationDays: number     // days from phase start to phase end (default 20)
  patchLengthDays: number        // days per patch
  phase2OffsetDays: number       // days from phase 1 start to phase 2
  patchAnchorVersion: string     // e.g. "6.6"
  patchAnchorDate: string        // ISO date
  primoPerFate: number           // always 160
  starglitterPerFate: number     // starglitter needed per fate
  maintenancePrimos: number      // patch maintenance reward, applied to every patch
  livestreamPrimos: number       // livestream code reward, applied to every patch
  patchTypeRewards: Record<PatchType, number> // base EVENT-ONLY reward by content type (primos), used by Next Character
  patchModifierRewards: Record<PatchModifier, number> // additive EVENT-ONLY bonus by special patch modifier (primos)
  patchTypeTotalWishes: Record<PatchType, number> // base ALL-INCLUSIVE wishes by content type, used by Roadmap
  patchModifierTotalWishes: Record<PatchModifier, number> // additive ALL-INCLUSIVE wish bonus by special patch modifier
}

// Income sources a projection view can independently toggle on/off.
export interface IncomeToggles {
  commissionsIncluded: boolean
  welkinIncluded: boolean
  spiralAbyssEnabled: boolean
  imaginariumTheatreEnabled: boolean
  stygianOnslaughtEnabled: boolean
  characterTrialsEnabled: boolean
  battlePassIncluded: boolean
  monthlyShopIncluded: boolean
}

export interface ProjectionConfig extends IncomeToggles {
  recurring: RecurringConfig
  maintenanceIncluded: boolean
  livestreamIncluded: boolean
  softPityCharacter: number
  hardPityCharacter: number
  softPityChronicle: number
  hardPityChronicle: number
  softPityWeapon: number
  hardPityWeapon: number
  strictGuarantee: boolean
}

// ── Patches & Banners ─────────────────────────────────────────────────────────

export interface BannerPhase {
  id: string
  phase: 1 | 2
  startDate: string
  endDate: string
  featuredCharacters: string[]
  notes?: string
}

export interface Patch {
  id: string
  version: string
  startDate: string
  endDate: string
  patchType: PatchType
  modifiers: PatchModifier[]
  phases: BannerPhase[]
}

// ── Target ────────────────────────────────────────────────────────────────────

export interface Target {
  patchId: string
  phase: 1 | 2
  label: string
  pullsNeeded: number
  copies: number // how many copies/constellations of this character are wanted (1 = C0)
}

// ── Forecast ──────────────────────────────────────────────────────────────────

export interface ForecastSnapshot {
  cutoffDate: string
  daysToTarget: number
  totalPrimos: number
  totalPulls: number
  breakdown: BreakdownItem[]
}

export interface ForecastResult {
  // Banner start (phase start date)
  atStart: ForecastSnapshot
  // Banner end (phase start + bannerDurationDays)
  atEnd: ForecastSnapshot
  // Incremental income earned during the banner window (start → end), current resources excluded
  deltaAtEnd: ForecastSnapshot
  // Shared pity info
  pityAtTarget: number
  guaranteedAtTarget: boolean
  // Pulls needed to reach hard pity (guarantees *a* 5-star, not necessarily this character)
  pullsToPity: number
  pullsNeeded: number
  // Worst case: pulls needed to guarantee THIS character (doubles if on 50/50, since you might lose it)
  pullsForGuarantee: number
  canGuaranteeAtStart: boolean
  canGuaranteeAtEnd: boolean
  // Pulls needed to reach soft pity (where 5-star drop rate starts climbing)
  pullsToSoftPity: number
  // Same as pullsForGuarantee, but using soft pity instead of hard pity as the per-copy cost
  pullsForGuaranteeSoftPity: number
  canGuaranteeAtStartSoftPity: boolean
  canGuaranteeAtEndSoftPity: boolean
}

export interface BreakdownItem {
  source: string
  primogems: number
  fates: number
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

export interface Scenario {
  id: string
  name: string
  pullsSpent: number
  pityAfter: number
  guaranteedAfter: boolean
  notes?: string
}

// ── Chain Planner ─────────────────────────────────────────────────────────────

export interface ChainStop {
  id: string
  patchId: string
  phase: 1 | 2
  label: string
  pullsToSpend: number
}

export interface ChainStopResult {
  stop: ChainStop
  patchVersion: string
  phaseDate: string
  phaseEndDate: string
  daysToStop: number
  daysToEnd: number
  pullsToSpend: number      // user-set planned spend cap
  guaranteed: boolean       // featured 5-star guarantee state before this stop, using hard-pity simulation
  guaranteedRealistic: boolean // same state using the soft-pity simulation
  pityBefore: number        // character-banner pity entering this stop in hard-pity simulation
  pityBeforeRealistic: number // character-banner pity entering this stop in soft-pity simulation
  pullsToNextFiveStar: number // worst-case pulls from this stop to the next 5-star
  pullsToGuaranteeFeatured: number // worst-case pulls from this stop to guarantee the featured character
  pullsToSoftPity: number
  pullsToGuaranteeFeaturedSoft: number
  availableAtStart: number  // pulls on hand when banner opens (after prior spending)
  availableAtEnd: number    // pulls on hand at banner end (after prior spending)
  actualSpend: number       // pullsToSpend if affordable, else 0 (roll-over)
  canAfford: boolean        // availableAtEnd >= pullsToSpend
  remainingAfter: number    // availableAtEnd - actualSpend (always >= 0)
}

// ── Nav ───────────────────────────────────────────────────────────────────────

export type NavTab = 'next-character' | 'data-entry' | 'patches' | 'roadmap' | 'settings'