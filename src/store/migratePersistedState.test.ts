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
    const out = migratePersistedState({ config: { strictGuarantee: false, recurring: {} } })
    expect(out.config.fiftyFiftyWinPercent).toBe(55)
    expect(out.config.starglitterRefundIncluded).toBe(false)
    expect(out.config.recurring.starglitterRefundPercent).toBe(10)
    expect(out.config.strictGuarantee).toBe(false)
  })

  it('passes through non-object input unchanged', () => {
    expect(migratePersistedState(null)).toBe(null)
    expect(migratePersistedState('x')).toBe('x')
  })
})
