import clsx from 'clsx'

interface DurationBadgeProps {
  durationMs?: number
  warningMs?: number
  criticalMs?: number
  faded?: boolean
  className?: string
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1_000) {
    return `${Math.round(durationMs)}ms`
  }

  return `${(durationMs / 1_000).toFixed(1)}s`
}

export function DurationBadge({
  durationMs,
  warningMs = 1_000,
  criticalMs = 5_000,
  faded = false,
  className,
}: DurationBadgeProps) {
  if (typeof durationMs !== 'number') {
    return null
  }

  const toneClass =
    durationMs >= criticalMs
      ? 'bg-rose-900/40 text-rose-200 ring-rose-500/40'
      : durationMs >= warningMs
        ? 'bg-amber-900/35 text-amber-200 ring-amber-500/30'
        : 'bg-emerald-900/35 text-emerald-200 ring-emerald-500/30'

  return (
    <span
      data-testid="duration-badge"
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-opacity',
        toneClass,
        faded ? 'opacity-65 hover:opacity-100' : 'opacity-100',
        className,
      )}
    >
      {formatDuration(durationMs)}
    </span>
  )
}
