const EASTERN_TIME_ZONE = 'America/New_York'

const easternTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
})

export function formatEasternTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : ''
  }

  return `${easternTimeFormatter.format(date)} ET`
}
