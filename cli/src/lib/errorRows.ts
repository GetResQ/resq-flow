import { normalizeIdentifierValue, rowAttribute } from "./history.js";
import type {
  ClassifiedCliLogRow,
  CliLogRow,
  ErrorMatch,
  ErrorMatchReason,
} from "../types.js";

const HARD_ERROR_REASON_ORDER: ErrorMatchReason[] = [
  "status=error",
  "error_type",
  "error_message",
];

const CRITICAL_REASON_ORDER: ErrorMatchReason[] = ["retryable=true"];

export function classifyErrorRow(row: CliLogRow): ErrorMatch | undefined {
  const reasons = collectErrorMatchReasons(row);
  if (reasons.length === 0) {
    return undefined;
  }

  const classification = reasons.some((reason) => HARD_ERROR_REASON_ORDER.includes(reason))
    ? "error"
    : "critical";

  return {
    classification,
    matchReasons: reasons,
  };
}

export function classifyErrorRows(
  rows: CliLogRow[],
  options: { hardOnly?: boolean } = {},
): ClassifiedCliLogRow[] {
  const classified: ClassifiedCliLogRow[] = [];

  for (const row of rows) {
    const match = classifyErrorRow(row);
    if (!match) {
      continue;
    }

    if (options.hardOnly && match.classification !== "error") {
      continue;
    }

    classified.push({
      ...row,
      ...match,
    });
  }

  return classified;
}

export function isHardErrorRow(row: CliLogRow): boolean {
  return classifyErrorRow(row)?.classification === "error";
}

function collectErrorMatchReasons(row: CliLogRow): ErrorMatchReason[] {
  const reasons = new Set<ErrorMatchReason>();

  if (normalizeIdentifierValue(row.status) === "error") {
    reasons.add("status=error");
  }

  if (rowAttribute(row, "error_type")) {
    reasons.add("error_type");
  }

  if (rowAttribute(row, "error_message")) {
    reasons.add("error_message");
  }

  if (rowAttribute(row, "retryable") === "true") {
    reasons.add("retryable=true");
  }

  return [...HARD_ERROR_REASON_ORDER, ...CRITICAL_REASON_ORDER].filter((reason) =>
    reasons.has(reason),
  );
}
