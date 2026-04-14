import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, CheckCircle2, Info, XCircle } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  CardContent,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import type { FlowEdgeConfig, FlowNodeConfig, SpanEntry, TraceJourney, TraceStatus } from '../types'
import { getJourneyOverviewModel, getJourneySummaryStep } from '../runPresentation'
import { DurationBadge, formatDurationLabel } from './DurationBadge'
import { PanelSkeleton } from './PanelSkeleton'
import { WaterfallChart } from './WaterfallChart'

type TabKey = 'overview' | 'timing'
type InsightTone = 'neutral' | 'success' | 'warning' | 'error'

interface TraceDetailContentProps {
  journey: TraceJourney
  flowNodes?: FlowNodeConfig[]
  flowEdges?: FlowEdgeConfig[]
  spans?: SpanEntry[]
  initialTab?: TabKey
  onTabChange?: (tab: TabKey) => void
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

export function TraceDetailContent({
  journey,
  flowNodes = [],
  flowEdges = [],
  spans = [],
  initialTab,
  onTabChange,
  onSelectNode,
}: TraceDetailContentProps) {
  const [tab, setTab] = useState<TabKey>(initialTab ?? 'overview')
  const [expandedCardKeys, setExpandedCardKeys] = useState<string[]>([])

  const overview = useMemo(
    () => getJourneyOverviewModel(journey, flowNodes, flowEdges),
    [flowEdges, flowNodes, journey],
  )
  const overviewCards = overview.cards

  const failedCard = useMemo(
    () => overviewCards.find((card) => card.status === 'error'),
    [overviewCards],
  )

  const errorNodeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const step of journey.steps) {
      if (step.status === 'error' && step.nodeId) ids.add(step.nodeId)
    }
    return ids
  }, [journey.steps])

  const slowestStep = useMemo(
    () =>
      [...overviewCards]
        .filter((card) => typeof card.durationMs === 'number')
        .sort((left, right) => (right.durationMs ?? 0) - (left.durationMs ?? 0))[0],
    [overviewCards],
  )

  const insights = useMemo(() => {
    const items: InsightItem[] = []

    if (journey.status === 'error' && failedCard) {
      items.push({
        tone: 'error',
        text: `This run failed in ${failedCard.nodeLabel}.`,
      })
    } else if (journey.status === 'running' || journey.status === 'partial') {
      const currentStep = getJourneySummaryStep(journey, flowNodes, flowEdges) ?? journey.steps.at(-1)
      const currentCard = overviewCards.at(-1)
      items.push({
        tone: 'warning',
        text:
          currentCard?.summary
            ? `This run is still active in ${currentCard.nodeLabel.toLowerCase()} — ${currentCard.summary}.`
            : currentStep
              ? 'This run is still active.'
              : 'This run is still active.',
      })
    }

    if (slowestStep?.durationMs && overviewCards.length > 1) {
      const slowestDuration = formatDurationLabel(slowestStep.durationMs)
      if (slowestDuration) {
        items.push({
          tone: journey.status === 'error' ? 'neutral' : 'warning',
          text: `Most time was spent in ${slowestStep.nodeLabel} (${slowestDuration}).`,
        })
      }
    }

    if (overviewCards.length > 0) {
      items.push({
        tone: 'neutral',
        text: `This run reached ${overviewCards.length} ${overviewCards.length === 1 ? 'story stage' : 'story stages'}.`,
      })
    }

    return items.slice(0, 3)
  }, [failedCard, flowEdges, flowNodes, journey, overviewCards, slowestStep])

  const identifierEntries = useMemo(() => [
    ['mailbox_owner', journey.identifiers.mailboxOwner],
    ['provider', journey.identifiers.provider],
    ['run_id', journey.identifiers.runId],
    ['thread_id', journey.identifiers.threadId],
    ['reply_draft_id', journey.identifiers.replyDraftId],
    ['job_id', journey.identifiers.jobId],
    ['request_id', journey.identifiers.requestId],
    ['content_hash', journey.identifiers.contentHash],
    ['journey_key', journey.identifiers.journeyKey],
  ].filter((entry): entry is [string, string] => Boolean(entry[1])), [journey.identifiers])

  return (
    <Tabs value={tab} onValueChange={(value) => { const next = value as TabKey; setTab(next); onTabChange?.(next) }} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--border-default)] px-4 py-3">
        <TabsList className="min-h-0 border-none bg-transparent p-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timing">Timing</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-0 min-h-0 flex-1 pt-0">
        <ScrollArea className="h-full">
          <div className="space-y-4 px-4 py-3">
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
              {overviewCards.length === 0 ? (
                <PanelSkeleton lines={2} />
              ) : (
                <div className="relative ml-3">
                  {/* Vertical connecting line */}
                  <div
                    className="absolute left-[7px] top-3 w-px bg-[var(--border-default)]"
                    style={{ height: `calc(100% - 24px)` }}
                  />

                  {overviewCards.map((card) => {
                    const isError = card.status === 'error'
                    const isActive = card.status === 'running' || card.status === 'partial'
                    const isExpanded = expandedCardKeys.includes(card.key)
                    const hasDetails = card.detailRows.length > 0
                    const targetNodeId = card.nodeId
                    const dotColor = isError
                      ? 'var(--status-error)'
                      : isActive
                        ? 'var(--status-active)'
                        : card.status === 'success'
                          ? 'var(--status-success)'
                          : 'var(--text-muted)'

                    return (
                      <div key={card.key} className="relative flex gap-3 pb-3">
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
                        <Card
                          className={`flex-1 ${isError ? 'border-l-[3px] border-l-[var(--status-error)]' : ''}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                className={`min-w-0 flex-1 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
                                onClick={
                                  hasDetails
                                    ? () =>
                                        setExpandedCardKeys((current) =>
                                          current.includes(card.key)
                                            ? current.filter((key) => key !== card.key)
                                            : [...current, card.key],
                                        )
                                    : undefined
                                }
                              >
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                                    {card.nodeLabel}
                                  </span>
                                  <Badge variant={journeyStatusVariant(card.status)}>{card.status}</Badge>
                                  <DurationBadge durationMs={card.durationMs} />
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{card.summary}</p>
                              </button>

                              <div className="flex shrink-0 items-center gap-1">
                                {!isExpanded && hasDetails ? (
                                  <span className="text-xs font-medium text-[var(--text-muted)]">
                                    +{card.detailRows.length} {card.detailRows.length === 1 ? 'step' : 'steps'}
                                  </span>
                                ) : null}
                                {onSelectNode && targetNodeId ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 shrink-0"
                                    aria-label={`Open ${card.nodeLabel} node`}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      onSelectNode(targetNodeId)
                                    }}
                                  >
                                    <ArrowUpRight className="size-4" />
                                  </Button>
                                ) : null}
                              </div>
                            </div>

                            {isExpanded && hasDetails ? (
                              <div className="mt-3 border-t border-[var(--border-default)] pt-3">
                                <div className="ml-2 border-l border-[color-mix(in_srgb,var(--border-default)_72%,transparent)] pl-4">
                                  {card.detailRows.map((detailRow) => (
                                    <div key={detailRow.key} className="relative flex items-start gap-3 py-1.5">
                                      <div className="absolute -left-[20px] top-[11px] size-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)]" />
                                      <span className="min-w-0 flex-1 text-[13px] leading-5 text-[var(--text-secondary)]">
                                        {detailRow.label}
                                      </span>
                                      {detailRow.durationMs ? (
                                        <span className="shrink-0 font-mono text-[11px] text-[var(--text-muted)]">
                                          {formatDurationLabel(detailRow.durationMs)}
                                        </span>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
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

            {identifierEntries.length > 0 ? (
              <details className="min-w-0 overflow-hidden rounded-lg border border-[var(--border-default)]">
                <summary className="cursor-pointer p-3 text-xs text-[var(--text-muted)]">Run details</summary>
                <div className="mx-3 mb-3 space-y-1.5">
                  {identifierEntries.map(([label, value]) => (
                    <div key={label} className="flex items-baseline gap-2 text-xs">
                      <span className="shrink-0 text-[var(--text-muted)]">{label}</span>
                      <span className="min-w-0 break-all font-mono text-[var(--text-primary)]">{value}</span>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="timing" className="mt-0 min-h-0 flex-1 pt-0">
        <ScrollArea className="h-full">
          <div className="px-4 py-3">
            <WaterfallChart spans={spans} errorNodeIds={errorNodeIds} onSelectNode={onSelectNode} />
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}
