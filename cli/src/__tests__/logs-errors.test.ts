import { describe, expect, it } from "bun:test";

import { runCli } from "../index.js";

function createBufferedIo() {
  let stdout = "";
  let stderr = "";

  return {
    io: {
      stdout(text: string) {
        stdout += text;
      },
      stderr(text: string) {
        stderr += text;
      },
    },
    readStdout() {
      return stdout;
    },
    readStderr() {
      return stderr;
    },
  };
}

function createJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

function createHistoryFetchMock(): typeof fetch {
  return (async () =>
    createJsonResponse({
      from: "2026-03-23T18:00:00.000Z",
      to: "2026-03-23T18:15:00.000Z",
      flow_id: "mail-pipeline",
      events: [
        {
          type: "log",
          timestamp: "2026-03-23T18:41:02.110Z",
          trace_id: "trace-incoming-201",
          message: "fetched 12 Gmail threads",
          attributes: {
            flow_id: "mail-pipeline",
            run_id: "thread-201",
            thread_id: "thread-201",
            component_id: "incoming-worker",
            step_id: "fetch-threads",
            status: "ok",
          },
        },
        {
          type: "log",
          timestamp: "2026-03-23T18:41:04.110Z",
          trace_id: "trace-incoming-201",
          message: "provider timeout",
          attributes: {
            flow_id: "mail-pipeline",
            run_id: "thread-201",
            thread_id: "thread-201",
            component_id: "incoming-worker",
            step_id: "retry",
            retryable: true,
          },
        },
        {
          type: "log",
          timestamp: "2026-03-23T18:41:06.901Z",
          trace_id: "trace-send-201",
          message: "Gmail API timeout",
          attributes: {
            flow_id: "mail-pipeline",
            run_id: "thread-201",
            thread_id: "thread-201",
            component_id: "send-process",
            step_id: "provider-call",
            status: "error",
            error_type: "TimeoutError",
            worker_name: "send-worker",
          },
        },
        {
          type: "log",
          timestamp: "2026-03-23T18:41:09.901Z",
          trace_id: "trace-send-202",
          message: "token refresh failed",
          attributes: {
            flow_id: "mail-pipeline",
            run_id: "thread-202",
            thread_id: "thread-202",
            component_id: "auth-worker",
            step_id: "refresh-token",
            error_message: "oauth refresh token expired",
          },
        },
      ],
      log_count: 4,
      span_count: 0,
      truncated: false,
      warnings: [],
    })) as typeof fetch;
}

function createAllHistoryFetchMock(): typeof fetch {
  return (async () =>
    createJsonResponse({
      from: "2026-03-23T18:00:00.000Z",
      to: "2026-03-23T18:15:00.000Z",
      events: [
        {
          type: "log",
          timestamp: "2026-03-23T18:41:02.110Z",
          trace_id: "trace-debug-201",
          message: "oauth refresh checkpoint",
          attributes: {
            subsystem: "mail-auth",
          },
        },
        {
          type: "log",
          timestamp: "2026-03-23T18:41:06.901Z",
          trace_id: "trace-send-201",
          message: "Gmail API timeout",
          attributes: {
            flow_id: "mail-pipeline",
            run_id: "thread-201",
            thread_id: "thread-201",
            step_id: "provider-call",
            status: "error",
          },
        },
      ],
      log_count: 2,
      span_count: 0,
      truncated: false,
      warnings: [],
    })) as typeof fetch;
}

