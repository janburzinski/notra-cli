import type { QueryValue } from "../types/http";
import type { OpenApiOperation } from "../types/openapi";
import type { PreparedToolRequest } from "../types/tools";
import { ToolResourceNotFoundError } from "../lib/tool-errors";
import { parseChatStream } from "./chat-stream";
import { assertJsonSchema } from "./json-schema";

export function prepareToolRequest(
  toolName: string,
  operation: OpenApiOperation,
  input: Record<string, unknown>,
): PreparedToolRequest {
  const remaining = { ...input };
  const query: Record<string, QueryValue | undefined> = {};
  const headers: Record<string, string> = {};
  let path = operation.path;

  for (const parameter of operation.parameters) {
    const inputName =
      toolName === "update_skill" && parameter.name === "name"
        ? "currentName"
        : parameter.name;
    const value = remaining[inputName];
    if (value === undefined && parameter.required) {
      throw new Error(`Missing required input: ${inputName}`);
    }
    if (value === undefined) continue;
    delete remaining[inputName];
    if (parameter.schema) {
      if (
        parameter.in === "query" &&
        Array.isArray(value) &&
        parameter.schema.type !== "array"
      ) {
        value.forEach((item, index) =>
          assertJsonSchema(item, parameter.schema!, `${inputName}[${index}]`),
        );
      } else {
        assertJsonSchema(value, parameter.schema, inputName);
      }
    }

    if (parameter.in === "path") {
      if (!isScalar(value))
        throw new Error(`${inputName} must be a string, number, or boolean.`);
      path = path.replace(
        `{${parameter.name}}`,
        encodeURIComponent(String(value)),
      );
    } else if (parameter.in === "header") {
      if (!isScalar(value))
        throw new Error(`${inputName} must be a string, number, or boolean.`);
      headers[parameter.name] = String(value);
    } else {
      if (!isQueryValue(value))
        throw new Error(`${inputName} is not a valid query value.`);
      query[parameter.name] = value;
    }
  }

  if (toolName === "list_workspaces") query.includePending = true;
  if (toolName === "whoami") query.includePending = false;
  if (toolName === "create_chat" || toolName === "post_chat_message") {
    headers.Accept = "text/event-stream, application/json";
  }

  if (!operation.hasBody && Object.keys(remaining).length > 0) {
    throw new Error(
      `Unknown input field(s): ${Object.keys(remaining).join(", ")}`,
    );
  }
  if (operation.hasBody && operation.bodySchema) {
    assertJsonSchema(remaining, operation.bodySchema);
  }

  return {
    path,
    query,
    headers,
    body: operation.hasBody ? remaining : undefined,
  };
}

export function projectToolResult(
  toolName: string,
  value: unknown,
  input: Readonly<Record<string, unknown>> = {},
  chatId: string | null = null,
): unknown {
  if (toolName === "whoami" && isRecord(value)) {
    return {
      workspace: value.currentWorkspace,
      authentication: value.authentication,
    };
  }
  if (
    (toolName === "create_chat" || toolName === "post_chat_message") &&
    typeof value === "string"
  ) {
    return parseChatStream(value, chatId);
  }
  if (toolName === "get_post" && isRecord(value) && value.post === null) {
    throw new ToolResourceNotFoundError(
      `Post ${String(input.postId ?? "")} not found.`,
    );
  }
  if (
    toolName === "get_brand_identity" &&
    isRecord(value) &&
    value.brandIdentity === null
  ) {
    throw new ToolResourceNotFoundError(
      `Brand identity ${String(input.brandIdentityId ?? "")} not found.`,
    );
  }
  return value;
}

export function selectOutput(value: unknown, path: string): unknown {
  let selected = value;
  for (const part of path.split(".").filter(Boolean)) {
    if (Array.isArray(selected) && /^\d+$/.test(part)) {
      selected = selected[Number(part)];
    } else if (isRecord(selected) && part in selected) {
      selected = selected[part];
    } else {
      throw new Error(`Output path not found: ${path}`);
    }
  }
  return selected;
}

function isScalar(value: unknown): value is string | number | boolean {
  return ["string", "number", "boolean"].includes(typeof value);
}

function isQueryValue(value: unknown): value is QueryValue {
  return isScalar(value) || (Array.isArray(value) && value.every(isScalar));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
