import { addMonths, differenceInCalendarDays, format, parseISO, startOfMonth } from 'date-fns'
import { useElementWidth } from '@/components/guide/useElementWidth'
import type { ChainStopResult } from '@/types'
import { bannerName, type BalancePoint } from './planModel'

interface BalanceChartProps {
  series: BalancePoint[]
  results: ChainStopResult[]
  start: string
  end: string
  onOpen: (stopId: string) => void
}

/** Band labels share a narrow band with the next one, so long names are cut. */
function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

const H = 200 // plot height; labels sit above (to -30) and below (to 220)

/** Desktop Plan (1b): projected pull balance over time, with each planned banner as a band. */
export function BalanceChart({ series, results, start, end, onOpen }: BalanceChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>(1100)
  const t0 = parseISO(start)
  const span = Math.max(1, differenceInCalendarDays(parseISO(end), t0))
  const x = (iso: string) => (Math.min(span, Math.max(0, differenceInCalendarDays(parseISO(iso), t0))) / span) * width
  const max = Math.max(10, ...series.map((p) => p.value), ...results.map((r) => r.availableAtEnd)) * 1.12
  const y = (v: number) => H - (Math.max(0, v) / max) * H

  // Steps: the roadmap model books each phase's income on its start date, so
  // the balance holds level and then jumps, rather than rising smoothly.
  const line = series.map((p, i) => {
    const px = x(p.date).toFixed(1)
    const py = y(p.value).toFixed(1)
    if (i === 0) return `M${px} ${py}`
    return `L${px} ${y(series[i - 1].value).toFixed(1)} L${px} ${py}`
  }).join(' ')
  const area = series.length > 0
    ? `${line} L${x(series[series.length - 1].date).toFixed(1)} ${H} L${x(series[0].date).toFixed(1)} ${H} Z`
    : ''

  const ticks: { x: number; t: string }[] = []
  for (let m = startOfMonth(addMonths(t0, 1)); m <= parseISO(end); m = addMonths(m, 1)) {
    ticks.push({ x: x(format(m, 'yyyy-MM-dd')), t: format(m, 'MMM') })
  }

  const summary = results.map((r) => `v${r.patchVersion} phase ${r.stop.phase}: ${r.availableAtEnd} pulls by end`).join('; ')

  return (
    <div ref={ref} className="w-full">
      <svg
        viewBox={`0 -30 ${width} 250`}
        width={width}
        height={250}
        className="block overflow-visible"
        role="img"
        aria-label={`Projected pull balance from ${format(t0, 'MMM d')} to ${format(parseISO(end), 'MMM d')}. ${summary}`}
      >
        <defs>
          <linearGradient id="balance-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-accent-600)" stopOpacity={0.6} />
            <stop offset="1" stopColor="var(--color-accent-700)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        {results.map((r) => {
          const bx = x(r.phaseDate)
          const bw = Math.max(2, x(r.phaseEndDate) - bx)
          return (
            <g key={r.stop.id} className="cursor-pointer" onClick={() => onOpen(r.stop.id)}>
              <rect x={bx} y={-30} width={bw} height={H + 30} fill="var(--color-accent-900)" opacity={0.7} />
              <text x={bx + 6} y={-14} fontSize={12} fill="var(--color-neutral-300)">
                v{r.patchVersion} P{r.stop.phase}{bannerName(r) ? ` · ${shorten(bannerName(r), 14)}` : ''}
              </text>
            </g>
          )
        })}
        <line x1={0} x2={width} y1={H} y2={H} stroke="var(--color-neutral-700)" />
        <path d={area} fill="url(#balance-fill)" />
        <path d={line} fill="none" stroke="var(--color-accent-300)" strokeWidth={2} strokeLinejoin="round" />
        {results.map((r) => {
          const px = x(r.phaseEndDate)
          const py = y(r.availableAtEnd)
          return (
            <g key={`pt-${r.stop.id}`}>
              <circle cx={px} cy={py} r={4} fill="var(--color-accent-200)" />
              <text x={px} y={Math.max(-2, py - 10)} fontSize={13} fontWeight={600} textAnchor="middle" fill="var(--color-text)">
                {r.availableAtEnd}
              </text>
            </g>
          )
        })}
        {ticks.map((t) => (
          <text key={t.t + t.x} x={t.x} y={218} fontSize={11} textAnchor="middle" fill="var(--color-neutral-500)">
            {t.t}
          </text>
        ))}
      </svg>
    </div>
  )
}
