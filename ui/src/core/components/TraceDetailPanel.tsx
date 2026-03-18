import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'

import { formatEasternTime } from '../time'
import type { SpanEntry, TraceJourney, TraceStage, TraceStatus } from '../types'
import { DurationBadge } from './DurationBadge'
import { PanelSkeleton } from './PanelSkeleton'
import { WaterfallChart } from './WaterfallChart'

type TabKey = 'overview' | 'waterfall' | 'advanced'
type InsightTone = 'neutral' | 'success' | 'warning' | 'error'

interface TraceDetailContentProps {
  journey: TraceJourney
  spans?: SpanEntry[]
  onSelectNode?: (nodeId: string) => void
}

interface InsightItem {
  tone: InsightTone
  text: string
}

function journeyStatusVariant(status: TraceStatus): 'default' | 'destructive' | 'success' | 'warning' {
  if (status === 'error') {
    return 'destructive'
  }
  if (status === 'success') {
    return 'success'
  }
  if (status === 'partial') {
    return 'warning'
  }
  return 'default'
}

function insightToneClasses(tone: InsightTone): string {
  if (tone === 'success') {
    return 'border-[var(--status-success)] [background-color:color-mix(in_srgb,var(--status-success)_12%,transparent)] text-[var(--text-primary)]'
  }
  if (tone === 'warning') {
    return 'border-[var(--status-warning)] [background-color:color-mix(in_srgb,var(--status-warning)_12%,transparent)] text-[var(--text-primary)]'
  }
  if (tone === 'error') {
    return 'border-[var(--status-error)] [background-color:color-mix(in_srgb,var(--status-error)_12%,transparent)] text-[var(--text-primary)]'
  }
  return 'border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)]'
}

function insightIcon(tone: InsightTone) {
  if (tone === 'success') return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--status-success)]" />
  if (tone === 'warning') return <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--status-warning)]" />
  if (tone === 'error') return <XCircle className="mt-0.5 size-4 shrink-0 text-[var(--status-error)]" />
  return <Info className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]" />
}

function formatDurationText(durationMs?: number): string | null {
  if (typeof durationMs !== 'number') {
    return null
  }

  if (durationMs < 1_000) {
    return `${Math.round(durationMs)}ms`
  }

  return `${(durationMs / 1_000).toFixed(1)}s`
}

function stepLabel(step: TraceStage): string {
  return step.label || step.nodeId || step.stageId
}

function stageErrorSummary(stage: TraceStage): string | undefined {
  const attrs = stage.attrs
  const errorMessage = typeof attrs?.error_message === 'string' ? attrs.error_message : undefined
  const errorClass = typeof attrs?.error_class === 'string' ? attrs.error_class : undefined
  const errorCode = typeof attrs?.error_code === 'string' ? attrs.error_code : undefined
  const retryable = typeof attrs?.retryable === 'boolean' ? attrs.retryable : undefined

  if (errorMessage) {
    return errorMessage
  }

  if (errorClass && errorCode) {
    return retryable === undefined ? `${errorClass}:${errorCode}` : `${errorClass}:${errorCode} retryable=${retryable}`
  }

  if (errorClass || errorCode) {
    return [errorClass, errorCode].filter(Boolean).join(':')
  }

  return stage.errorSummary
}

function defaultSelectedStepId(journey: TraceJourney): string | undefined {
  return journey.stages.find((stage) => stage.status === 'error')?.stageId ?? journey.stages.at(-1)?.stageId
}

