import type { ReactNode } from 'react'
import { usePlannerStore } from '@/store/usePlannerStore'
import { VIZ } from './vizTheme'

// Small diagram building blocks. Identity is always carried by text (and an
// icon for outcomes), never colour alone.

function Box({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'accent'; className?: string }) {
  const styles = {
    neutral: { background: 'var(--color-neutral-900)', borderColor: 'var(--color-neutral-700)' },
    accent: { background: 'rgba(145,132,217,0.07)', borderColor: 'rgba(145,132,217,0.4)' },
    good: { background: 'rgba(5,150,105,0.07)', borderColor: 'rgba(5,150,105,0.45)' },
    warn: { background: 'rgba(235,104,52,0.08)', borderColor: 'rgba(235,104,52,0.45)' },
  }[tone]
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm text-slate-800 ${className}`} style={styles}>
      {children}
    </div>
  )
}

function Arrow({ label, down = false }: { label?: string; down?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-slate-400 shrink-0" aria-hidden>
      {label && <span className="text-[11px] text-slate-500 leading-tight">{label}</span>}
      <span className="text-lg leading-none">{down ? '↓' : '→'}</span>
    </div>
  )
}

// ── Getting started: three clickable steps ───────────────────────────────────
export function StepsVisual() {
  const { setNav } = usePlannerStore()
  const steps = [
    { n: 1, title: 'Wallet', text: 'What you have today', nav: 'data-entry' as const, required: true },
    { n: 2, title: 'Patch guesses', text: 'Optional: guess patch types', nav: 'patches' as const },
    { n: 3, title: 'Plan', text: 'Add banners, read your chances', nav: 'roadmap' as const },
  ]
  return (
    <ol className="flex flex-col sm:flex-row items-stretch gap-2">
      {steps.map((s, i) => (
        <li key={s.n} className="flex flex-col sm:flex-row items-stretch gap-2 flex-1">
          <button
            onClick={() => setNav(s.nav)}
            className="flex-1 text-left rounded-lg border px-3 py-2.5 hover:shadow-sm transition-shadow"
            style={{ borderColor: s.required ? 'rgba(145,132,217,0.45)' : 'var(--color-neutral-700)', background: s.required ? 'rgba(145,132,217,0.06)' : 'var(--color-neutral-900)' }}
          >
            <span className="text-xs font-bold" style={{ color: VIZ.series1 }}>STEP {s.n}{s.required ? ' · REQUIRED' : ''}</span>
            <span className="block text-sm font-semibold text-slate-900">{s.title}</span>
            <span className="block text-xs text-slate-600">{s.text}</span>
          </button>
          {i < steps.length - 1 && <span className="self-center text-slate-400 rotate-90 sm:rotate-0" aria-hidden>→</span>}
        </li>
      ))}
    </ol>
  )
}

// ── What the app can't know ──────────────────────────────────────────────────
export function UnknownsVisual() {
  const known = ['Your primogems, fates and pity', 'Pity rules and guarantees', 'Daily, monthly and endgame rewards', 'Patch schedule (every 42 days)']
  const guessed = ['Featured characters', 'Whether a patch adds a new area', 'Event rewards in future patches', 'Your 50/50 luck']
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Box tone="good">
        <p className="text-xs font-bold mb-1.5" style={{ color: VIZ.good }}>✓ KNOWN · counted exactly</p>
        <ul className="flex flex-col gap-1">{known.map((k) => <li key={k} className="text-sm">✓ {k}</li>)}</ul>
      </Box>
      <Box tone="warn">
        <p className="text-xs font-bold mb-1.5" style={{ color: '#e8c47e' }}>? UNKNOWN · averages or your guess</p>
        <ul className="flex flex-col gap-1">{guessed.map((k) => <li key={k} className="text-sm">? {k}</li>)}</ul>
      </Box>
    </div>
  )
}

// ── 50/50 flow ────────────────────────────────────────────────────────────────
export function FiftyFiftyVisual({ compact = false }: { compact?: boolean }) {
  const win = usePlannerStore((s) => s.config.fiftyFiftyWinPercent ?? 55)
  return (
    <div className={`flex flex-col items-stretch gap-1.5 ${compact ? 'text-xs' : ''}`}>
      <Box tone="accent" className="text-center font-semibold">You get a 5★ on the character banner</Box>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center gap-1">
          <Arrow down label={`≈${win}%`} />
          <Box tone="good" className="w-full text-center">✓ <b>Won</b>: the featured character</Box>
          {!compact && <span className="text-xs text-slate-500 text-center">Next 5★ is a 50/50 again</span>}
        </div>
        <div className="flex flex-col items-center gap-1">
          <Arrow down label={`≈${100 - win}%`} />
          <Box tone="warn" className="w-full text-center">✗ <b>Lost</b>: a standard character</Box>
          <Arrow down />
          <Box tone="good" className="w-full text-center">✓ Next 5★ is <b>guaranteed</b> featured</Box>
        </div>
      </div>
    </div>
  )
}

// ── Fate Points flow (weapon + chronicled) ──────────────────────────────────
export function FatePointsVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-col items-stretch gap-1.5 ${compact ? 'text-xs' : ''}`}>
      <Box tone="accent" className="text-center font-semibold">You get a 5★ (weapon or Chronicled banner)</Box>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center gap-1">
          <Arrow down />
          <Box tone="good" className="w-full text-center">✓ Your <b>chosen</b> item</Box>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Arrow down />
          <Box tone="warn" className="w-full text-center">✗ Another item → <b>+1 Fate Point</b></Box>
          <Arrow down />
          <Box tone="good" className="w-full text-center">✓ Next 5★ is your <b>chosen</b> item</Box>
        </div>
      </div>
      {!compact && (
        <p className="text-xs text-slate-600 text-center mt-1">
          Weapon banner: your chosen weapon is ~37.5% per 5★. Chronicled: 50%.{' '}
          <b>Chronicled Fate Points expire</b> when that Chronicled Wish ends; pity carries over.
        </p>
      )}
    </div>
  )
}

