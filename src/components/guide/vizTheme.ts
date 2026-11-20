// Colour roles for guide visuals (Nocturne dark theme, matching the app).
// The primary series is the accent's light step; the second series is a warm
// amber so the two stay apart for colour-vision deficiencies on the dark ground.
export const VIZ = {
  series1: '#b5abfc', // accent-400: primary series
  series2: '#e8a66b', // warm amber: second series (bonus)
  seriesFill: 'rgba(145,132,217,0.18)',
  textPrimary: '#e9e9ed',
  textSecondary: '#cfd3e5',
  textMuted: '#b2b6ca',
  grid: '#3f424d',
  axis: '#595d6c',
  surface: '#232532',
  good: '#8fd6b3',
  critical: '#f0a3a3',
} as const
