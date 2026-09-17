import type { OpenApiOperation, QueryValue } from '../types/api';
import type { PreparedToolRequest } from '../types/tools';

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
    const inputName = toolName === 'update_skill' && parameter.name === 'name'
      ? 'currentName'
      : parameter.name;
    const value = remaining[inputName];
    if (value === undefined && parameter.required) {
      throw new Error(`Missing required input: ${inputName}`);
    }
    if (value === undefined) continue;
    delete remaining[inputName];

    if (parameter.in === 'path') {
      if (!isScalar(value)) throw new Error(`${inputName} must be a string, number, or boolean.`);
      path = path.replace(`{${parameter.name}}`, encodeURIComponent(String(value)));
    } else if (parameter.in === 'header') {
      if (!isScalar(value)) throw new Error(`${inputName} must be a string, number, or boolean.`);
      headers[parameter.name] = String(value);
    } else {
      if (!isQueryValue(value)) throw new Error(`${inputName} is not a valid query value.`);
      query[parameter.name] = value;
    }
  }

  if (toolName === 'list_workspaces') query.includePending = true;
  if (toolName === 'whoami') query.includePending = false;
  if (toolName === 'create_chat' || toolName === 'post_chat_message') {
    headers.Accept = 'text/event-stream, application/json';
  }

  if (!operation.hasBody && Object.keys(remaining).length > 0) {
    throw new Error(`Unknown input field(s): ${Object.keys(remaining).join(', ')}`);
  }

  return {
    path,
    query,
    headers,
    body: operation.hasBody ? remaining : undefined,
  };
}

export function projectToolResult(toolName: string, value: unknown): unknown {
  if (toolName === 'whoami' && isRecord(value)) {
    return {
      workspace: value.currentWorkspace,
      authentication: value.authentication,
    };
  }
  if ((toolName === 'create_chat' || toolName === 'post_chat_message') && typeof value === 'string') {
    return parseChatStream(value);
  }
  return value;
}

export function selectOutput(value: unknown, path: string): unknown {
  let selected = value;
  for (const part of path.split('.').filter(Boolean)) {
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

function parseChatStream(stream: string): { chatId: string | null; text: string } {
  let chatId: string | null = null;
  let text = '';
  for (const line of stream.split(/\r?\n/)) {
    if (!line.startsWith('data: ')) continue;
    const payload = line.slice(6).trim();
    if (payload === '[DONE]') continue;
    try {
      const frame = JSON.parse(payload) as Record<string, unknown>;
      const fragment = frame.delta ?? frame.textDelta;
      if (frame.type === 'text-delta' && typeof fragment === 'string') text += fragment;
      if (!chatId && isRecord(frame.messageMetadata) && typeof frame.messageMetadata.chatId === 'string') {
        chatId = frame.messageMetadata.chatId;
      }
    } catch {
      // Ignore non-JSON SSE frames so protocol additions remain forwards compatible.
    }
  }
  return { chatId, text: text || stream };
}

function isScalar(value: unknown): value is string | number | boolean {
  return ['string', 'number', 'boolean'].includes(typeof value);
}

function isQueryValue(value: unknown): value is QueryValue {
  return isScalar(value) || (Array.isArray(value) && value.every(isScalar));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
