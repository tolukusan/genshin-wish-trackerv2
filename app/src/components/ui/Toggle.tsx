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
        <span style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{label}</span>
        {hint && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{hint}</span>}
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
          backgroundColor: checked ? '#7c3aed' : '#475569',
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
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s',
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
          }}
        />
      </button>
    </label>
  )
}
