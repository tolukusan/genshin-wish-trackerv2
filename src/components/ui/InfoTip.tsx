import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { guideTopic, type GuideTopicId } from '@/content/guide'
import { usePlannerStore } from '@/store/usePlannerStore'
import { GUIDE_VISUALS } from '@/components/guide/registry'

const POPOVER_WIDTH = 320 // px (20rem); fits a compact chart
const MARGIN = 8

// Small "?" button that explains a concept in place, using the same text as
// the Guide page, with a link to the full section. The popover is portalled
// to <body> with fixed positioning so scroll containers (e.g. wide tables on
// phones) cannot clip it, and it is kept inside the viewport.
export function InfoTip({ topic, label }: { topic: GuideTopicId; label?: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const openGuide = usePlannerStore((s) => s.openGuide)
  const t = guideTopic(topic)
  const visual = GUIDE_VISUALS[topic]
  const Thumb = visual.inTips ? visual.Visual : null

  // Place below the button (or above if there is no room), clamped to the viewport.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return
    const b = buttonRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = Math.min(POPOVER_WIDTH, vw - MARGIN * 2)
    const left = Math.min(Math.max(MARGIN, b.left), vw - width - MARGIN)
    const height = popRef.current?.offsetHeight ?? 140
    const below = b.bottom + 6
    const top = below + height > vh - MARGIN && b.top - 6 - height > MARGIN ? b.top - 6 - height : below
    setPos({ left, top, width })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!buttonRef.current?.contains(target) && !popRef.current?.contains(target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus() }
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true) // fixed popover would drift on scroll
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  return (
    <span className="print-hide" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label ?? `What is "${t.title}"?`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => { setPos(null); setOpen((v) => !v) }}
        style={{
          width: '1.1rem', height: '1.1rem', borderRadius: '9999px', marginLeft: '0.3rem',
          border: '1px solid rgba(145,132,217,0.45)', color: 'var(--color-accent-300)', background: 'rgba(145,132,217,0.06)',
          fontSize: '0.7rem', fontWeight: 700, lineHeight: 1, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          textTransform: 'none', letterSpacing: 0,
        }}
      >
        ?
      </button>
      {open && createPortal(
        <div
          ref={popRef}
          id={id}
          role="dialog"
          aria-label={t.title}
          style={{
            position: 'fixed', zIndex: 70,
            left: pos?.left ?? 0, top: pos?.top ?? 0, width: pos?.width ?? POPOVER_WIDTH,
            visibility: pos ? 'visible' : 'hidden',
            background: 'var(--color-surface)', border: '1px solid rgba(145,132,217,0.35)', borderRadius: '0.6rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)', padding: '0.7rem 0.8rem',
            textAlign: 'left', fontWeight: 400, display: 'flex', flexDirection: 'column', gap: '0.45rem',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>{t.title}</span>
          {Thumb && (
            <div style={{ pointerEvents: 'none' }} aria-hidden>
              <Thumb compact />
            </div>
          )}
          <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-200)', lineHeight: 1.45 }}>{t.summary}</span>
          <button
            type="button"
            onClick={() => { setOpen(false); openGuide(topic) }}
            style={{ alignSelf: 'flex-start', fontSize: '0.75rem', color: 'var(--color-accent-300)', fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            Read more in the Guide →
          </button>
        </div>,
        document.body,
      )}
    </span>
  )
}
