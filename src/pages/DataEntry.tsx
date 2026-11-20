import { useState, type ChangeEvent, type FocusEvent, type ReactNode } from 'react'
import { Diamond, Moon, Sparkle, Star, Ticket } from '@phosphor-icons/react'
import { clsx } from 'clsx'
import { usePlannerStore } from '@/store/usePlannerStore'
import { Toggle } from '@/components/ui/Toggle'
import { InfoTip } from '@/components/ui/InfoTip'
import { GAME_RULES } from '@/engine/gameRules'
import { currentPulls } from '@/features/plan/planModel'
import type { PlayerState } from '@/types'

// The Wallet tab (1b). Kept at this path and component name because the nav
// id is still 'data-entry', so saved state keeps opening it.

/** A whole-number field that only commits a valid, clamped value. */
function useNumberField(value: number, onChange: (v: number) => void, max?: number) {
  const [raw, setRaw] = useState<string | null>(null)
  const clamp = (n: number) => Math.max(0, max !== undefined ? Math.min(max, n) : n)
  return {
    value: raw ?? String(value),
    inputMode: 'numeric' as const,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value.replace(/[^\d]/g, '')
      setRaw(text)
      if (text !== '') onChange(clamp(parseInt(text, 10)))
    },
    onBlur: () => setRaw(null),
    onFocus: (e: FocusEvent<HTMLInputElement>) => e.target.select(),
  }
}

