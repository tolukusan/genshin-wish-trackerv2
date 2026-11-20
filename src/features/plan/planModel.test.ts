import { describe, expect, it } from 'vitest'
import { getRoadmapSnapshot, runChain } from '@/engine/projectionEngine'
import { sortChainByDate } from '@/store/usePlannerStore'
import { config, patches, player, stop } from '@/test/fixtures'
import {
  balanceAt,
  balanceSeries,
  buildPlanGroups,
  currentPulls,
  incomeBuckets,
  patchIncome,
  riverPath,
  riverWidth,
  RIVER_MAX_WIDTH,
  RIVER_MIN_WIDTH,
  typicalPulls,
  bannerName,
  bannerTitle,
  pitySource,
  pullLedger,
  pullsRows,
  worstCaseSteps,
  featuredText,
  bannerTypeLabel,
  spendLine,
  verdictFor,
  MIN_PATCHES_SHOWN,
} from './planModel'

const today = new Date('2026-12-01T09:00:00')
const rich = { ...player, intertwinedFates: 200 }
const snapshotFor = (p = rich) => (iso: string) =>
  getRoadmapSnapshot({ player: p, config, patches, cutoff: iso, today }).totalPulls

describe('verdictFor', () => {
  it('reads Secured when the worst case is covered, whatever the chance', () => {
    expect(verdictFor({ availableAtEnd: 180, pullsForGuarantee: 180, successChance: 0.2 })).toBe('secured')
  })
  it('splits the rest by chance: Very likely ≥ 90%, Likely ≥ 60%, Risky ≥ 30%, otherwise Short', () => {
    const base = { availableAtEnd: 10, pullsForGuarantee: 180 }
    expect(verdictFor({ ...base, successChance: 0.99 })).toBe('very-likely')
    expect(verdictFor({ ...base, successChance: 0.9 })).toBe('very-likely')
    expect(verdictFor({ ...base, successChance: 0.64 })).toBe('likely')
    expect(verdictFor({ ...base, successChance: 0.6 })).toBe('likely')
    expect(verdictFor({ ...base, successChance: 0.48 })).toBe('risky')
    expect(verdictFor({ ...base, successChance: 0.22 })).toBe('short')
    expect(verdictFor({ ...base, successChance: 0 })).toBe('short')
  })
})

describe('currentPulls', () => {
  it('counts primogems + crystals per 160, fates, and starglitter per 5', () => {
    expect(currentPulls({ ...player, primogems: 9600, genesisCrystals: 159, intertwinedFates: 12, starglitter: 11 }))
      .toBe(60 + 12 + 2)
  })
})

describe('runChain guarantee fields', () => {
  it('reports the worst case for a fresh 50/50 and for extra copies', () => {
    const [one, two] = runChain({
      player: rich, config, patches, today,
      chain: [stop('a', 'p73', 1, 'character'), stop('b', 'p75', 1, 'weapon', 2)],
    })
    expect(one.pullsToNextFiveStar).toBe(90)
    expect(one.pullsForGuarantee).toBe(180)
    // Weapon: 80 + 80 for the first, plus 2 × 80 for the second.
    expect(two.pullsForGuarantee).toBe(320)
  })
})

describe('buildPlanGroups', () => {
  it('drops finished phases and attaches results to their phase', () => {
    const results = runChain({ player: rich, config, patches, today, chain: [stop('a', 'p73', 2, 'character')] })
    const groups = buildPlanGroups(patches, results, today)
    // 7.2 phase 1 ended Nov 25, so only its phase 2 is listed.
    expect(groups[0].patch.id).toBe('p72')
    expect(groups[0].phases.map((p) => p.phase.phase)).toEqual([2])
    const p73 = groups.find((g) => g.patch.id === 'p73')!
    expect(p73.phases[1].results.map((r) => r.stop.id)).toEqual(['a'])
    expect(p73.phases[0].results).toEqual([])
  })

  it('shows a minimum number of patches, and reaches the last planned one', () => {
    expect(buildPlanGroups(patches, [], today)).toHaveLength(MIN_PATCHES_SHOWN)
    const results = runChain({ player: rich, config, patches, today, chain: [stop('a', 'p75', 1, 'character')] })
    expect(buildPlanGroups(patches, results, today).at(-1)!.patch.id).toBe('p75')
  })
})