// ── Roadmap: spend vs carry across three example banners ─────────────────────
export function RoadmapVisual() {
  // Worked example following the planner's all-in rule from 0 pity on a 50/50.
  // A: 150 pulls, worst case one 5★ at 90 (lost 50/50) → pity 60, guaranteed.
  // B: guaranteed at pity 60, so 30 more pulls secure it.
  const stops = [
    { name: 'Character A', have: 150, need: '180 to guarantee', spend: 150, why: 'short of the guarantee, so all-in (worst case: a lost 50/50, pity 60 carries)', carry: 0 },
    { name: 'Character B', have: 70, need: '30 (pity 60, guaranteed)', spend: 30, why: 'guarantee covered, the rest carries', carry: 40 },
    { name: 'Weapon', have: 110, need: '160 to guarantee', spend: 110, why: 'short of the guarantee, so all-in', carry: 0 },
  ]
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        {stops.map((s, i) => (
          <div key={s.name} className="flex flex-col sm:flex-row items-stretch gap-2 flex-1">
            <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-slate-900">{i + 1}. {s.name}</p>
              <p className="text-xs text-slate-600">Have <b className="text-slate-900">{s.have}</b> · need {s.need}</p>
              <div className="flex h-3 rounded overflow-hidden gap-[2px]" aria-hidden>
                <div style={{ width: `${(s.spend / s.have) * 100}%`, background: VIZ.series1, borderRadius: 3 }} />
                <div style={{ width: `${(s.carry / s.have) * 100}%`, background: VIZ.series2, borderRadius: 3 }} />
              </div>
              <p className="text-xs text-slate-700">Spend <b>{s.spend}</b> · carry <b>{s.carry}</b></p>
              <p className="text-[11px] text-slate-500">{s.why}</p>
            </div>
            {i < stops.length - 1 && <Arrow label="+70 income" />}
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-slate-600" aria-label="Legend">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: VIZ.series1 }} />Spent on the banner</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: VIZ.series2 }} />Carried forward</span>
      </div>
    </div>
  )
}

// ── Starglitter refunds ──────────────────────────────────────────────────────
export function StarglitterVisual() {
  const pulls = Array.from({ length: 10 }, (_, i) => i)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5" aria-hidden>
        {pulls.map((i) => (
          <span
            key={i}
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold"
            style={i === 9
              ? { background: VIZ.series1, color: '#161826' }
              : { background: 'var(--color-neutral-900)', color: VIZ.textMuted, border: '1px solid var(--color-neutral-800)' }}
          >
            {i === 9 ? '4★' : '3★'}
          </span>
        ))}
        <Arrow label="duplicate" />
        <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ background: 'rgba(235,104,52,0.1)', color: '#e8a66b' }}>+2 to 5 starglitter</span>
      </div>
      <p className="text-xs text-slate-600">
        Every 10 pulls include at least one 4★. Duplicates refund starglitter; 5 starglitter buys a fate.
        For an established account that is roughly <b>10 extra pulls per 100</b>.
      </p>
    </div>
  )
}

// ── Your data ────────────────────────────────────────────────────────────────
export function DataVisual() {
  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-2">
      <Box tone="accent" className="flex-1"><b>This browser</b><br /><span className="text-xs text-slate-600">Saved automatically, never uploaded</span></Box>
      <Arrow label="Export JSON" />
      <Box className="flex-1"><b>Backup file</b><br /><span className="text-xs text-slate-600">teyvat-planner.json</span></Box>
      <Arrow label="Import JSON" />
      <Box className="flex-1"><b>Another device</b><br /><span className="text-xs text-slate-600">or after clearing your browser</span></Box>
    </div>
  )
}
