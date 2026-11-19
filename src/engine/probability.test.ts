import { describe, expect, it } from 'vitest'
import { bannerOdds, chanceOfSuccess, fiveStarRate, formatChance } from './probability'
import { config } from '@/test/fixtures'

const character = bannerOdds(config, 'character')
const weapon = bannerOdds(config, 'weapon')
const fresh = { pity: 0, guaranteed: false }

// Expected pulls per 5-star, from the per-pull rate curve.
function expectedPullsPerFiveStar(odds: ReturnType<typeof bannerOdds>): number {
  let survive = 1
  let expected = 0
  for (let n = 1; n <= odds.hardPity; n++) {
    const rate = fiveStarRate(odds, n)
    expected += n * survive * rate
    survive *= 1 - rate
  }
  return expected
}

describe('fiveStarRate', () => {
  it('follows base rate, soft pity ramp and hard pity', () => {
    expect(fiveStarRate(character, 1)).toBeCloseTo(0.006)
    expect(fiveStarRate(character, 73)).toBeCloseTo(0.006)
    expect(fiveStarRate(character, 74)).toBeCloseTo(0.066)
    expect(fiveStarRate(character, 90)).toBe(1)
    expect(fiveStarRate(weapon, 63)).toBeCloseTo(0.077)
    expect(fiveStarRate(weapon, 80)).toBe(1)
  })

  it('matches the published consolidated 5-star rates (~1.6% character, ~1.85% weapon)', () => {
    expect(1 / expectedPullsPerFiveStar(character)).toBeCloseTo(0.016, 3)
    expect(1 / expectedPullsPerFiveStar(weapon)).toBeCloseTo(0.0185, 3)
  })
})

describe('chanceOfSuccess', () => {
  it('is 0 with no pulls and 1 at the worst-case guarantee', () => {
    expect(chanceOfSuccess(character, fresh, 0)).toBe(0)
    expect(chanceOfSuccess(character, fresh, 180)).toBe(1)
    expect(chanceOfSuccess(character, { pity: 0, guaranteed: true }, 90)).toBe(1)
    expect(chanceOfSuccess(character, fresh, 180 * 2, 2)).toBe(1)
  })

  it('grows with more pulls and shrinks with more copies', () => {
    const a = chanceOfSuccess(character, fresh, 60)
    const b = chanceOfSuccess(character, fresh, 120)
    expect(b).toBeGreaterThan(a)
    expect(chanceOfSuccess(character, fresh, 120, 2)).toBeLessThan(b)
  })

  it('is about 50% at hard pity on a 50/50 from zero pity', () => {
    // A 5-star by pull 90 is certain; it is featured half the time, plus a small
    // chance of an early loss followed by an early featured win.
    const p = chanceOfSuccess(character, fresh, 90)
    expect(p).toBeGreaterThan(0.5)
    expect(p).toBeLessThan(0.6)
  })

  it('treats a guarantee as a sure featured 5-star', () => {
    const pity = 70
    const guaranteed = chanceOfSuccess(character, { pity, guaranteed: true }, 20)
    expect(guaranteed).toBe(1)
    expect(chanceOfSuccess(character, { pity, guaranteed: false }, 20)).toBeLessThan(guaranteed)
  })
})

describe('50/50 win rate setting', () => {
  it('raises the character chance but not weapon or chronicled odds', () => {
    const at50 = chanceOfSuccess(bannerOdds(config, 'character'), fresh, 90)
    const at55 = chanceOfSuccess(bannerOdds({ ...config, fiftyFiftyWinPercent: 55 }, 'character'), fresh, 90)
    expect(at55).toBeGreaterThan(at50)
    expect(bannerOdds({ ...config, fiftyFiftyWinPercent: 55 }, 'weapon').featuredChance).toBe(0.375)
    expect(bannerOdds({ ...config, fiftyFiftyWinPercent: 55 }, 'chronicled').featuredChance).toBe(0.5)
  })

  it('clamps out-of-range values and defaults to 55% when missing', () => {
    expect(bannerOdds({ ...config, fiftyFiftyWinPercent: 150 }, 'character').featuredChance).toBe(1)
    const legacy = { ...config } as Partial<typeof config>
    delete legacy.fiftyFiftyWinPercent
    expect(bannerOdds(legacy as typeof config, 'character').featuredChance).toBe(0.55)
  })
})

describe('formatChance', () => {
  it('formats edge cases', () => {
    expect(formatChance(0)).toBe('0%')
    expect(formatChance(0.004)).toBe('<1%')
    expect(formatChance(0.5)).toBe('50%')
    expect(formatChance(0.997)).toBe('>99%')
    expect(formatChance(1)).toBe('100%')
  })
})

describe('chanceCurve', () => {
  it('matches chanceOfSuccess at every point and never decreases', async () => {
    const { chanceCurve } = await import('./probability')
    const curve = chanceCurve(character, fresh, 180)
    expect(curve).toHaveLength(181)
    expect(curve[0]).toBe(0)
    expect(curve[180]).toBe(1)
    for (const n of [1, 30, 74, 90, 120, 179]) {
      expect(curve[n]).toBeCloseTo(chanceOfSuccess(character, fresh, n), 12)
    }
    for (let n = 1; n < curve.length; n++) expect(curve[n]).toBeGreaterThanOrEqual(curve[n - 1])
  })
})