describe('balance over time', () => {
  const chain = [stop('a', 'p73', 1, 'character'), stop('b', 'p74', 1, 'character')]
  const results = runChain({ player: rich, config, patches, today, chain })
  const snapshot = snapshotFor()

  it('matches the chain: the balance at a banner end, before its spend, is what the chain had available', () => {
    const r = results[1]
    expect(balanceAt(r.phaseEndDate, results, snapshot)).toBe(r.availableAtEnd)
  })

  it('steps down by the planned spend at each banner end', () => {
    const series = balanceSeries(results, snapshot, patches, '2027-03-10', today)
    expect(series[0]).toEqual({ date: '2026-12-01', value: snapshot('2026-12-01') })
    const atEnd = series.filter((p) => p.date === results[0].phaseEndDate)
    expect(atEnd).toHaveLength(2)
    expect(atEnd[0].value - atEnd[1].value).toBe(results[0].actualSpend)
    expect(atEnd[1].value).toBe(results[0].remainingAfter)
    // Dates never go backwards.
    expect(series.map((p) => p.date)).toEqual([...series.map((p) => p.date)].sort())
  })

  it('measures a patch’s income without counting the next patch', () => {
    const p73 = patches.find((p) => p.id === 'p73')!
    const income = patchIncome(p73, snapshot, today)
    expect(income).toBe(snapshot('2027-01-26') - snapshot('2026-12-15'))
    expect(income).toBeGreaterThan(0)
  })
})

describe('incomeBuckets', () => {
  it('leaves out the wallet you already hold and groups the rest', () => {
    const buckets = incomeBuckets([
      { source: 'Current Primogems', primogems: 1600, fates: 0 },
      { source: 'Current Intertwined Fates', primogems: 0, fates: 5 },
      { source: 'Current-patch Daily Commissions', primogems: 960, fates: 0 },
      { source: 'Current-patch Spiral Abyss', primogems: 800, fates: 0 },
      { source: 'Patch Estimate + Bonuses (2 phases)', primogems: 0, fates: 67 },
      { source: 'Welkin Moon', primogems: 1600, fates: 0 },
    ])
    expect(buckets).toEqual([
      { label: 'Patch rewards', pulls: 67 },
      { label: 'Rest of this patch', pulls: 11 },
      { label: 'Welkin & Battle Pass', pulls: 10 },
    ])
  })
})

