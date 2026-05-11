import { useState, useEffect } from 'react'

interface NumberInputProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  hint?: string
}

export function NumberInput({ label, value, onChange, min = 0, max, step = 1, hint }: NumberInputProps) {
  const [raw, setRaw] = useState(String(value))

  // Sync when value changes externally
  useEffect(() => {
    setRaw((prev) => {
      const parsed = parseFloat(prev)
      return isNaN(parsed) || parsed !== value ? String(value) : prev
    })
  }, [value])

  const commit = (str: string) => {
    const parsed = parseFloat(str)
    if (isNaN(parsed)) { setRaw(String(value)); return }
    const clamped = Math.max(min, max !== undefined ? Math.min(max, parsed) : parsed)
    onChange(clamped)
    setRaw(String(clamped))
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="label">{label}</label>
      <input
        type="number"
        className="input-base"
        value={raw}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value) }}
      />
      {hint && <p className="text-xs" style={{ color: '#64748b', fontSize: '0.75rem' }}>{hint}</p>}
    </div>
  )
}
