import { addDays, format, parseISO, startOfDay } from 'date-fns'
import { Plus } from '@phosphor-icons/react'
import type { Patch, PatchModifier, PatchType } from '@/types'
import { BannerCard } from './BannerCard'
import { balanceAt, featuredText, patchIncome, riverPath, type PlanPatchGroup, type RiverNode, type SnapshotFn } from './planModel'
import type { ChainStopResult } from '@/types'

const PATCH_TYPE_LABEL: Record<PatchType, string> = {
  standard: 'Standard',
  'sub-area': 'Sub-area',
  'new-region': 'New region',
}

const MODIFIER_LABEL: Record<PatchModifier, string> = {
  anniversary: 'Anniversary',
  'lantern-rite': 'Lantern Rite',
}

// Fixed row heights, so the river can be drawn at exactly the right places.
const TODAY_H = 40
const HEADER_H = 36
const CARD_H = 188
const CARD_GAP = 8
const ADD_H = 60
const RIVER_W = 56

type Row =
  | { kind: 'today'; y: number }
  | { kind: 'header'; y: number; patch: Patch; income: number }
  | { kind: 'card'; y: number; result: ChainStopResult }
  | { kind: 'add'; y: number; patch: Patch; phase: 1 | 2; when: string; featured: string }

interface RiverTimelineProps {
  groups: PlanPatchGroup[]
  results: ChainStopResult[]
  snapshot: SnapshotFn
  wallet: number
  today: Date
  onOpen: (stopId: string) => void
  onAdd: (patchId: string, phase: 1 | 2) => void
}

/**
 * Mobile Plan (1b): the pull balance drawn as a stream down the left edge. It
 * widens as income arrives and narrows at each banner the plan spends on.
 */
export function RiverTimeline({ groups, results, snapshot, wallet, today, onOpen, onAdd }: RiverTimelineProps) {
  const todayIso = format(startOfDay(today), 'yyyy-MM-dd')
  const atOrAfterToday = (iso: string) => (parseISO(iso) > parseISO(todayIso) ? iso : todayIso)

  const rows: Row[] = []
  const nodes: RiverNode[] = []
  const labels: { y: number; text: string }[] = []
  let y = 0

  rows.push({ kind: 'today', y })
  nodes.push({ y: TODAY_H / 2, value: wallet })
  y += TODAY_H

  for (const g of groups) {
    rows.push({ kind: 'header', y, patch: g.patch, income: patchIncome(g.patch, snapshot, today) })
    nodes.push({ y: y + HEADER_H / 2, value: Math.max(0, balanceAt(atOrAfterToday(g.patch.startDate), results, snapshot)) })
    y += HEADER_H
    for (const { phase, results: phaseResults } of g.phases) {
      if (phaseResults.length === 0) {
        const running = parseISO(phase.startDate) <= parseISO(todayIso)
        const when = running
          ? `ends ${format(addDays(parseISO(phase.endDate), -1), 'MMM d')}`
          : format(parseISO(phase.startDate), 'MMM d')
        rows.push({ kind: 'add', y, patch: g.patch, phase: phase.phase, when, featured: featuredText(phase.featuredCharacters) })
        nodes.push({ y: y + ADD_H / 2, value: Math.max(0, balanceAt(atOrAfterToday(phase.startDate), results, snapshot)) })
        y += ADD_H
        continue
      }
      for (const r of phaseResults) {
        rows.push({ kind: 'card', y, result: r })
        nodes.push({ y: y + 24, value: Math.max(0, r.availableAtEnd) })
        nodes.push({ y: y + CARD_H - 12, value: Math.max(0, r.remainingAfter) })
        labels.push({ y: y + 24, text: String(r.availableAtEnd) })
        labels.push({ y: y + CARD_H - 12, text: String(r.remainingAfter) })
        y += CARD_H + CARD_GAP
      }
    }
  }
  const height = y

  return (
    <div className="relative pl-3 pr-4" style={{ height }}>
      <svg
        viewBox={`0 0 ${RIVER_W} ${height}`}
        className="absolute left-3 top-0 overflow-visible"
        style={{ width: RIVER_W, height }}
        aria-hidden
      >
        <defs>
          <linearGradient id="river-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-accent-700)" />
            <stop offset="1" stopColor="var(--color-accent-800)" />
          </linearGradient>
        </defs>
        <path d={riverPath(nodes, RIVER_W / 2)} fill="url(#river-fill)" stroke="var(--color-accent)" strokeWidth={1} />
      </svg>
      {labels.map((l, i) => (
        <span
          key={i}
          className="absolute left-3 w-14 -translate-y-1/2 text-center text-[11px] font-semibold text-accent-100"
          style={{ top: l.y }}
          aria-hidden
        >
          {l.text}
        </span>
      ))}

      <ol className="relative" style={{ marginLeft: RIVER_W + 12 }}>
        {rows.map((row) => {
          if (row.kind === 'today') {
            return (
              <li key="today" className="flex items-center gap-2" style={{ height: TODAY_H, marginLeft: -(RIVER_W + 12) }}>
                <span className="w-14 text-center text-[13px] font-semibold text-accent-100">{wallet}</span>
                <span className="text-[13px] text-neutral-400">Today · in your wallet</span>
              </li>
            )
          }
          if (row.kind === 'header') {
            return (
              <li key={`h-${row.patch.id}`} className="flex items-center gap-1.5" style={{ height: HEADER_H }}>
                <span className="text-[13px] font-semibold">v{row.patch.version}</span>
                <span className="tag tag-neutral">{PATCH_TYPE_LABEL[row.patch.patchType]}</span>
                {row.patch.modifiers.map((m) => (
                  <span key={m} className="tag tag-outline">{MODIFIER_LABEL[m]}</span>
                ))}
                <span className="ml-auto whitespace-nowrap text-xs text-neutral-400" title="Estimated pulls earned during this patch">
                  ≈ +{row.income}
                </span>
              </li>
            )
          }
          if (row.kind === 'card') {
            return (
              <li key={row.result.stop.id} style={{ height: CARD_H, marginBottom: CARD_GAP }}>
                <BannerCard result={row.result} today={today} onOpen={() => onOpen(row.result.stop.id)} />
              </li>
            )
          }
          return (
            <li key={`a-${row.patch.id}-${row.phase}`} className="flex items-center" style={{ height: ADD_H }}>
              <button
                type="button"
                onClick={() => onAdd(row.patch.id, row.phase)}
                className="flex h-11 w-full items-center justify-between rounded-lg border border-dashed border-neutral-700 px-3 text-[13px] text-neutral-300 transition-colors hover:border-accent hover:bg-accent/10"
              >
                <span className="truncate">Phase {row.phase} · {row.when}{row.featured ? ` · ${row.featured}` : ''}</span>
                <span className="flex items-center gap-1 text-accent-300"><Plus aria-hidden />Add</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
