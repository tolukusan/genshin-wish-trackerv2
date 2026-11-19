import { useLayoutEffect, useRef, useState } from 'react'

// Tracks an element's rendered width so SVG charts can draw at true pixel size
// (keeping text legible on phones instead of scaling it down with the viewBox).
export function useElementWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(Math.max(200, Math.round(el.getBoundingClientRect().width)))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}
