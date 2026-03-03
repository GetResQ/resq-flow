import { Handle, Position } from '@xyflow/react'
import clsx from 'clsx'

import type { HandlePosition, NodeHandleConfig, NodeStatus } from '../types'

const positionMap: Record<HandlePosition, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
}

const colorMap: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  gray: {
    border: 'border-slate-600/50',
    bg: 'bg-slate-800/60',
    text: 'text-slate-300',
    glow: '',
  },
  blue: {
    border: 'border-sky-600/40',
    bg: 'bg-sky-950/40',
    text: 'text-sky-200',
    glow: '',
  },
  green: {
    border: 'border-emerald-600/40',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-200',
    glow: '',
  },
  yellow: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/40',
    text: 'text-amber-200',
    glow: '',
  },
  orange: {
    border: 'border-orange-500/40',
    bg: 'bg-orange-950/40',
    text: 'text-orange-200',
    glow: '',
  },
  red: {
    border: 'border-rose-500/40',
    bg: 'bg-rose-950/40',
    text: 'text-rose-200',
    glow: '',
  },
  purple: {
    border: 'border-violet-500/40',
    bg: 'bg-violet-950/40',
    text: 'text-violet-200',
    glow: '',
  },
}

const iconMap: Record<string, string> = {
  worker: 'W',
  queue: 'Q',
  s3: 'S3',
  postgres: 'PG',
  redis: 'RD',
  cron: 'CR',
  bot: 'BOT',
  external: 'EXT',
}

export function resolveTone(color: string | undefined) {
  if (!color) {
    return colorMap.gray
  }

  return colorMap[color] ?? colorMap.gray
}

export function resolveIcon(icon: string | undefined): string | null {
  if (!icon) {
    return null
  }

  return iconMap[icon] ?? icon.toUpperCase().slice(0, 3)
}

export function statusGlowClass(status: NodeStatus | undefined): string {
  if (status === 'active') {
    return 'ring-1 ring-sky-400/40'
  }
  if (status === 'success') {
    return 'ring-1 ring-emerald-400/40'
  }
  if (status === 'error') {
    return 'ring-1 ring-rose-500/50'
  }
  return 'ring-1 ring-slate-700/40'
}

export function renderHandles(
  nodeId: string,
  handles: NodeHandleConfig[] | undefined,
  defaults: NodeHandleConfig[],
) {
  const merged = handles && handles.length > 0 ? handles : defaults

  return merged.flatMap((handle, index) => {
    const position = positionMap[handle.position]
    const idBase = handle.id ? `${nodeId}-${handle.id}` : `${nodeId}-${handle.position}-${index}`

    if (handle.type === 'both') {
      return [
        <Handle
          key={`${idBase}-target`}
          id={`${idBase}-target`}
          type="target"
          position={position}
          className="!h-2 !w-2 !border !border-white/30 !bg-slate-700"
        />,
        <Handle
          key={`${idBase}-source`}
          id={`${idBase}-source`}
          type="source"
          position={position}
          className="!h-2 !w-2 !border !border-white/30 !bg-slate-700"
        />,
      ]
    }

    return (
      <Handle
        key={idBase}
        id={idBase}
        type={handle.type ?? 'source'}
        position={position}
        className="!h-2 !w-2 !border !border-white/30 !bg-slate-700"
      />
    )
  })
}

export function nodeContainerClass({
  color,
  status,
  borderStyle,
}: {
  color?: string
  status?: NodeStatus
  borderStyle?: 'solid' | 'dashed'
}) {
  const tone = resolveTone(color)

  return clsx(
    'border text-[11px] transition-all duration-300',
    tone.border,
    tone.bg,
    tone.text,
    statusGlowClass(status),
    tone.glow,
    borderStyle === 'dashed' && 'border-dashed',
  )
}
