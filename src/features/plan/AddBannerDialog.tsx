import { useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { clsx } from 'clsx'
import { usePlannerStore } from '@/store/usePlannerStore'
import { isSelectableBanner } from '@/utils/banners'
import type { WishBannerType } from '@/types'
import { featuredText } from './planModel'
import { useModalFocus } from './useModalFocus'

const TYPES: { type: WishBannerType; label: string; hint: string }[] = [
  { type: 'character', label: 'Character', hint: '90 hard pity · 50/50' },
  { type: 'weapon', label: 'Weapon', hint: '80 hard pity · Fate Points' },
  { type: 'chronicled', label: 'Chronicled', hint: '90 hard pity · Fate Point' },
]

interface AddBannerDialogProps {
  initial?: { patchId: string; phase: 1 | 2 }
  onClose: () => void
  onAdded: (stopId: string) => void
}

/** Adds a banner to the plan: which phase, and which kind of banner. */
export function AddBannerDialog({ initial, onClose, onAdded }: AddBannerDialogProps) {
  const patches = usePlannerStore((s) => s.patches)
  const addChainStopAt = usePlannerStore((s) => s.addChainStopAt)
  const options = patches.flatMap((p) =>
    p.phases.filter((ph) => isSelectableBanner(ph.endDate, false)).map((ph) => ({
      value: `${p.id}:${ph.phase}`,
      label: `v${p.version} Phase ${ph.phase} · ${format(parseISO(ph.startDate), 'MMM d')}${featuredText(ph.featuredCharacters) ? ` · ${featuredText(ph.featuredCharacters)}` : ''}`,
    })),
  )
  const [banner, setBanner] = useState(initial ? `${initial.patchId}:${initial.phase}` : options[0]?.value ?? '')
  const [type, setType] = useState<WishBannerType>('character')
  const firstRef = useRef<HTMLSelectElement>(null)
  const dialogRef = useRef<HTMLFormElement>(null)
  useModalFocus(dialogRef, onClose, firstRef)

  const add = () => {
    const [patchId, phase] = banner.split(':')
    if (!patchId) return
    onAdded(addChainStopAt(patchId, Number(phase) as 1 | 2, type))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/60 md:items-center" onClick={onClose}>
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-banner-title"
        className="animate-sheet-up flex w-full flex-col gap-4 rounded-t-2xl bg-surface p-5 pb-8 shadow-lg md:max-w-[420px] md:rounded-2xl md:pb-5"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); add() }}
      >
        <h2 id="add-banner-title" className="text-xl">Add a banner</h2>
        {options.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No upcoming banners. Add patches under More → Patch guesses first.
          </p>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span className="label">When</span>
              <select ref={firstRef} className="input-base" value={banner} onChange={(e) => setBanner(e.target.value)}>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="label mb-1">Banner</legend>
              {TYPES.map((t) => (
                <label
                  key={t.type}
                  className={clsx(
                    'flex min-h-12 cursor-pointer items-center justify-between rounded-lg px-3 text-sm',
                    type === t.type ? 'shadow-[inset_0_0_0_1px_var(--color-accent)]' : 'shadow-sm hover:bg-neutral-800/50',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <input type="radio" name="banner-type" value={t.type} checked={type === t.type} onChange={() => setType(t.type)} className="accent-[var(--color-accent)]" />
                    {t.label}
                  </span>
                  <span className="text-xs text-neutral-400">{t.hint}</span>
                </label>
              ))}
            </fieldset>
          </>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={options.length === 0}>Add banner</button>
        </div>
      </form>
    </div>
  )
}