export function TraceDetailContent({ journey, spans = [], onSelectNode }: TraceDetailContentProps) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [selectedStageId, setSelectedStageId] = useState<string | undefined>(defaultSelectedStepId(journey))

  const selectedStage = useMemo(
    () => journey.stages.find((stage) => stage.stageId === selectedStageId) ?? journey.stages.at(-1) ?? journey.stages[0],
    [journey.stages, selectedStageId],
  )

  const failedStep = useMemo(
    () => journey.stages.find((stage) => stage.status === 'error'),
    [journey.stages],
  )

  const slowestStep = useMemo(
    () =>
      [...journey.stages]
        .filter((stage) => typeof stage.durationMs === 'number')
        .sort((left, right) => (right.durationMs ?? 0) - (left.durationMs ?? 0))[0],
    [journey.stages],
  )

  const insights = useMemo(() => {
    const items: InsightItem[] = []

    if (journey.status === 'error' && failedStep) {
      items.push({
        tone: 'error',
        text: `This run failed in ${stepLabel(failedStep)}.`,
      })
    } else if (journey.status === 'running' || journey.status === 'partial') {
      const currentStep = journey.stages.at(-1)
      items.push({
        tone: 'warning',
        text: currentStep ? `This run is still active in ${stepLabel(currentStep)}.` : 'This run is still active.',
      })
    }

    if (slowestStep && slowestStep.durationMs && journey.stages.length > 1) {
      const slowestDuration = formatDurationText(slowestStep.durationMs)
      if (slowestDuration) {
        items.push({
          tone: journey.status === 'error' ? 'neutral' : 'warning',
          text: `Most time was spent in ${stepLabel(slowestStep)} (${slowestDuration}).`,
        })
      }
    }

    if (journey.stages.length > 1) {
      items.push({
        tone: 'neutral',
        text: `This run reached ${journey.stages.length} steps.`,
      })
    }

    return items.slice(0, 3)
  }, [failedStep, journey.stages, journey.status, slowestStep])

  const focusLabel = failedStep ? 'Failed In' : 'Slowest Step'
  const focusValue = failedStep ? stepLabel(failedStep) : slowestStep ? stepLabel(slowestStep) : 'None yet'
  const focusMeta = !failedStep && slowestStep?.durationMs ? formatDurationText(slowestStep.durationMs) : null

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--border-default)] px-4 py-3">
        <TabsList className="min-h-0 border-none bg-transparent p-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="waterfall">Waterfall</TabsTrigger>
          <TabsTrigger value="advanced">Advanced telemetry</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-0 min-h-0 flex-1 pt-0">
        <ScrollArea className="h-full">
          <div className="space-y-4 px-4 py-3">
            <section className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Status</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold capitalize text-[var(--text-primary)]">{journey.status}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Duration</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-[var(--text-primary)]">
                    {formatDurationText(journey.durationMs) ?? 'Running'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Last Updated</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-[var(--text-primary)]">{formatEasternTime(journey.lastUpdatedAt)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{focusLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="truncate text-2xl font-semibold text-[var(--text-primary)]">{focusValue}</p>
                  {focusMeta ? <p className="mt-1 text-xs text-[var(--text-muted)]">{focusMeta}</p> : null}
                </CardContent>
              </Card>
            </section>

            {insights.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Key Insights</h3>
                {insights.map((insight, index) => (
                  <div
                    key={`${insight.text}-${index}`}
                    className={`flex items-start gap-2.5 rounded-lg border border-l-[3px] p-3 text-sm leading-6 ${insightToneClasses(insight.tone)}`}
                  >
                    {insightIcon(insight.tone)}
                    <span>{insight.text}</span>
                  </div>
                ))}
              </section>
            ) : null}

            <section className="space-y-2">
              <h3 className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Path Through Flow</h3>
              {journey.stages.length === 0 ? (
                <PanelSkeleton lines={2} />
              ) : (
                <div className="relative ml-3">
                    {/* Vertical connecting line */}
                  <div
                    className="absolute left-[7px] top-3 w-px bg-[var(--border-default)]"
                    style={{ height: `calc(100% - 24px)` }}
                  />

                  {journey.stages.map((stage, index) => {
                    const errorSummary = stageErrorSummary(stage)
                    const isError = stage.status === 'error'
                    const isActive = stage.status === 'running' || stage.status === 'partial'
                    const dotColor = isError
                      ? 'var(--status-error)'
                      : isActive
                        ? 'var(--status-active)'
                        : stage.status === 'success'
                          ? 'var(--status-success)'
                          : 'var(--text-muted)'

                    return (
                      <div key={`${stage.stageId}-${index}`} className="relative flex gap-3 pb-3">
                          {/* Timeline dot */}
                        <div className="relative z-10 mt-3 flex shrink-0 items-start">
                          <div
                            className="size-[15px] rounded-full border-2 border-[var(--surface-raised)]"
                            style={{
                              backgroundColor: dotColor,
                              boxShadow: isActive ? `0 0 6px ${dotColor}` : undefined,
                              animation: isActive ? 'flowPulse 2s ease-in-out infinite' : undefined,
                            }}
                          />
                        </div>

                        {/* Step card */}
                        <Card className={`flex-1 ${isError ? 'border-l-[3px] border-l-[var(--status-error)]' : ''}`}>
                          <CardContent className="p-3">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--text-primary)]">{stepLabel(stage)}</span>
                              <Badge variant={journeyStatusVariant(stage.status)}>{stage.status}</Badge>
                              <DurationBadge durationMs={stage.durationMs} />
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                              <span>step {index + 1}</span>
                              {stage.nodeId ? <span>node {stage.nodeId}</span> : null}
                              {typeof stage.attempt === 'number' ? <span>attempt {stage.attempt}</span> : null}
                            </div>
                            {errorSummary ? (
                              <div className="mt-2 rounded-lg border border-[var(--status-error)] px-3 py-2 text-xs text-[var(--text-primary)] [background-color:color-mix(in_srgb,var(--status-error)_12%,transparent)]">
                                {errorSummary}
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="waterfall" className="mt-0 min-h-0 flex-1 pt-0">
        <ScrollArea className="h-full">
          <div className="px-4 py-3">
            <WaterfallChart spans={spans} onSelectNode={onSelectNode} />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="advanced" className="mt-0 min-h-0 flex-1 pt-0">
        <ScrollArea className="h-full">
          <div className="space-y-4 px-4 py-3">
            <Card>
              <CardContent className="p-3">
                <h3 className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Run Telemetry</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Raw Events</div>
                      <div className="mt-1 text-sm text-[var(--text-primary)]">{journey.eventCount}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Steps</div>
                      <div className="mt-1 text-sm text-[var(--text-primary)]">{journey.stages.length}</div>
                    </CardContent>
                  </Card>
                </div>
                <Card className="mt-3">
                  <CardContent className="p-3">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Run ID</div>
                    <code className="mt-1 block break-all text-xs text-[var(--text-primary)]">{journey.traceId}</code>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <section className="space-y-2">
              <h3 className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Step Telemetry</h3>
              <div className="space-y-2">
                {journey.stages.map((stage, index) => {
                  const selected = selectedStage?.stageId === stage.stageId
                  return (
                    <button
                      key={`${stage.stageId}-${index}`}
                      type="button"
                      onClick={() => setSelectedStageId(stage.stageId)}
                      className={`w-full rounded-lg border p-3 text-left ${
                        selected
                          ? 'border-[var(--border-accent)] bg-[var(--accent-primary-muted)]'
                          : 'border-[var(--border-default)] bg-[var(--surface-primary)]/40'
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-sm text-[var(--text-primary)]">{stepLabel(stage)}</span>
                        <Badge variant={journeyStatusVariant(stage.status)}>{stage.status}</Badge>
                        <DurationBadge durationMs={stage.durationMs} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span>
                          seq {stage.startSeq} {'->'} {stage.endSeq}
                        </span>
                        {typeof stage.attempt === 'number' ? <span>attempt {stage.attempt}</span> : null}
                        {stage.nodeId ? <span>node {stage.nodeId}</span> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <Card>
              <CardContent className="p-3">
                <h3 className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Selected Step Attributes</h3>
                <pre className="mt-3 overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-xs text-[var(--text-primary)]">
                  {JSON.stringify(selectedStage?.attrs ?? {}, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}
