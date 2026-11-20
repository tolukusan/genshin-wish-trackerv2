import { describe, expect, it } from 'vitest'
import { runChain, runProjection } from './projectionEngine'
import { config, patches, player, stop } from '@/test/fixtures'

const target = { patchId: 'p73', phase: 1 as const, label: '', pullsNeeded: 0, copies: 1 }

describe('runProjection', () => {
  it('gives the same answer at any time of day', () => {
    const results = ['2026-12-01T00:00:00', '2026-12-01T09:00:00', '2026-12-01T23:59:00'].map((t) =>
      runProjection({ player, config, patches, target, today: new Date(t) }),
    )
    for (const r of results) {
      expect(r.atStart.daysToTarget).toBe(15)
      expect(r.atStart.totalPulls).toBe(results[0].atStart.totalPulls)
      expect(r.atEnd.totalPulls).toBe(results[0].atEnd.totalPulls)
    }
  })

  it('counts the Spiral Abyss reset on the banner start day (Dec 16)', () => {
    const r = runProjection({ player, config, patches, target, today: new Date('2026-12-01T09:00:00') })
    const abyss = r.atStart.breakdown.find((b) => b.source.startsWith('Spiral Abyss'))
    expect(abyss?.source).toBe('Spiral Abyss (1×)')
    const commissions = r.atStart.breakdown.find((b) => b.source === 'Daily Commissions')
    expect(commissions?.primogems).toBe(15 * 60)
  })

  it('adds starglitter refunds only when enabled', () => {
    const today = new Date('2026-12-01')
    const off = runProjection({ player, config, patches, target, today })
    const on = runProjection({ player, config: { ...config, starglitterRefundIncluded: true }, patches, target, today })
    expect(off.atEnd.breakdown.some((b) => b.source.startsWith('Starglitter refunds'))).toBe(false)
    expect(on.atEnd.totalPulls).toBe(off.atEnd.totalPulls + Math.floor(off.atEnd.totalPulls * 0.1))
    expect(on.atEnd.breakdown.find((b) => b.source.startsWith('Starglitter refunds'))?.source)
      .toBe('Starglitter refunds (est. 10%)')
  })

  it('costs a fresh 50/50 at two hard pities under strict guarantee', () => {
    const r = runProjection({ player, config, patches, target, today: new Date('2026-12-01') })
    expect(r.pullsToPity).toBe(90)
    expect(r.pullsForGuarantee).toBe(180)
    const guaranteed = runProjection({
      player: { ...player, characterBannerGuaranteed: true, characterBannerPity: 30 },
      config, patches, target, today: new Date('2026-12-01'),
    })
    expect(guaranteed.pullsForGuarantee).toBe(60)
  })
})

