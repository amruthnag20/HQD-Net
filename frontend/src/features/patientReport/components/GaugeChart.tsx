const TONE_COLOR: Record<'success' | 'danger' | 'warning' | 'neutral', string> = {
  success: 'var(--color-success)',
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  neutral: 'var(--color-muted)',
}

/**
 * Semicircular probability gauge. Purely presentational — the percentage and
 * tone are supplied by the caller from real model output; this component
 * performs no calculation of its own beyond drawing the arc.
 */
export function GaugeChart({
  percent,
  tone = 'neutral',
  label,
}: {
  percent: number | null
  tone?: 'success' | 'danger' | 'warning' | 'neutral'
  label: string
}) {
  const clamped = percent != null && Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0
  const r = 80
  const cx = 100
  const cy = 100
  const circumference = Math.PI * r
  const dash = (clamped / 100) * circumference
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`

  return (
    <div className="relative mx-auto w-full max-w-[220px]">
      <svg viewBox="0 0 200 120" className="w-full">
        <path d={arcPath} fill="none" stroke="var(--color-line-subtle)" strokeWidth={14} strokeLinecap="round" />
        {percent != null && (
          <path
            d={arcPath}
            fill="none"
            stroke={TONE_COLOR[tone]}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-2 flex flex-col items-center">
        <span className="font-display text-4xl leading-none text-primary">
          {percent != null ? `${clamped.toFixed(0)}%` : '—'}
        </span>
        <span className="mt-1 text-xs text-muted">{label}</span>
      </div>
    </div>
  )
}
