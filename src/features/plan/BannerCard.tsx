import { CaretRight, ShieldCheck, TrendUp, Warning, XCircle } from '@phosphor-icons/react'
import { clsx } from 'clsx'
import { formatChance } from '@/engine/probability'
import type { ChainStopResult } from '@/types'
import { bannerTitle, bannerTypeLabel, spendLine, VERDICT_LABEL, verdictFor, type Verdict } from './planModel'

const VERDICT_ICON = { secured: ShieldCheck, 'very-likely': TrendUp, likely: TrendUp, risky: Warning, short: XCircle } as const

const VERDICT_STYLE: Record<Verdict, string> = {
  secured: 'bg-accent-800 text-accent-100',
  'very-likely': 'bg-accent-900 text-accent-200 shadow-[inset_0_0_0_1px_var(--color-accent)]',
  likely: 'border border-accent text-accent-300',
  risky: 'bg-neutral-800 text-neutral-100',
  short: 'border border-dashed border-neutral-500 text-neutral-300',
}

export function VerdictTag({ verdict }: { verdict: Verdict }) {
  const Icon = VERDICT_ICON[verdict]
  return (
    <span className={clsx('inline-flex h-[26px] flex-none items-center gap-[5px] whitespace-nowrap rounded-md px-[9px] text-xs font-medium', VERDICT_STYLE[verdict])}>
      <Icon weight="bold" aria-hidden />
      {VERDICT_LABEL[verdict]}
    </span>
  )
}

interface BannerCardProps {
  result: ChainStopResult
  onOpen: () => void
  /** Desktop cards name the patch version; in the river the patch header already does. */
  withVersion?: boolean
  size?: 'river' | 'desktop'
  today?: Date
}

export function BannerCard({ result: r, onOpen, withVersion = false, size = 'river', today = new Date() }: BannerCardProps) {
  const verdict = verdictFor(r)
  const name = r.stop.label?.trim()
  const desktop = size === 'desktop'
  return (
    <button
      type="button"
      onClick={onOpen}
      className={clsx(
        'plan-card group flex w-full flex-col rounded-lg bg-surface text-left shadow-sm transition-shadow hover:shadow-md',
        desktop ? 'px-[18px] py-4' : 'h-[168px] px-[14px] py-3',
      )}
      aria-label={`${name || bannerTitle(r, true, today)}: ${formatChance(r.successChance)} chance, ${VERDICT_LABEL[verdict]}. Open details`}
    >
      <span className={clsx('flex w-full justify-between gap-3 text-neutral-400', desktop ? 'text-[13px]' : 'text-xs')}>
        <span className="truncate">{bannerTitle(r, withVersion, today)}{name ? ` · ${name}` : ''}</span>
        <span className="flex-none">{bannerTypeLabel(r.bannerType, r.copies)}</span>
      </span>
      <span className={clsx('flex items-baseline gap-[10px]', desktop ? 'mt-[10px]' : 'mt-2')}>
        <span className={clsx('font-medium leading-none tracking-[-0.04em]', desktop ? 'text-[60px]' : 'text-5xl')}>
          {formatChance(r.successChance)}
        </span>
        <VerdictTag verdict={verdict} />
      </span>
      <span className={clsx('text-neutral-300', desktop ? 'mt-[10px] text-sm' : 'mt-[6px] text-[13px]')}>
        {r.availableAtEnd} pulls by end · worst case {r.pullsForGuarantee}
      </span>
      {desktop ? (
        <span className="mt-1 text-[13px] text-neutral-400">{spendLine(r)}</span>
      ) : (
        <span className="mt-auto flex h-7 items-center justify-between text-xs text-neutral-400">
          <span className="whitespace-nowrap">{spendLine(r)}</span>
          <CaretRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </span>
      )}
    </button>
  )
}
