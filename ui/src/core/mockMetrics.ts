import type { FlowConfig, TraceStatus } from './types'

export type MetricsWindow = '1h' | '6h' | '24h'

export interface MockRecentRun {
  traceId: string
  rootEntity?: string
  status: TraceStatus
  currentStep: string
  durationMs?: number
  lastUpdatedAt: string
  errorSummary?: string
}

export interface FlowMetricsSnapshot {
  flowId: string
  health: 'success' | 'warning' | 'error'
  runCount: number
  successRate: number
  p95Ms: number
  errorCount: number
  throughputSeries: number[]
  errorSeries: number[]
  latencySeries: number[]
  recentRuns: MockRecentRun[]
}

const baseSnapshots: Record<string, FlowMetricsSnapshot> = {
  'mail-pipeline': {
    flowId: 'mail-pipeline',
    health: 'success',
    runCount: 842,
    successRate: 97,
    p95Ms: 1860,
    errorCount: 12,
    throughputSeries: [18, 24, 22, 30, 28, 35, 33, 29, 32, 38, 36, 41],
    errorSeries: [0, 1, 0, 2, 1, 1, 0, 3, 1, 0, 1, 0],
    latencySeries: [920, 1080, 980, 1240, 1190, 1420, 1310, 1175, 1260, 1510, 1470, 1860],
    recentRuns: [
      {
        traceId: 'run-mail-001',
        rootEntity: 'support@resq.dev',
        status: 'success',
        currentStep: 'send-process',
        durationMs: 1330,
        lastUpdatedAt: '2026-03-17T13:24:00.000Z',
      },
      {
        traceId: 'run-mail-002',
        rootEntity: 'billing@resq.dev',
        status: 'error',
        currentStep: 'analyze-decision',
        durationMs: 2190,
        lastUpdatedAt: '2026-03-17T13:18:00.000Z',
        errorSummary: 'provider timeout',
      },
      {
        traceId: 'run-mail-003',
        rootEntity: 'hello@resq.dev',
        status: 'partial',
        currentStep: 'extract-worker',
        durationMs: 980,
        lastUpdatedAt: '2026-03-17T13:11:00.000Z',
      },
    ],
  },
}

function defaultSnapshot(flow: FlowConfig): FlowMetricsSnapshot {
  return {
    flowId: flow.id,
    health: flow.hasGraph ? 'success' : 'warning',
    runCount: flow.hasGraph ? 126 : 48,
    successRate: flow.hasGraph ? 98 : 93,
    p95Ms: flow.hasGraph ? 1240 : 1760,
    errorCount: flow.hasGraph ? 4 : 7,
    throughputSeries: [10, 12, 11, 14, 13, 15, 14, 16, 18, 17, 19, 21],
    errorSeries: [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    latencySeries: [860, 910, 920, 980, 1020, 1090, 1120, 1180, 1260, 1330, 1410, 1490],
    recentRuns: [
      {
        traceId: `${flow.id}-recent-001`,
        rootEntity: flow.name,
        status: 'success',
        currentStep: flow.hasGraph ? 'Completed' : 'Metrics only',
        durationMs: flow.hasGraph ? 980 : 1430,
        lastUpdatedAt: '2026-03-17T12:54:00.000Z',
      },
    ],
  }
}

function windowScale(window: MetricsWindow) {
  if (window === '1h') {
    return 0.2
  }
  if (window === '6h') {
    return 0.55
  }
  return 1
}

function scaleSeries(series: number[], factor: number) {
  return series.map((value) => Math.max(0, Math.round(value * factor)))
}

function scaleSnapshot(snapshot: FlowMetricsSnapshot, window: MetricsWindow): FlowMetricsSnapshot {
  const factor = windowScale(window)
  const throughputSeries = scaleSeries(snapshot.throughputSeries, factor)
  const errorSeries = scaleSeries(snapshot.errorSeries, factor)
  const latencySeries = snapshot.latencySeries.map((value) =>
    Math.max(120, Math.round(value * (0.82 + factor * 0.18))),
  )
  const runCount = throughputSeries.reduce((sum, value) => sum + value, 0)
  const errorCount = errorSeries.reduce((sum, value) => sum + value, 0)

  return {
    ...snapshot,
    runCount,
    errorCount,
    p95Ms: Math.max(...latencySeries),
    throughputSeries,
    errorSeries,
    latencySeries,
  }
}

export function getMockFlowMetrics(flows: FlowConfig[], window: MetricsWindow = '24h'): FlowMetricsSnapshot[] {
  return flows.map((flow) => scaleSnapshot(baseSnapshots[flow.id] ?? defaultSnapshot(flow), window))
}

export function getMockFlowMetric(flow: FlowConfig, window: MetricsWindow = '24h'): FlowMetricsSnapshot {
  return getMockFlowMetrics([flow], window)[0]
}
