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
  defaultEventCount: number      // number of default events pre-added to each patch
  defaultEventPrimos: number     // primos per default event
  defaultEventPhase2Count: number // how many of the default events fall in Phase 2
  bannerDurationDays: number     // days from phase start to phase end (default 20)
  patchLengthDays: number        // days per patch
  phase2OffsetDays: number       // days from phase 1 start to phase 2
  patchAnchorVersion: string     // e.g. "6.6"
  patchAnchorDate: string        // ISO date
  primoPerFate: number           // always 160
  starglitterPerFate: number     // starglitter needed per fate
}

export interface ProjectionConfig {
  recurring: RecurringConfig
  commissionsIncluded: boolean
  welkinIncluded: boolean
  spiralAbyssEnabled: boolean
  imaginariumTheatreEnabled: boolean
  stygianOnslaughtEnabled: boolean
  characterTrialsEnabled: boolean
  battlePassIncluded: boolean
  monthlyShopIncluded: boolean
  softPityCharacter: number
  hardPityCharacter: number
  softPityChronicle: number
  hardPityChronicle: number
  softPityWeapon: number
  hardPityWeapon: number
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

export type PatchType = 'standard' | 'sub-area' | 'lantern-rite' | 'new-region'

export interface Patch {
  id: string
  version: string
  startDate: string
  endDate: string
  patchType: PatchType
  phases: BannerPhase[]
  events: PatchEvent[]
  maintenancePrimos: number     // patch maintenance reward (editable per patch)
  livestreamPrimos: number      // livestream code reward (editable per patch)
  maintenanceEnabled: boolean
  livestreamEnabled: boolean
}

export interface PatchEvent {
  id: string
  name: string
  primogems: number
  fates?: number
  phase?: 1 | 2   // which phase the event becomes available; defaults to 1
  enabled: boolean
  notes?: string
}

// ── Target ────────────────────────────────────────────────────────────────────

export interface Target {
  patchId: string
  phase: 1 | 2
  label: string
  pullsNeeded: number
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
  // Shared pity info
  pityAtTarget: number
  guaranteedAtTarget: boolean
  pullsToPity: number
  pullsNeeded: number
  canGuaranteeAtStart: boolean
  canGuaranteeAtEnd: boolean
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
  pullsToSpend: number      // user-set; pity carry applied internally to determine canAfford threshold
  guaranteed: boolean       // guarantee status at this stop (carries and flips on each successful spend)
  availableAtStart: number  // pulls on hand when banner opens (after prior spending)
  availableAtEnd: number    // pulls on hand at banner end (after prior spending)
  actualSpend: number       // pullsToSpend if affordable, else 0 (roll-over)
  canAfford: boolean        // availableAtEnd >= pullsToSpend
  remainingAfter: number    // availableAtEnd - actualSpend (always >= 0)
}

// ── Nav ───────────────────────────────────────────────────────────────────────

export type NavTab = 'dashboard' | 'patches' | 'forecast' | 'scenarios' | 'settings'
