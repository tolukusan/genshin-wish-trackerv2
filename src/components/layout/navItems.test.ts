import { describe, expect, it } from 'vitest'
import { primaryTabFor, resolveNav } from './navItems'

describe('navigation', () => {
  it('shows the Plan for the removed single-banner forecast page', () => {
    expect(resolveNav('next-character')).toBe('roadmap')
    expect(primaryTabFor('next-character')).toBe('roadmap')
  })

  it('lights Plan and Wallet for themselves and More for everything else', () => {
    expect(primaryTabFor('roadmap')).toBe('roadmap')
    expect(primaryTabFor('data-entry')).toBe('data-entry')
    for (const page of ['more', 'patches', 'settings', 'guide'] as const) expect(primaryTabFor(page)).toBe('more')
  })
})
