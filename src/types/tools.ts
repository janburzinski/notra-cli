import type { QueryValue } from './http';
import type { OpenApiOperation } from './openapi';

export type ToolSafety = 'read' | 'write' | 'destructive' | 'billable';

export type ToolDefinition = {
  name: string;
  operation?: OpenApiOperation;
  safety: ToolSafety;
  unavailableReason?: string;
};

export type ChatStreamResult = { chatId: string | null; text: string };

export type PreparedToolRequest = {
  path: string;
  query: Record<string, QueryValue | undefined>;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
};
