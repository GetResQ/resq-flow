export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

export type JsonObject = Record<string, JsonValue>;

export interface RelayHealthPayload {
  status: string;
}

export interface RelayIngestHealthPayload {
  status: string;
  trace_count_total: number;
  log_count_total: number;
  trace_count_last_60s: number;
  log_count_last_60s: number;
  last_trace_at: string | null;
  last_log_at: string | null;
  traces_recent: boolean;
  logs_recent: boolean;
  recent_buffer_size: number;
  ws_lagged_events_total: number;
}

export interface RelayCapabilitiesPayload {
  service: string;
  bind: string;
  supported_ingest: {
    traces_path: string;
    logs_path: string;
    ws_path: string;
  };
  recommended_mode: string;
  supported_modes: string[];
}

export interface RelayFlowEvent {
  type: string;
  seq?: number;
  timestamp: string;
  event_kind?: string;
  node_key?: string;
  queue_delta?: number;
  span_name?: string;
  service_name?: string;
  trace_id?: string;
  span_id?: string;
  parent_span_id?: string;
  start_time?: string;
  end_time?: string;
  duration_ms?: number;
  attributes: JsonObject;
  message?: string;
  matched_flow_ids?: string[];
}

export interface RelayHistoryPayload {
  from: string;
  to: string;
  query?: string | null;
  flow_id?: string | null;
  events: RelayFlowEvent[];
  log_count: number;
  span_count: number;
  truncated: boolean;
  warnings?: string[];
}

export interface CliLogRow {
  seq?: number;
  timestamp: string;
  flowId: string;
  runId?: string;
  traceId?: string;
  stageId?: string;
  stageName?: string;
  componentId?: string;
  status?: string;
  message: string;
  attributes: JsonObject;
  rawType: string;
}