describe("resq-flow logs errors", () => {
  it("prints help for the errors subcommand", async () => {
    const buffered = createBufferedIo();

    const exitCode = await runCli(["logs", "errors", "--help"], buffered.io);

    expect(exitCode).toBe(0);
    expect(buffered.readStdout()).toContain("resq-flow logs errors");
    expect(buffered.readStderr()).toBe("");
  });

  it("prints the default human-readable output", async () => {
    const buffered = createBufferedIo();

    const exitCode = await runCli(
      ["logs", "errors", "--flow", "mail-pipeline"],
      buffered.io,
      { fetchImpl: createHistoryFetchMock() },
    );

    expect(exitCode).toBe(0);
    expect(buffered.readStdout()).toContain("critical");
    expect(buffered.readStdout()).toContain("error");
    expect(buffered.readStdout()).toContain("incoming-worker.retry");
    expect(buffered.readStdout()).toContain("send-process.provider-call");
    expect(buffered.readStdout()).toContain("token refresh failed");
    expect(buffered.readStderr()).toBe("");
  });

  it("prints JSON output with classification fields", async () => {
    const buffered = createBufferedIo();

    const exitCode = await runCli(
      ["logs", "errors", "--flow", "mail-pipeline", "--json"],
      buffered.io,
      { fetchImpl: createHistoryFetchMock() },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(buffered.readStdout());
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toMatchObject({
      message: "provider timeout",
      classification: "critical",
      matchReasons: ["retryable=true"],
    });
    expect(parsed[1]).toMatchObject({
      message: "Gmail API timeout",
      classification: "error",
      matchReasons: ["status=error", "error_type"],
    });
    expect(parsed[2]).toMatchObject({
      message: "token refresh failed",
      classification: "error",
      matchReasons: ["error_message"],
    });
  });

  it("prints JSONL output", async () => {
    const buffered = createBufferedIo();

    const exitCode = await runCli(
      ["logs", "errors", "--flow", "mail-pipeline", "--jsonl"],
      buffered.io,
      { fetchImpl: createHistoryFetchMock() },
    );

    expect(exitCode).toBe(0);
    const lines = buffered
      .readStdout()
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({
      classification: "critical",
    });
    expect(lines[2]).toMatchObject({
      classification: "error",
      matchReasons: ["error_message"],
    });
  });

  it("supports --hard-only", async () => {
    const buffered = createBufferedIo();

    const exitCode = await runCli(
      ["logs", "errors", "--flow", "mail-pipeline", "--hard-only", "--json"],
      buffered.io,
      { fetchImpl: createHistoryFetchMock() },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(buffered.readStdout());
    expect(parsed).toHaveLength(2);
    expect(parsed.every((row: { classification: string }) => row.classification === "error")).toBe(true);
  });

  it("filters with repeated --attr before classification", async () => {
    const buffered = createBufferedIo();

    const exitCode = await runCli(
      [
        "logs",
        "errors",
        "--flow",
        "mail-pipeline",
        "--attr",
        "thread_id=thread-201",
        "--attr",
        "status=error",
        "--json",
      ],
      buffered.io,
      { fetchImpl: createHistoryFetchMock() },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(buffered.readStdout());
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      runId: "thread-201",
      message: "Gmail API timeout",
      classification: "error",
    });
  });

  it("filters with --query", async () => {
    const buffered = createBufferedIo();

    const exitCode = await runCli(
      [
        "logs",
        "errors",
        "--flow",
        "mail-pipeline",
        "--query",
        "token",
        "--json",
      ],
      buffered.io,
      { fetchImpl: createHistoryFetchMock() },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(buffered.readStdout());
    expect(parsed).toHaveLength(1);
    expect(parsed[0].message).toBe("token refresh failed");
  });

  it("supports explicit global reads with --all", async () => {
    const buffered = createBufferedIo();

    const exitCode = await runCli(
      ["logs", "errors", "--all", "--json"],
      buffered.io,
      { fetchImpl: createAllHistoryFetchMock() },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(buffered.readStdout());
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      flowId: "mail-pipeline",
      classification: "error",
      message: "Gmail API timeout",
    });
  });

  it("handles empty results", async () => {
    const buffered = createBufferedIo();

    const exitCode = await runCli(
      [
        "logs",
        "errors",
        "--flow",
        "mail-pipeline",
        "--attr",
        "thread_id=missing-thread",
      ],
      buffered.io,
      { fetchImpl: createHistoryFetchMock() },
    );

    expect(exitCode).toBe(0);
    expect(buffered.readStdout()).toContain("No matching error or critical logs found.");
    expect(buffered.readStderr()).toBe("");
  });

  it("requires exactly one of --flow or --all", async () => {
    const buffered = createBufferedIo();

    const missingScopeCode = await runCli(
      ["logs", "errors"],
      buffered.io,
      { fetchImpl: createHistoryFetchMock() },
    );
    expect(missingScopeCode).toBe(2);
    expect(buffered.readStderr()).toContain(
      "exactly one of --flow <flow-id> or --all is required",
    );

    const conflicting = createBufferedIo();
    const conflictingCode = await runCli(
      ["logs", "errors", "--flow", "mail-pipeline", "--all"],
      conflicting.io,
      { fetchImpl: createHistoryFetchMock() },
    );
    expect(conflictingCode).toBe(2);
    expect(conflicting.readStderr()).toContain(
      "exactly one of --flow <flow-id> or --all is required",
    );
  });
});
