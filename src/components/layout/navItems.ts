import { DotsThreeCircle, Wallet, Waves, type Icon } from '@phosphor-icons/react'
import type { NavTab } from '@/types'

export type PrimaryTab = 'roadmap' | 'data-entry' | 'more'

/** The three tabs from 1b. Ids are the older page ids so saved state still opens. */
export const PRIMARY_TABS: { tab: PrimaryTab; label: string; icon: Icon }[] = [
  { tab: 'roadmap', label: 'Plan', icon: Waves },
  { tab: 'data-entry', label: 'Wallet', icon: Wallet },
  { tab: 'more', label: 'More', icon: DotsThreeCircle },
]

/**
 * The page actually shown for a stored nav id. 'next-character' was the
 * single-banner forecast (and the old default page), now part of the Plan.
 * Saved state isn't re-migrated unless the store version changes, so this
 * mapping covers it at runtime.
 */
export function resolveNav(nav: NavTab): NavTab {
  return nav === 'next-character' ? 'roadmap' : nav
}

/** Which primary tab is lit for a page: the secondary pages live under More. */
export function primaryTabFor(nav: NavTab): PrimaryTab {
  const page = resolveNav(nav)
  return page === 'roadmap' || page === 'data-entry' ? page : 'more'
}
