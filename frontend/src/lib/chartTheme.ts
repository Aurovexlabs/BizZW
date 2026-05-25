export const CHART_COLORS = {
  primary: 'var(--chart-primary)',
  primaryTint: 'var(--chart-primary-tint)',
  neutral: 'var(--chart-neutral)',
  success: 'var(--chart-success)',
  warning: 'var(--chart-warning)',
  danger: 'var(--chart-danger)',
  violet: 'var(--chart-violet)',
  cyan: 'var(--chart-cyan)',
  pink: 'var(--chart-pink)',
  orange: 'var(--chart-orange)',
  slateBar: 'var(--chart-slate-bar)',
  grid: 'var(--chart-grid)',
  axisText: 'var(--chart-axis-text)',
  tooltipBorder: 'var(--chart-tooltip-border)',
  tooltipBg: 'var(--chart-tooltip-bg)',
  tooltipText: 'var(--chart-tooltip-text)',
  tooltipCursor: 'var(--chart-tooltip-cursor)',
} as const;

export const CHART_SERIES = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.violet,
  CHART_COLORS.cyan,
] as const;

export const CHART_SERIES_EXTENDED = [
  ...CHART_SERIES,
  CHART_COLORS.pink,
  CHART_COLORS.orange,
] as const;

export const CHART_AXIS_TICK = {
  fontSize: 11,
  fill: CHART_COLORS.axisText,
} as const;

export const CHART_GRID = {
  strokeDasharray: '3 3',
  stroke: CHART_COLORS.grid,
} as const;

export const CHART_TOOLTIP = {
  contentStyle: {
    borderRadius: '12px',
    border: `1px solid ${CHART_COLORS.tooltipBorder}`,
    background: CHART_COLORS.tooltipBg,
    boxShadow: 'var(--chart-tooltip-shadow)',
  },
  labelStyle: {
    color: CHART_COLORS.tooltipText,
    fontWeight: 700,
    fontSize: '12px',
  },
  itemStyle: {
    color: CHART_COLORS.tooltipText,
    fontSize: '12px',
  },
} as const;

export const CHART_LEGEND_STYLE = {
  fontSize: '11px',
  color: CHART_COLORS.axisText,
} as const;
