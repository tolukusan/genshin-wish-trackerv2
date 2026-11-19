import { usePlannerStore } from '@/store/usePlannerStore'
import { hasEnteredResources } from '@/utils/player'

// First-visit card. Always shown while no resources are entered (projections
// are meaningless until then); afterwards it can be dismissed.
export function GettingStarted() {
  const { player, introDismissed, setIntroDismissed, setNav, openGuide } = usePlannerStore()
  const entered = hasEnteredResources(player)
  if (entered && introDismissed) return null

  const steps: { title: string; detail: string; done?: boolean; action: () => void; cta: string }[] = [
    {
      title: 'Enter what you have today',
      detail: 'Primogems, fates, starglitter and your pity on each banner. The projections below start from these.',
      done: entered,
      action: () => setNav('data-entry'),
      cta: entered ? 'Update' : 'Enter resources',
    },
    {
      title: 'Check the patch schedule (optional)',
      detail: 'Future patches start as "Standard". Mark ones you expect to add an area. It is a guess until they are announced.',
      action: () => setNav('patches'),
      cta: 'Open Patches',
    },
    {
      title: 'Pick your banner',
      detail: 'Choose the banner you are saving for below, or plan several in a row on the Roadmap.',
      action: () => setNav('roadmap'),
      cta: 'Open Roadmap',
    },
  ]

  return (
    <section
      className="card p-5 flex flex-col gap-3"
      style={{ borderColor: entered ? 'rgba(124,58,237,0.3)' : 'rgba(217,119,6,0.45)', background: entered ? undefined : 'rgba(255,251,235,0.9)' }}
      aria-label="Getting started"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {entered ? 'Getting started' : 'Start here: enter your resources'}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {entered
              ? 'Three steps to a useful projection. Future banners and patch content are unknown, so the planner uses averages and your own guesses.'
              : 'You have not entered any resources yet, so the numbers below only count future income.'}
          </p>
        </div>
        {entered && (
          <button className="btn-secondary text-xs px-3 py-1.5 shrink-0" onClick={() => setIntroDismissed(true)}>
            Dismiss
          </button>
        )}
      </div>
      <ol className="flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-200 bg-white/80 p-3">
            <span
              aria-hidden
              className="shrink-0 text-xs font-bold"
              style={{
                width: '1.4rem', height: '1.4rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: s.done ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.12)', color: s.done ? '#059669' : '#6d28d9',
              }}
            >
              {s.done ? '✓' : i + 1}
            </span>
            <div className="flex-1 min-w-[12rem]">
              <p className="text-sm font-medium text-slate-900">{s.title}{s.done && <span className="sr-only"> (done)</span>}</p>
              <p className="text-xs text-slate-600">{s.detail}</p>
            </div>
            <button
              className={`${i === 0 && !entered ? 'btn-primary' : 'btn-secondary'} text-xs px-3 py-1.5 shrink-0 ml-auto`}
              onClick={s.action}
            >
              {s.cta}
            </button>
          </li>
        ))}
      </ol>
      <button
        className="self-start text-xs font-semibold text-accent-purple hover:underline"
        onClick={() => openGuide('getting-started')}
      >
        How does this work? Read the Guide →
      </button>
    </section>
  )
}
