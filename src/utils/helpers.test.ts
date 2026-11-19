import { describe, expect, it } from 'vitest'
import { isSelectableBanner } from './banners'
import { hasEnteredResources } from './player'
import { GUIDE, guideTopic } from '@/content/guide'
import { player } from '@/test/fixtures'

describe('isSelectableBanner', () => {
  const today = new Date('2026-11-19T15:00:00')
  it('hides banners that have ended, keeps running and upcoming ones', () => {
    expect(isSelectableBanner('2026-06-10', false, today)).toBe(false)
    expect(isSelectableBanner('2026-11-19', false, today)).toBe(false)
    expect(isSelectableBanner('2026-11-25', false, today)).toBe(true)
  })
  it('always keeps the currently selected banner', () => {
    expect(isSelectableBanner('2026-06-10', true, today)).toBe(true)
  })
})

describe('hasEnteredResources', () => {
  it('is false for a fresh player and true once anything is entered', () => {
    expect(hasEnteredResources(player)).toBe(false)
    expect(hasEnteredResources({ ...player, primogems: 160 })).toBe(true)
    expect(hasEnteredResources({ ...player, weaponBannerPity: 3 })).toBe(true)
    expect(hasEnteredResources({ ...player, battlePassMode: 'free' })).toBe(true)
  })
})

describe('guide content', () => {
  it('has unique ids and a summary and body for every topic', () => {
    const ids = GUIDE.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of GUIDE) {
      expect(t.summary.length).toBeGreaterThan(20)
      expect(t.body.length).toBeGreaterThan(0)
      expect(guideTopic(t.id)).toBe(t)
    }
  })
})
