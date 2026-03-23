import { resolveWindow } from "./config.js";
import { requestJson } from "./http.js";
import type {
  CliLogRow,
  JsonObject,
  JsonValue,
  RelayFlowEvent,
  RelayHistoryPayload,
} from "../types.js";

export interface HistoryRequestOptions {
  baseUrl: string;
  flowId: string;
  window?: string | undefined;
  query?: string | undefined;
  limit?: number | undefined;
  timeoutMs: number;
  fetchImpl?: typeof fetch | undefined;
}

export async function fetchHistoryRows({
  baseUrl,
  flowId,
  window,
  query,
  limit,
  timeoutMs,
  fetchImpl,
}: HistoryRequestOptions): Promise<CliLogRow[]> {
  const payload = await requestJson<RelayHistoryPayload>({
    baseUrl,
    path: "/v1/history",
    timeoutMs,
    fetchImpl,
    query: {
      flow_id: flowId,
      window: resolveWindow(window),
      query,
      limit,
    },
  });

  return payload.events
    .filter((event) => event.type === "log")
    .map((event) => normalizeLogRow(event, flowId));
}

export function normalizeLogRow(
  event: RelayFlowEvent,
  requestedFlowId?: string,
): CliLogRow {
  const attributes = event.attributes ?? ({} as JsonObject);

  return {
    seq: event.seq,
    timestamp: event.timestamp,
    flowId:
      stringAttribute(attributes.flow_id) ??
      firstString(event.matched_flow_ids) ??
      requestedFlowId ??
      "unknown",
    runId: stringAttribute(attributes.run_id),
    traceId: event.trace_id,
    stageId: stringAttribute(attributes.stage_id),
    stageName: stringAttribute(attributes.stage_name),
    componentId: stringAttribute(attributes.component_id),
    status: stringAttribute(attributes.status),
    message:
      event.message ??
      stringAttribute(attributes.message) ??
      stringAttribute(attributes.event) ??
      "",
    attributes,
  };
}

export function preferredStageLabel(row: CliLogRow): string {
  return row.stageId ?? row.stageName ?? row.componentId ?? "-";
}

export function stringAttribute(value: JsonValue | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function firstString(values: string[] | undefined): string | undefined {
  return values && values.length > 0 ? values[0] : undefined;
}
