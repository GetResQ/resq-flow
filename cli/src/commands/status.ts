import type { CliIo } from "../lib/output.js";
import { writeStdout } from "../lib/output.js";

export const STATUS_HELP = `Usage:
  resq-flow status [options]

Options:
  --help              Show help
  --url <base-url>    Relay base URL
  --json              Emit JSON output
  --timeout <ms>      Request timeout in milliseconds
`;

export async function runStatusCommand(
  args: string[],
  io: CliIo,
): Promise<number> {
  if (args.length === 1 && args[0] === "--help") {
    writeStdout(io, STATUS_HELP.trimEnd());
    return 0;
  }

  throw new Error("status command is not implemented yet");
}
