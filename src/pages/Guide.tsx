import { useEffect } from 'react'
import { GUIDE } from '@/content/guide'
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
    <>
      {blocks.map((b, i) =>
        Array.isArray(b) ? (
          <ul key={i} className="list-disc pl-5 flex flex-col gap-1 text-sm text-slate-700">
            {b.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        ) : (
          <p key={i} className="text-sm text-slate-700 leading-relaxed">{b}</p>
        ),
      )}
    </>
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
    <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Guide</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          How the planner works, what its numbers mean, and which parts are educated guesses.
        </p>
      </div>

      <nav className="card p-5" aria-label="Guide contents">
        <p className="label mb-2">Contents</p>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
          {GUIDE.map((t) => (
            <li key={t.id}>
              <a href={`#guide-${t.id}`} className="text-sm text-accent-purple hover:underline">{t.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      {GUIDE.map((t) => (
        <section key={t.id} id={`guide-${t.id}`} className="card p-5 flex flex-col gap-3 scroll-mt-4">
          <h2 className="text-base font-semibold text-slate-900">{t.title}</h2>
          <Paragraphs lines={t.body} />
        </section>
      ))}

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
