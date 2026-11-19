// Colour roles for guide visuals (light theme, matching the app).
// Series colours validated with the dataviz palette checker on #ffffff:
// purple/orange pass CVD separation (ΔE 32) and 3:1 contrast.
export const VIZ = {
  series1: '#7c3aed', // brand purple: primary series
  series2: '#eb6834', // orange: second series (bonus)
  seriesFill: 'rgba(124,58,237,0.12)',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  grid: '#e2e8f0',
  axis: '#cbd5e1',
  surface: '#ffffff',
  good: '#059669',
  critical: '#dc2626',
} as const
