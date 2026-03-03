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
    border: 'border-slate-500/70',
    bg: 'bg-slate-900/70',
    text: 'text-slate-100',
    glow: 'shadow-[0_0_0_1px_rgba(148,163,184,0.2)]',
  },
  blue: {
    border: 'border-sky-500/70',
    bg: 'bg-sky-950/70',
    text: 'text-sky-100',
    glow: 'shadow-[0_0_24px_rgba(14,165,233,0.25)]',
  },
  green: {
    border: 'border-emerald-500/70',
    bg: 'bg-emerald-950/70',
    text: 'text-emerald-100',
    glow: 'shadow-[0_0_24px_rgba(16,185,129,0.25)]',
  },
  yellow: {
    border: 'border-amber-500/70',
    bg: 'bg-amber-950/70',
    text: 'text-amber-100',
    glow: 'shadow-[0_0_24px_rgba(245,158,11,0.25)]',
  },
  orange: {
    border: 'border-orange-500/70',
    bg: 'bg-orange-950/70',
    text: 'text-orange-100',
    glow: 'shadow-[0_0_24px_rgba(249,115,22,0.25)]',
  },
  red: {
    border: 'border-rose-600/80',
    bg: 'bg-rose-950/70',
    text: 'text-rose-100',
    glow: 'shadow-[0_0_26px_rgba(244,63,94,0.35)]',
  },
  purple: {
    border: 'border-violet-500/70',
    bg: 'bg-violet-950/70',
    text: 'text-violet-100',
    glow: 'shadow-[0_0_24px_rgba(139,92,246,0.25)]',
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
    return 'ring-2 ring-sky-400/55 animate-flow-glow'
  }
  if (status === 'success') {
    return 'ring-2 ring-emerald-400/55'
  }
  if (status === 'error') {
    return 'ring-2 ring-rose-500/65'
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
