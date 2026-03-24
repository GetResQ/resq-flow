import clsx from 'clsx'

interface DurationBadgeProps {
  durationMs?: number
  warningMs?: number
  criticalMs?: number
  faded?: boolean
  className?: string
}

export function formatDurationLabel(durationMs: number): string {
  if (durationMs < 1_000) {
    return `${Math.round(durationMs)}ms`
  }

  const totalSeconds = durationMs / 1_000
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`
  }

  const totalMinutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  if (totalMinutes < 60) {
    if (seconds === 0) {
      return `${totalMinutes}m`
    }
    return `${totalMinutes}m ${seconds}s`
  }

  const totalHours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (totalHours < 24) {
    if (minutes === 0) {
      return `${totalHours}h`
    }
    return `${totalHours}h ${minutes}m`
  }

  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (hours === 0) {
    return `${days}d`
  }
  return `${days}d ${hours}h`
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
      {formatDurationLabel(durationMs)}
    </span>
  )
}