describe('runChain', () => {
  const today = new Date('2026-12-01T09:00:00')
  const rich = { ...player, intertwinedFates: 1000 }

  it('alternates the character guarantee across stops', () => {
    const chain = ['p73', 'p74', 'p75'].map((p, i) => stop(`s${i}`, p, 1, 'character'))
    const r = runChain({ player: { ...rich, characterBannerGuaranteed: true }, config, patches, chain, today })
    expect(r.map((x) => x.actualSpend)).toEqual([90, 180, 180])
    expect(r.map((x) => x.guaranteedAfter)).toEqual([false, false, false])
  })

  it('consumes a chronicled Fate Point instead of keeping it forever', () => {
    // Player holds a Fate Point for the chronicled banner running today (v7.2 P2).
    const chain = [stop('a', 'p72', 2, 'chronicled'), stop('b', 'p72', 2, 'chronicled')]
    const r = runChain({ player: { ...rich, chronicleBannerFatePoints: 1 }, config, patches, chain, today })
    expect(r[0].fatePointsBefore).toBe(1)
    expect(r[0].actualSpend).toBe(90)
    expect(r[1].fatePointsBefore).toBe(0)
    expect(r[1].actualSpend).toBe(180)
  })

  it('expires chronicled Fate Points when the Chronicled Wish ends', () => {
    // A Fate Point held today does not carry into a later patch's Chronicled Wish.
    const chain = [stop('a', 'p74', 1, 'chronicled')]
    const r = runChain({ player: { ...rich, chronicleBannerFatePoints: 1 }, config, patches, chain, today })
    expect(r[0].fatePointsBefore).toBe(0)
    expect(r[0].actualSpend).toBe(180)
  })

  it('keeps a Fate Point earned earlier in the same Chronicled Wish, and keeps pity across events', () => {
    const chain = [
      stop('a', 'p74', 1, 'chronicled'),
      stop('b', 'p74', 1, 'chronicled'),
      stop('c', 'p75', 1, 'chronicled'),
    ]
    const r = runChain({ player: { ...player, chronicleBannerPity: 10 }, config, patches, chain, today })
    // Stop a reaches the next 5-star (80 pulls) but not the 170-pull guarantee, so it
    // goes all-in; worst case that 5-star is off-target and earns a Fate Point.
    expect(r[0].availableAtEnd).toBeGreaterThanOrEqual(80)
    expect(r[0].availableAtEnd).toBeLessThan(170)
    expect(r[0].actualSpend).toBe(r[0].availableAtEnd)
    expect(r[0].fatePointsAfter).toBe(1)
    // Stop b: same event, so the Fate Point still applies.
    expect(r[1].fatePointsBefore).toBe(1)
    // Stop c: next event, Fate Point expired but pity carries.
    expect(r[2].fatePointsBefore).toBe(0)
    expect(r[2].pityBefore).toBe(r[1].pityAfter)
  })

  it('weapon: a lost 5-star earns a Fate Point that secures the next one', () => {
    const chain = [stop('a', 'p73', 1, 'weapon', 2)]
    const r = runChain({ player: rich, config, patches, chain, today })
    // 2 copies worst case: lose, win, lose, win = 4 × 80.
    expect(r[0].actualSpend).toBe(320)
    expect(r[0].fatePointsAfter).toBe(0)
  })

  it('goes all-in up to the guarantee and never spends more than it has', () => {
    const chain = [stop('a', 'p73', 1, 'character')]
    const [poor] = runChain({ player, config, patches, chain, today })
    expect(poor.availableAtEnd).toBeLessThan(poor.pullsForGuarantee)
    expect(poor.actualSpend).toBe(poor.availableAtEnd)
    expect(poor.remainingAfter).toBe(0)
    const [lots] = runChain({ player: rich, config, patches, chain, today })
    expect(lots.actualSpend).toBe(lots.pullsForGuarantee)
  })

  it('subtracts an all-in spend even when it cannot reach a 5-star', () => {
    const chain = [stop('a', 'p73', 1, 'character'), stop('b', 'p73', 1, 'weapon')]
    const [first, second] = runChain({ player, config, patches, chain, today })
    expect(first.canAfford).toBe(false)
    expect(first.actualSpend).toBe(first.availableAtEnd)
    expect(second.availableAtEnd).toBe(0)
    expect(second.actualSpend).toBe(0)
    // Pity still rises by the pulls spent, with no 5-star in the worst case.
    expect(first.pityAfter).toBe(first.actualSpend)
  })

  it('does not let two banners on the same phase count the same pulls', () => {
    const some = { ...player, intertwinedFates: 60 }
    const chain = [stop('a', 'p73', 1, 'character'), stop('b', 'p73', 1, 'weapon')]
    const [first, second] = runChain({ player: some, config, patches, chain, today })
    expect(second.availableAtEnd).toBe(first.availableAtEnd - first.actualSpend)
    expect(first.actualSpend + second.actualSpend).toBeLessThanOrEqual(first.availableAtEnd)
    // The weapon only sees what the character banner left, so its chance is lower than if it were alone.
    const [alone] = runChain({ player: some, config, patches, chain: [stop('b', 'p73', 1, 'weapon')], today })
    expect(second.successChance).toBeLessThan(alone.successChance)
  })

  it('reports a chance of success for every stop', () => {
    const chain = [stop('a', 'p73', 1, 'character')]
    const none = runChain({ player, config, patches, chain, today })[0]
    const lots = runChain({ player: rich, config, patches, chain, today })[0]
    expect(none.successChance).toBeGreaterThan(0)
    expect(none.successChance).toBeLessThan(1)
    expect(lots.successChance).toBe(1)
  })
})
