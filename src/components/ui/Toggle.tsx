interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}

export function Toggle({ label, checked, onChange, hint }: ToggleProps) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', cursor: 'pointer' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>{label}</span>
        {hint && <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-400)' }}>{hint}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          width: '40px',
          height: '24px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
          backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-neutral-700)',
          transition: 'background-color 0.2s',
          outline: 'none',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            width: '16px',
            height: '16px',
            borderRadius: '9999px',
            backgroundColor: 'var(--color-neutral-100)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s',
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
          }}
        />
      </button>
    </label>
  )
}