describe('river geometry', () => {
  it('scales width between the minimum and maximum', () => {
    expect(riverWidth(0, 100)).toBe(RIVER_MIN_WIDTH)
    expect(riverWidth(100, 100)).toBe(RIVER_MAX_WIDTH)
    expect(riverWidth(50, 0)).toBe(RIVER_MIN_WIDTH)
    expect(riverWidth(-5, 100)).toBe(RIVER_MIN_WIDTH)
  })

  it('draws a closed path that is widest at the largest balance', () => {
    const d = riverPath([{ y: 0, value: 20 }, { y: 100, value: 100 }, { y: 200, value: 10 }])
    expect(d.startsWith('M')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    // At y=100 the right edge sits at 28 + 48/2 = 52.
    expect(d).toContain('52 100')
    expect(riverPath([])).toBe('')
    expect(riverPath([{ y: 5, value: 3 }])).toMatch(/Z$/)
  })
})

describe('typicalPulls', () => {
  it('is the first pull count at or above one half', () => {
    expect(typicalPulls([0, 0.1, 0.49, 0.5, 0.9])).toBe(3)
    expect(typicalPulls([0, 0.1])).toBeNull()
  })
})

describe('sortChainByDate', () => {
  it('orders by banner start and keeps same-phase stops in their order', () => {
    const chain = [stop('late', 'p74', 1, 'character'), stop('w', 'p73', 1, 'weapon'), stop('c', 'p73', 1, 'character'), stop('gone', 'nope', 1, 'character')]
    expect(sortChainByDate(chain, patches).map((s) => s.id)).toEqual(['w', 'c', 'late', 'gone'])
  })
})

describe('card text', () => {
  it('names the banner kind, with copies for characters and multi-copy plans', () => {
    expect(bannerTypeLabel('character', 1)).toBe('Character ×1')
    expect(bannerTypeLabel('weapon', 1)).toBe('Weapon')
    expect(bannerTypeLabel('chronicled', 2)).toBe('Chronicled ×2')
  })

  it('shows spend and carry when the guarantee is covered, otherwise how far short all-in leaves you', () => {
    const [r] = runChain({ player: rich, config, patches, today, chain: [stop('a', 'p73', 1, 'character')] })
    expect(r.actualSpend).toBe(r.pullsForGuarantee)
    expect(spendLine(r)).toBe(`Spend ${r.actualSpend} · carry ≈ ${r.remainingAfter} · pity ${r.pityAfter} after`)
    const [poor] = runChain({ player, config, patches, today, chain: [stop('a', 'p73', 1, 'character')] })
    expect(spendLine(poor)).toBe(`All ${poor.actualSpend} in · carry 0 · pity ${poor.pityAfter} after`)
    // A second banner on the same phase gets nothing once the first has gone all-in.
    const [, broke] = runChain({ player, config, patches, today, chain: [stop('a', 'p73', 1, 'character'), stop('b', 'p73', 1, 'weapon')] })
    expect(broke.actualSpend).toBe(0)
    expect(spendLine(broke)).toBe(`No pulls left · carry 0 · pity ${broke.pityAfter} after`)
  })

  it('titles banners by version and phase, with dates on the start and end rows', () => {
    const [r] = runChain({ player: rich, config, patches, today, chain: [stop('a', 'p73', 1, 'character')] })
    expect(bannerTitle(r, true)).toBe('v7.3 Phase 1')
    expect(bannerTitle(r, false)).toBe('Phase 1')
    expect(pullsRows(r, today).start.label).toBe('Start · Dec 16')
    expect(pullsRows(r, today).end.label).toBe('End · Jan 5')
    expect(pullsRows(r, new Date('2026-12-20')).start.label).toBe('Now')
  })
})

describe('featured names', () => {
  const named = patches.map((p) => p.id !== 'p73' ? p : {
    ...p,
    phases: p.phases.map((ph) => ph.phase === 1 ? { ...ph, featuredCharacters: [' Tsaritsa ', '', 'Nicole'] } : ph),
  })

  it('joins the names typed in Settings and skips blanks', () => {
    expect(featuredText([' Mitya ', '', 'Linnea'])).toBe('Mitya, Linnea')
    expect(featuredText([''])).toBe('')
    expect(featuredText(undefined)).toBe('')
  })

  it('carries the phase names onto the result and uses them as the banner name', () => {
    const [r] = runChain({ player, config, patches: named, today, chain: [stop('a', 'p73', 1, 'character')] })
    expect(r.featured).toEqual(['Tsaritsa', 'Nicole'])
    expect(bannerName(r)).toBe('Tsaritsa, Nicole')
  })

  it('prefers your own banner name, but not an old auto-filled "v7.3 Phase 1"', () => {
    const [r] = runChain({ player, config, patches: named, today, chain: [{ ...stop('a', 'p73', 1, 'character'), label: 'Skirk rerun' }] })
    expect(bannerName(r)).toBe('Skirk rerun')
    const [old] = runChain({ player, config, patches: named, today, chain: [{ ...stop('a', 'p73', 1, 'character'), label: 'v7.3 Phase 1' }] })
    expect(bannerName(old)).toBe('Tsaritsa, Nicole')
  })

  it('has no name when nothing was typed', () => {
    const [r] = runChain({ player, config, patches, today, chain: [stop('a', 'p73', 1, 'character')] })
    expect(bannerName(r)).toBe('')
  })
})

describe('how it adds up', () => {
  const sum = (rows: { pulls: number }[]) => rows.reduce((t, r) => t + r.pulls, 0)
  const chain = [stop('a', 'p72', 2, 'character'), stop('b', 'p73', 1, 'character'), stop('w', 'p73', 2, 'weapon', 2)]
  const results = runChain({ player, config, patches, today, chain })

  it('pulls: wallet + income − earlier spending = pulls by the end, for every banner', () => {
    for (const r of results) {
      const rows = pullLedger(r, currentPulls(player))
      expect(sum(rows.filter((row) => !row.subtotal))).toBe(r.availableAtEnd)
      // The start subtotal equals everything above it.
      const at = rows.findIndex((row) => row.subtotal)
      expect(rows[at].pulls).toBe(sum(rows.slice(0, at)))
      expect(rows[at].pulls).toBe(r.availableAtStart)
    }
    expect(pullLedger(results[0], currentPulls(player)).some((row) => row.label === 'Spent on earlier banners')).toBe(false)
    expect(pullLedger(results[1], currentPulls(player))).toContainEqual({ label: 'Spent on earlier banners', pulls: -results[0].actualSpend })
  })

  it('worst case steps add up to the worst case, for every banner', () => {
    for (const r of results) expect(sum(worstCaseSteps(r))).toBe(r.pullsForGuarantee)
    const second = results[1]
    // After an all-in first banner, the second starts from the carried pity on a 50/50.
    expect(worstCaseSteps(second).map((row) => row.label)).toEqual(['Next 5★', 'If it loses the 50/50'])
    expect(worstCaseSteps(second)[0].pulls).toBe(90 - second.pityBefore)
  })

  it('a guaranteed start has no lost-50/50 step', () => {
    const [r] = runChain({ player: { ...player, characterBannerGuaranteed: true }, config, patches, today, chain: [stop('a', 'p73', 1, 'character')] })
    expect(r.guaranteedBefore).toBe(true)
    expect(worstCaseSteps(r).map((row) => row.label)).toEqual(['Next 5★'])
  })

  it('names the earlier banner of the same kind that set the starting pity', () => {
    expect(pitySource(results, results[0])).toBeNull()
    expect(pitySource(results, results[1])).toBe(results[0])
    expect(pitySource(results, results[2])).toBeNull() // weapon pity is separate
  })

  it('card rows show pulls and pity at the start, and pulls against the worst case at the end', () => {
    const r = results[1]
    const rows = pullsRows(r, today)
    expect(rows.start.text).toBe(`${r.availableAtStart} pulls · pity ${r.pityBefore}`)
    expect(rows.end.text).toBe(`${r.availableAtEnd} pulls · worst case ${r.pullsForGuarantee}`)
    // The pity the first banner leaves behind is where the second starts.
    expect(spendLine(results[0])).toContain(`pity ${results[0].pityAfter} after`)
    expect(results[1].pityBefore).toBe(results[0].pityAfter)
  })
})
