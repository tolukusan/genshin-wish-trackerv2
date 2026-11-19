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
    // Stop a can only afford the next 5-star; worst case it is off-target and earns a Fate Point.
    expect(r[0].actualSpend).toBe(80)
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

  it('reports a chance of success for every stop', () => {
    const chain = [stop('a', 'p73', 1, 'character')]
    const none = runChain({ player, config, patches, chain, today })[0]
    const lots = runChain({ player: rich, config, patches, chain, today })[0]
    expect(none.successChance).toBeGreaterThan(0)
    expect(none.successChance).toBeLessThan(1)
    expect(lots.successChance).toBe(1)
  })
})
