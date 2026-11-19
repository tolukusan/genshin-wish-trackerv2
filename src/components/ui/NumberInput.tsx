import { useState } from 'react'

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
  const [prevValue, setPrevValue] = useState(value)

  // Sync when value changes externally (adjusting state during render,
  // per https://react.dev/learn/you-might-not-need-an-effect). Keep the raw
  // text when it already parses to the new value, e.g. "1." while typing.
  if (value !== prevValue) {
    setPrevValue(value)
    const parsed = parseFloat(raw)
    if (isNaN(parsed) || parsed !== value) setRaw(String(value))
  }

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
        onChange={(e) => {
          setRaw(e.target.value)
          const parsed = parseFloat(e.target.value)
          if (!isNaN(parsed) && e.target.value !== '') {
            const clamped = Math.max(min, max !== undefined ? Math.min(max, parsed) : parsed)
            onChange(clamped)
          }
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value) }}
      />
      {hint && <p className="text-xs" style={{ color: '#64748b', fontSize: '0.75rem' }}>{hint}</p>}
    </div>
  )
}
