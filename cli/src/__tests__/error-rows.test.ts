import { describe, expect, it } from "bun:test";

import { classifyErrorRow, classifyErrorRows, isHardErrorRow } from "../lib/errorRows.js";
import type { CliLogRow } from "../types.js";

function createRow(overrides: Partial<CliLogRow> = {}): CliLogRow {
  return {
    timestamp: "2026-03-23T18:41:06.901Z",
    message: "log message",
    attributes: {},
    ...overrides,
  };
}

describe("errorRows", () => {
  it("classifies status=error rows as hard errors", () => {
    const row = createRow({
      status: "error",
      attributes: {
        status: "error",
      },
    });

    expect(classifyErrorRow(row)).toEqual({
      classification: "error",
      matchReasons: ["status=error"],
    });
    expect(isHardErrorRow(row)).toBe(true);
  });

  it("classifies error_type rows as hard errors", () => {
    const row = createRow({
      attributes: {
        error_type: "AuthError",
      },
    });

    expect(classifyErrorRow(row)).toEqual({
      classification: "error",
      matchReasons: ["error_type"],
    });
  });

  it("classifies error_message rows as hard errors", () => {
    const row = createRow({
      attributes: {
        error_message: "token refresh failed",
      },
    });

    expect(classifyErrorRow(row)).toEqual({
      classification: "error",
      matchReasons: ["error_message"],
    });
  });

  it("classifies retryable=true rows as critical", () => {
    const row = createRow({
      attributes: {
        retryable: true,
      },
    });

    expect(classifyErrorRow(row)).toEqual({
      classification: "critical",
      matchReasons: ["retryable=true"],
    });
    expect(isHardErrorRow(row)).toBe(false);
  });

  it("keeps hard errors ahead of retryable reasons when both are present", () => {
    const row = createRow({
      status: "error",
      attributes: {
        status: "error",
        error_type: "TimeoutError",
        retryable: true,
      },
    });

    expect(classifyErrorRow(row)).toEqual({
      classification: "error",
      matchReasons: ["status=error", "error_type", "retryable=true"],
    });
  });

  it("filters non-matching rows and supports hard-only mode", () => {
    const rows = [
      createRow({
        message: "ordinary info",
      }),
      createRow({
        message: "retry later",
        attributes: {
          retryable: true,
        },
      }),
      createRow({
        message: "oauth expired",
        status: "error",
        attributes: {
          status: "error",
        },
      }),
    ];

    expect(classifyErrorRows(rows)).toMatchObject([
      {
        message: "retry later",
        classification: "critical",
      },
      {
        message: "oauth expired",
        classification: "error",
      },
    ]);
    expect(classifyErrorRows(rows, { hardOnly: true })).toMatchObject([
      {
        message: "oauth expired",
        classification: "error",
      },
    ]);
  });
});