function ResourceTile({ icon, name, value, note, max, onChange }: {
  icon: ReactNode; name: string; value: number; note: string; max?: number; onChange: (v: number) => void
}) {
  const field = useNumberField(value, onChange, max)
  const id = `res-${name.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="flex min-h-[104px] flex-col rounded-lg bg-surface p-3 shadow-sm focus-within:shadow-[inset_0_0_0_1px_var(--color-accent)]">
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs text-neutral-400">
        <span className="text-[15px] text-accent-300" aria-hidden>{icon}</span>{name}
      </label>
      <input
        id={id}
        {...field}
        className="mt-1.5 w-full bg-transparent text-[30px] font-medium leading-tight tracking-[-0.02em] outline-none"
      />
      <span className="mt-auto text-xs text-neutral-400">{note}</span>
    </div>
  )
}

function PityRow({ name, value, hard, soft, onChange }: {
  name: string; value: number; hard: number; soft: number; onChange: (v: number) => void
}) {
  const field = useNumberField(value, onChange, hard - 1)
  const id = `pity-${name.toLowerCase()}`
  return (
    <div className="grid h-12 grid-cols-[88px_1fr_56px] items-center gap-2.5 px-1">
      <label htmlFor={id} className="text-sm">{name}</label>
      <div
        className="relative h-5 overflow-hidden rounded bg-neutral-900"
        role="img"
        aria-label={`${value} of ${hard} pulls; odds climb from ${soft}`}
      >
        <span
          className="absolute inset-y-0 right-0"
          style={{
            width: `${((hard - soft) / hard) * 100}%`,
            background: 'repeating-linear-gradient(135deg, var(--color-neutral-800) 0 3px, transparent 3px 6px)',
          }}
        />
        <span
          className="absolute inset-y-0 left-0 bg-accent-700 shadow-[inset_-2px_0_0_var(--color-accent-300)]"
          style={{ width: `${Math.min(100, (value / hard) * 100)}%` }}
        />
      </div>
      <input
        id={id}
        {...field}
        className="w-full rounded-md bg-transparent px-1 text-right text-[17px] font-medium outline-none hover:bg-neutral-800/60 focus:bg-neutral-800"
        aria-describedby="pity-note"
      />
    </div>
  )
}

function Chip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('min-h-[52px] rounded-lg px-3 py-2 shadow-sm', className)}>
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="text-[15px]">{children}</div>
    </div>
  )
}

function FatePointChip({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const on = value > 0
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(on ? 0 : 1)}
      className="min-h-[52px] rounded-lg px-3 py-2 text-left shadow-sm transition-colors hover:bg-neutral-800/50"
    >
      <div className="text-xs text-neutral-400">{label}</div>
      <div className={clsx('text-[15px]', on && 'text-accent-300')}>{on ? 1 : 0} of 1</div>
    </button>
  )
}

export function DataEntry() {
  const { player, updatePlayer } = usePlannerStore()
  const set = <K extends keyof PlayerState>(key: K) => (v: PlayerState[K]) => updatePlayer({ [key]: v } as Partial<PlayerState>)
  const per = GAME_RULES.primogemsPerFate
  const welkinField = useNumberField(player.welkinDaysRemaining, set('welkinDaysRemaining'), 180)

  return (
    <div className="mx-auto max-w-2xl animate-fade-in md:mx-0 px-4 pb-6 pt-1.5 lg:px-9 lg:pt-7">
      <header className="flex items-baseline justify-between px-1">
        <h1 className="text-2xl lg:text-[30px]">Wallet</h1>
        <span className="text-[13px] text-neutral-400">
          = <b className="text-xl font-medium text-text">{currentPulls(player)}</b> pulls
        </span>
      </header>
      <p className="mt-1 px-1 text-xs text-neutral-500">
        What you have right now. Changes save in this browser. <InfoTip topic="how-projections-work" />
      </p>

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <ResourceTile icon={<Diamond weight="fill" />} name="Primogems" value={player.primogems} onChange={set('primogems')}
          note={`÷ ${per} = ${Math.floor(player.primogems / per)}`} />
        <ResourceTile icon={<Ticket weight="fill" />} name="Intertwined Fates" value={player.intertwinedFates} onChange={set('intertwinedFates')}
          note={`= ${player.intertwinedFates}`} />
        <ResourceTile icon={<Sparkle weight="fill" />} name="Starglitter" value={player.starglitter} onChange={set('starglitter')}
          note={`÷ ${GAME_RULES.starglitterPerFate} = ${Math.floor(player.starglitter / GAME_RULES.starglitterPerFate)}`} />
        <ResourceTile icon={<Star weight="fill" />} name="Genesis Crystals" value={player.genesisCrystals} onChange={set('genesisCrystals')}
          note="counted with primogems" />
      </div>

      <h2 className="px-1 pb-1 pt-5 text-[13px] font-normal text-neutral-400">
        Pity · pulls since last 5★ <InfoTip topic="pity" />
      </h2>
      <PityRow name="Character" value={player.characterBannerPity} hard={GAME_RULES.hardPity.character} soft={GAME_RULES.softPity.character} onChange={set('characterBannerPity')} />
      <PityRow name="Weapon" value={player.weaponBannerPity} hard={GAME_RULES.hardPity.weapon} soft={GAME_RULES.softPity.weapon} onChange={set('weaponBannerPity')} />
      <PityRow name="Chronicled" value={player.chronicleBannerPity} hard={GAME_RULES.hardPity.chronicled} soft={GAME_RULES.softPity.chronicled} onChange={set('chronicleBannerPity')} />
      <p id="pity-note" className="pb-1 pl-[102px] pr-1 text-xs text-neutral-500">Hatched: odds climb sharply. Tap a number to edit.</p>

      <div className="mt-3 flex flex-col gap-1.5">
        <div className="min-h-[52px] rounded-lg px-3 py-2 shadow-sm">
          <Toggle
            label="Guaranteed · lost last 50/50"
            checked={player.characterBannerGuaranteed}
            onChange={set('characterBannerGuaranteed')}
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <FatePointChip label="Weapon Fate Points" value={player.weaponBannerFatePoints} onChange={set('weaponBannerFatePoints')} />
          <FatePointChip label="Chronicled" value={player.chronicleBannerFatePoints ?? 0} onChange={set('chronicleBannerFatePoints')} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="min-h-[52px] rounded-lg px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs text-neutral-400"><Moon aria-hidden /> Welkin Moon</span>
              <button
                type="button"
                role="switch"
                aria-checked={player.welkinActive}
                aria-label="Welkin Moon active"
                onClick={() => updatePlayer({ welkinActive: !player.welkinActive })}
                className={clsx('relative h-5 w-8 flex-none rounded-full transition-colors', player.welkinActive ? 'bg-accent' : 'bg-neutral-700')}
              >
                <span className={clsx('absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-neutral-100 transition-transform', player.welkinActive && 'translate-x-3')} />
              </button>
            </div>
            {player.welkinActive ? (
              <label className="flex items-baseline gap-1 text-[15px]">
                <input {...welkinField} aria-label="Welkin days remaining" className="w-10 bg-transparent outline-none focus:text-accent-300" />
                days
              </label>
            ) : (
              <div className="text-[15px] text-neutral-400">Off</div>
            )}
          </div>
          <Chip label="Battle Pass">
            <div className="mt-0.5 flex gap-1" role="radiogroup" aria-label="Battle Pass">
              {(['off', 'free', 'paid'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={player.battlePassMode === mode}
                  onClick={() => updatePlayer({ battlePassMode: mode })}
                  className={clsx('rounded px-1.5 text-[13px] capitalize',
                    player.battlePassMode === mode ? 'text-accent-300 shadow-[inset_0_0_0_1px_var(--color-accent)]' : 'text-neutral-400 hover:text-text')}
                >
                  {mode}
                </button>
              ))}
            </div>
          </Chip>
        </div>
        <AcquaintRow value={player.acquaintFates} onChange={set('acquaintFates')} />
      </div>
    </div>
  )
}

function AcquaintRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const field = useNumberField(value, onChange)
  return (
    <label className="flex min-h-[52px] items-center justify-between rounded-lg px-3 shadow-sm">
      <span className="text-sm">
        Acquaint Fates <span className="text-xs text-neutral-500">· standard banner, not counted</span>
      </span>
      <input {...field} className="w-16 bg-transparent text-right text-[15px] outline-none focus:text-accent-300" />
    </label>
  )
}
