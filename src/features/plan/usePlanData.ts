import { useMemo } from 'react'
import { usePlannerStore } from '@/store/usePlannerStore'
import { getRoadmapSnapshot, runChain } from '@/engine/projectionEngine'
import { buildPlanGroups, currentPulls, type SnapshotFn } from './planModel'

/**
 * Everything the Plan screen derives from the store, computed once per change.
 * The snapshot function is memoised per date because the river, the chart and
 * the patch incomes all ask for the same dates.
 */
export function usePlanData() {
  const player = usePlannerStore((s) => s.player)
  const config = usePlannerStore((s) => s.config)
  const patches = usePlannerStore((s) => s.patches)
  const chain = usePlannerStore((s) => s.chain)

  return useMemo(() => {
    const today = new Date()
    const results = chain.length > 0 ? runChain({ player, config, patches, chain, today }) : []
    const cache = new Map<string, number>()
    const snapshot: SnapshotFn = (iso) => {
      let v = cache.get(iso)
      if (v === undefined) {
        v = getRoadmapSnapshot({ player, config, patches, cutoff: iso, today }).totalPulls
        cache.set(iso, v)
      }
      return v
    }
    return {
      today,
      results,
      snapshot,
      groups: buildPlanGroups(patches, results, today),
      wallet: currentPulls(player),
    }
  }, [player, config, patches, chain])
}
