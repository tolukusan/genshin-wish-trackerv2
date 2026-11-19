import { useId, useRef, useState } from 'react'
import { useElementWidth } from './useElementWidth'
import { VIZ } from './vizTheme'

export interface ChartMarker {
  x: number
  label: string
  tone?: 'neutral' | 'good' | 'accent'
}

interface LineChartProps {
  /** y value per integer x, starting at x = xStart. */
  values: number[]
  xStart?: number
  yMax: number
  formatY: (y: number) => string
  formatX: (x: number) => string
  /** Axis tick text; defaults to the bare number. */
  formatXTick?: (x: number) => string
  xTicks: number[]
  yTicks: number[]
  markers?: ChartMarker[]
  /** Accessible one-sentence description of what the chart shows. */
  summary: string
  height?: number
  compact?: boolean
}

const MARKER_COLOR: Record<NonNullable<ChartMarker['tone']>, string> = {
  neutral: VIZ.textMuted,
  good: VIZ.good,
  accent: VIZ.series1,
}

// Single-series line + area chart in plain SVG: 2px line, recessive grid,
// labelled vertical markers, crosshair + tooltip on hover/touch.
export function LineChart({
  values, xStart = 0, yMax, formatY, formatX, formatXTick = String, xTicks, yTicks, markers = [], summary,
  height = 200, compact = false,
}: LineChartProps) {
  const [boxRef, width] = useElementWidth<HTMLDivElement>(600)
  // Stack marker labels that would collide onto a second row.
  const visibleMarkers = markers.filter((m) => m.x >= xStart && m.x <= xStart + values.length - 1).sort((a, b) => a.x - b.x)
  const rowOf = new Map<ChartMarker, number>()
  {
    const span = Math.max(1, values.length - 1)
    let lastX = -Infinity
    let lastRow = 1
    for (const m of visibleMarkers) {
      const px = ((m.x - xStart) / span) * width
      const row = px - lastX < 110 && lastRow === 0 ? 1 : 0
      rowOf.set(m, row)
      lastX = px
      lastRow = row
    }
  }
  const labelRows = compact ? 0 : Math.max(0, ...Array.from(rowOf.values())) + 1
  const pad = compact
    ? { top: 8, right: 8, bottom: 18, left: 30 }
    : { top: 12 + labelRows * 14, right: 16, bottom: 28, left: 42 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom
  const xEnd = xStart + values.length - 1
  const sx = (x: number) => pad.left + ((x - xStart) / Math.max(1, xEnd - xStart)) * plotW
  const sy = (y: number) => pad.top + plotH - (Math.min(y, yMax) / yMax) * plotH

  const line = values.map((y, i) => `${i === 0 ? 'M' : 'L'}${sx(xStart + i).toFixed(1)},${sy(y).toFixed(1)}`).join('')
  const area = `${line}L${sx(xEnd).toFixed(1)},${sy(0)}L${sx(xStart).toFixed(1)},${sy(0)}Z`

  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const descId = useId()

  const onMove = (clientX: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const vx = ((clientX - rect.left) / rect.width) * width
    const x = Math.round(xStart + ((vx - pad.left) / plotW) * (xEnd - xStart))
    setHover(Math.min(xEnd, Math.max(xStart, x)))
  }

  const hoverY = hover !== null ? values[hover - xStart] : null
  const tipLeftPct = hover !== null ? (sx(hover) / width) * 100 : 0

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-describedby={descId}
        style={{ display: 'block', touchAction: compact ? 'auto' : 'pan-y', overflow: 'visible' }}
        onPointerMove={compact ? undefined : (e) => onMove(e.clientX)}
        onPointerDown={compact ? undefined : (e) => onMove(e.clientX)}
        onPointerLeave={compact ? undefined : () => setHover(null)}
      >
        {/* grid + y labels */}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={pad.left} x2={width - pad.right} y1={sy(t)} y2={sy(t)} stroke={VIZ.grid} strokeWidth={1} />
            <text x={pad.left - 6} y={sy(t)} textAnchor="end" dominantBaseline="middle" fontSize={compact ? 10 : 11} fill={VIZ.textMuted}>
              {formatY(t)}
            </text>
          </g>
        ))}
        {/* x labels */}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={sx(t)} y={height - (compact ? 2 : 8)} textAnchor="middle" fontSize={compact ? 10 : 11} fill={VIZ.textMuted}>
            {formatXTick(t)}
          </text>
        ))}
        <line x1={pad.left} x2={width - pad.right} y1={sy(0)} y2={sy(0)} stroke={VIZ.axis} strokeWidth={1} />

        <path d={area} fill={VIZ.seriesFill} />
        <path d={line} fill="none" stroke={VIZ.series1} strokeWidth={2} strokeLinejoin="round" />

        {/* labelled markers */}
        {visibleMarkers.map((m) => {
          const color = MARKER_COLOR[m.tone ?? 'neutral']
          const x = sx(m.x)
          const y = sy(values[m.x - xStart])
          return (
            <g key={`${m.label}-${m.x}`}>
              <line x1={x} x2={x} y1={pad.top} y2={sy(0)} stroke={color} strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={x} cy={y} r={compact ? 5 : 4.5} fill={color} stroke={VIZ.surface} strokeWidth={2} />
              {!compact && (
                <text x={x} y={pad.top - 6 - (labelRows - 1 - (rowOf.get(m) ?? 0)) * 14} textAnchor={x > width * 0.8 ? 'end' : x < width * 0.2 ? 'start' : 'middle'} fontSize={11} fontWeight={600} fill={VIZ.textPrimary}>
                  {m.label}
                </text>
              )}
            </g>
          )
        })}

        {/* crosshair */}
        {hover !== null && hoverY !== null && (
          <g pointerEvents="none">
            <line x1={sx(hover)} x2={sx(hover)} y1={pad.top} y2={sy(0)} stroke={VIZ.textMuted} strokeWidth={1} />
            <circle cx={sx(hover)} cy={sy(hoverY)} r={5} fill={VIZ.series1} stroke={VIZ.surface} strokeWidth={2} />
          </g>
        )}
        {/* transparent hit area larger than the line */}
        {!compact && <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="transparent" />}
      </svg>

      {hover !== null && hoverY !== null && (
        <div
          role="status"
          style={{
            position: 'absolute', top: pad.top + 6, left: `${tipLeftPct}%`,
            transform: `translateX(${tipLeftPct > 70 ? '-105%' : '5%'})`,
            background: VIZ.surface, border: `1px solid ${VIZ.axis}`, borderRadius: 6,
            padding: '4px 8px', fontSize: 12, color: VIZ.textPrimary, pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(15,23,42,0.12)', whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: VIZ.textSecondary }}>{formatX(hover)}: </span>
          <b>{formatY(hoverY)}</b>
        </div>
      )}
      <p id={descId} className="sr-only">{summary}</p>
    </div>
  )
}
