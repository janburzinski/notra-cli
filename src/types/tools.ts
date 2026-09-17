import type { OpenApiOperation, QueryValue } from './api';

export type ToolSafety = 'read' | 'write' | 'destructive' | 'billable';

export type ToolDefinition = {
  name: string;
  operation?: OpenApiOperation;
  safety: ToolSafety;
  unavailableReason?: string;
};

export type PreparedToolRequest = {
  path: string;
  query: Record<string, QueryValue | undefined>;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
};
