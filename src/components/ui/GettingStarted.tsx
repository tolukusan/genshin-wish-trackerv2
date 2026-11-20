import { ArrowRight } from '@phosphor-icons/react'
import { usePlannerStore } from '@/store/usePlannerStore'
import { hasEnteredResources } from '@/utils/player'

// First-visit prompt on the Plan. Always shown while no resources are entered
// (the plan only counts future income until then); afterwards it can be dismissed.
export function GettingStarted({ hasBanners, layout }: { hasBanners: boolean; layout: 'river' | 'desktop' }) {
  const { player, introDismissed, setIntroDismissed, setNav, openGuide } = usePlannerStore()
  const entered = hasEnteredResources(player)
  if (entered && (introDismissed || hasBanners)) return null

  return (
    <section className="card flex flex-col gap-2 p-4" aria-label="Getting started">
      <h2 className="text-base">{entered ? 'Next: add the banner you’re saving for' : 'Start here: what’s in your wallet?'}</h2>
      <p className="text-[13px] text-neutral-400">
        {entered
          ? `${layout === 'river' ? 'Tap “Add” on a phase below' : 'Use “Add banner” above'}. Future banners and patch rewards are guesses until announced, so the plan uses averages and your patch guesses.`
          : 'You haven’t entered any primogems, fates or pity yet, so the plan only counts future income.'}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {!entered && (
          <button type="button" className="btn-primary" onClick={() => setNav('data-entry')}>
            Open Wallet <ArrowRight aria-hidden />
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => openGuide('getting-started')}>
          How does this work?
        </button>
        {entered && (
          <button type="button" className="btn-ghost ml-auto text-neutral-400" onClick={() => setIntroDismissed(true)}>
            Dismiss
          </button>
        )}
      </div>
    </section>
  )
}
