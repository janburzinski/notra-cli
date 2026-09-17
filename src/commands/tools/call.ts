import { Args, Flags } from "@oclif/core";
import { NotraCommand } from "../../base-command";
import { ExitCode } from "../../constants/exit";
import { findMcpTool } from "../../constants/tools";
import { readJsonFromFileOrStdin } from "../../utils/files";
import {
  prepareToolRequest,
  projectToolResult,
  selectOutput,
} from "../../utils/tool-request";

export default class ToolsCall extends NotraCommand {
  static override description =
    "Call a Notra API operation using its MCP tool name and input shape.";
  static override examples = [
    '<%= config.bin %> tools call list_posts --input \'{"status":"draft","limit":10}\'',
    '<%= config.bin %> tools call get_post --input \'{"postId":"post_123"}\'',
    "<%= config.bin %> tools call get_post --input-file ./input.json --select post.markdown --raw",
    'echo \'{"name":"writer"}\' | <%= config.bin %> tools call get_skill --input-file -',
  ];

  static override args = {
    tool: Args.string({
      description: "MCP tool name, such as list_posts.",
      required: true,
    }),
  };

  static override flags = {
    input: Flags.string({
      description: "MCP-style input as one JSON object.",
      exclusive: ["input-file"],
    }),
    "input-file": Flags.string({
      description: 'Read MCP-style input from a JSON file, or "-" for stdin.',
      exclusive: ["input"],
    }),
    select: Flags.string({
      description: "Return only a dot-separated response field.",
    }),
    raw: Flags.boolean({
      description: "Print the selected string or scalar without JSON encoding.",
    }),
    yes: Flags.boolean({
      char: "y",
      description: "Confirm a billable or destructive tool call.",
    }),
    timeout: Flags.integer({
      description: "Request timeout in seconds.",
      min: 1,
      default: 30,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ToolsCall);
    const tool = findMcpTool(args.tool);
    if (!tool) {
      this.error(
        `Unknown MCP tool ${args.tool}. Run \`notra tools list\` to list names.`,
        {
          exit: ExitCode.Usage,
        },
      );
    }
    if (!tool.operation) {
      this.error(
        tool.unavailableReason ?? `${tool.name} is not available in the CLI.`,
        {
          exit: ExitCode.Usage,
        },
      );
    }
    if (["billable", "destructive"].includes(tool.safety) && !flags.yes) {
      const reason =
        tool.safety === "billable"
          ? "uses AI credits"
          : "can irreversibly change or delete data";
      this.error(`${tool.name} ${reason}. Re-run with --yes to confirm.`, {
        exit: ExitCode.Usage,
      });
    }
    if (flags.raw && !flags.select) {
      this.error(
        "--raw requires --select so structured data is not discarded.",
        {
          exit: ExitCode.Usage,
        },
      );
    }

    let parsed: unknown;
    try {
      parsed = flags["input-file"]
        ? await readJsonFromFileOrStdin(
            flags["input-file"],
            "Expected JSON via --input-file or stdin.",
          )
        : parseInlineInput(flags.input);
    } catch (error) {
      this.error(errorMessage(error), { exit: ExitCode.Usage });
    }
    if (!isRecord(parsed)) {
      this.error("Tool input must be a JSON object.", { exit: ExitCode.Usage });
    }

    let request;
    try {
      request = prepareToolRequest(tool.name, tool.operation, parsed);
    } catch (error) {
      this.error(errorMessage(error), { exit: ExitCode.Usage });
    }
    const timeoutMs =
      Math.max(flags.timeout, minimumTimeoutSeconds(tool.name)) * 1000;
    const response = await this.authenticatedApi().requestWithMetadata(
      tool.operation.method,
      request.path,
      {
        query: request.query,
        headers: request.headers,
        body: request.body,
        timeoutMs,
      },
    );
    const projected = projectToolResult(
      tool.name,
      response.data,
      parsed,
      response.headers.get("x-chat-id"),
    );
    let output = projected;
    if (flags.select) {
      try {
        output = selectOutput(projected, flags.select);
      } catch (error) {
        this.error(errorMessage(error), { exit: ExitCode.Usage });
      }
    }
    if (flags.raw) {
      if (
        !["string", "number", "boolean"].includes(typeof output) &&
        output !== null
      ) {
        this.error("--raw can only print a string, number, boolean, or null.", {
          exit: ExitCode.Usage,
        });
      }
      this.log(output === null ? "" : String(output));
      return;
    }
    this.printJson(output);
  }
}

function minimumTimeoutSeconds(toolName: string): number {
  if (toolName === "run_geo_sequence") return 300;
  if (toolName === "plan_geo_content_brief") return 255;
  if (toolName === "create_chat" || toolName === "post_chat_message")
    return 180;
  return 0;
}

function parseInlineInput(input: string | undefined): unknown {
  if (!input) return {};
  try {
    return JSON.parse(input);
  } catch {
    throw new Error(
      "--input must be valid JSON. Use --input-file for large payloads.",
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
