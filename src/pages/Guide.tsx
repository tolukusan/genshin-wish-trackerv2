import { useEffect } from 'react'
import { GUIDE } from '@/content/guide'
import { GUIDE_VISUALS } from '@/components/guide/registry'
import { usePlannerStore } from '@/store/usePlannerStore'

// Renders a guide paragraph list; consecutive "• " lines become one bullet list.
function Paragraphs({ lines }: { lines: string[] }) {
  const blocks: (string | string[])[] = []
  for (const line of lines) {
    if (line.startsWith('• ')) {
      const last = blocks[blocks.length - 1]
      if (Array.isArray(last)) last.push(line.slice(2))
      else blocks.push([line.slice(2)])
    } else {
      blocks.push(line)
    }
  }
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) =>
        Array.isArray(b) ? (
          <ul key={i} className="list-disc pl-5 flex flex-col gap-1 text-sm text-slate-700">
            {b.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        ) : (
          <p key={i} className="text-sm text-slate-700 leading-relaxed">{b}</p>
        ),
      )}
    </div>
  )
}

export function Guide() {
  const guideTopic = usePlannerStore((s) => s.guideTopic)
  const setNav = usePlannerStore((s) => s.setNav)
  const introDismissed = usePlannerStore((s) => s.introDismissed)
  const setIntroDismissed = usePlannerStore((s) => s.setIntroDismissed)

  // Jump to the section a "?" tip linked to.
  useEffect(() => {
    if (!guideTopic) return
    document.getElementById(`guide-${guideTopic}`)?.scrollIntoView({ block: 'start' })
  }, [guideTopic])

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Guide</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          How the planner works, in pictures. Open "More detail" on any card for the full explanation.
        </p>
      </div>

      <nav aria-label="Guide topics" className="flex flex-wrap gap-1.5">
        {GUIDE.map((t) => (
          <a
            key={t.id}
            href={`#guide-${t.id}`}
            className="text-xs rounded-full border px-2.5 py-1 text-slate-700 hover:border-violet-400 hover:text-violet-700 bg-white"
            style={{ borderColor: '#cbd5e1' }}
          >
            {t.title}
          </a>
        ))}
      </nav>

      {GUIDE.map((t) => {
        const { Visual, interactive } = GUIDE_VISUALS[t.id]
        return (
          <section key={t.id} id={`guide-${t.id}`} className="card p-5 flex flex-col gap-3 scroll-mt-4" aria-labelledby={`guide-h-${t.id}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id={`guide-h-${t.id}`} className="text-base font-semibold text-slate-900">{t.title}</h2>
              {interactive && (
                <span className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5" style={{ background: 'rgba(124,58,237,0.1)', color: '#5b21b6' }}>
                  Try it
                </span>
              )}
            </div>
            <p className="text-sm text-slate-700">{t.summary}</p>
            <Visual />
            <details>
              <summary className="text-xs font-semibold text-accent-purple cursor-pointer select-none">More detail</summary>
              <div className="mt-2"><Paragraphs lines={t.body} /></div>
            </details>
          </section>
        )
      })}

      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" onClick={() => setNav('data-entry')}>Enter my resources</button>
        <button className="btn-secondary" onClick={() => setNav('next-character')}>Back to Next Character</button>
        {introDismissed && (
          <button className="btn-secondary" onClick={() => { setIntroDismissed(false); setNav('next-character') }}>
            Show the getting-started card again
          </button>
        )}
      </div>
    </div>
  )
}
