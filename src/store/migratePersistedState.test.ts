import { describe, expect, it } from 'vitest'
import { migratePersistedState } from './usePlannerStore'

describe('migratePersistedState', () => {
  it('upgrades legacy patch types, modifiers, nav and rewards', () => {
    const out = migratePersistedState({
      nav: 'scenarios',
      config: {
        recurring: { patchTypeRewards: { standard: 3052, 'sub-area': 4812, 'new-region': 12140, 'lantern-rite': 9052 } },
      },
      patches: [
        { id: 'a', version: '7.1', startDate: '2026-09-30', endDate: '2026-11-11', patchType: 'standard', phases: [] },
        { id: 'b', version: '7.4', startDate: '2027-01-27', endDate: '2027-03-10', patchType: 'lantern-rite', phases: [] },
      ],
    })
    expect(out.nav).toBe('roadmap')
    expect(out.patches[0].modifiers).toEqual(['anniversary'])
    expect(out.patches[1]).toMatchObject({ patchType: 'standard', modifiers: ['lantern-rite'] })
    expect(out.config.recurring.patchTypeRewards['new-region']).toBe(9670)
    expect(out.config.recurring.patchModifierRewards['lantern-rite']).toBe(6000)
  })

  it('folds the old chronicled "guaranteed" flag into the Fate Point', () => {
    const on = migratePersistedState({ player: { chronicleBannerGuaranteed: true, chronicleBannerFatePoints: 0 } })
    expect(on.player.chronicleBannerFatePoints).toBe(1)
    expect('chronicleBannerGuaranteed' in on.player).toBe(false)

    const off = migratePersistedState({ player: { chronicleBannerGuaranteed: false, chronicleBannerFatePoints: 0 } })
    expect(off.player.chronicleBannerFatePoints).toBe(0)

    const kept = migratePersistedState({ player: { chronicleBannerFatePoints: 1 } })
    expect(kept.player.chronicleBannerFatePoints).toBe(1)
  })

  it('moves the old sub-area default (78) to 84 but keeps custom values', () => {
    const old = migratePersistedState({ config: { recurring: { patchTypeTotalWishes: { standard: 67, 'sub-area': 78, 'new-region': 102 } } } })
    expect(old.config.recurring.patchTypeTotalWishes['sub-area']).toBe(84)
    const custom = migratePersistedState({ config: { recurring: { patchTypeTotalWishes: { standard: 67, 'sub-area': 90, 'new-region': 102 } } } })
    expect(custom.config.recurring.patchTypeTotalWishes['sub-area']).toBe(90)
  })

  it('fills in new settings for older saves without overriding saved ones', () => {
    const out = migratePersistedState({ config: { fiftyFiftyWinPercent: 59, recurring: {} } })
    expect(out.config.fiftyFiftyWinPercent).toBe(59)
    expect(out.config.starglitterRefundIncluded).toBe(false)
    expect(out.config.recurring.starglitterRefundPercent).toBe(10)
  })

  it('moves the old trial default (20/phase) to 40 but keeps custom values', () => {
    expect(migratePersistedState({ config: { recurring: { trialPrimosPerPhase: 20 } } }).config.recurring.trialPrimosPerPhase).toBe(40)
    expect(migratePersistedState({ config: { recurring: { trialPrimosPerPhase: 30 } } }).config.recurring.trialPrimosPerPhase).toBe(30)
    expect(migratePersistedState({ config: { recurring: {} } }).config.recurring.trialPrimosPerPhase).toBe(40)
  })

  it('drops settings that became fixed game rules (custom pity, strict guarantee, currency rates)', () => {
    const out = migratePersistedState({
      config: {
        strictGuarantee: false, softPityCharacter: 80, hardPityCharacter: 85, softPityWeapon: 70,
        hardPityWeapon: 80, softPityChronicle: 80, hardPityChronicle: 90, commissionsIncluded: false,
        recurring: { primoPerFate: 150, starglitterPerFate: 4, battlePassPaidPrimos: 700, battlePassPaidFates: 5, dailyCommissions: 55 },
      },
    })
    const config = out.config as unknown as Record<string, unknown>
    const recurring = out.config.recurring as unknown as Record<string, unknown>
    for (const key of ['strictGuarantee', 'softPityCharacter', 'hardPityCharacter', 'softPityWeapon', 'hardPityWeapon', 'softPityChronicle', 'hardPityChronicle']) {
      expect(key in config).toBe(false)
    }
    for (const key of ['primoPerFate', 'starglitterPerFate', 'battlePassPaidPrimos', 'battlePassPaidFates']) {
      expect(key in recurring).toBe(false)
    }
    // Real preferences survive.
    expect(out.config.commissionsIncluded).toBe(false)
    expect(out.config.recurring.dailyCommissions).toBe(55)
  })

  it('passes through non-object input unchanged', () => {
    expect(migratePersistedState(null)).toBe(null)
    expect(migratePersistedState('x')).toBe('x')
  })
})
