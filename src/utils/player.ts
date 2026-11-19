import type { PlayerState } from '@/types'

// True once the player has entered anything on Data Entry.
export function hasEnteredResources(p: PlayerState): boolean {
  return (
    p.primogems + p.genesisCrystals + p.intertwinedFates + p.starglitter > 0 ||
    p.characterBannerPity + p.weaponBannerPity + p.chronicleBannerPity > 0 ||
    p.characterBannerGuaranteed || p.welkinActive || p.battlePassMode !== 'off'
  )
}
