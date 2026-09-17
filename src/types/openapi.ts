import type { ApiHttpMethod } from "./http";

export type JsonSchema = {
  type?: string | readonly string[];
  enum?: readonly unknown[];
  properties?: Readonly<Record<string, JsonSchema>>;
  required?: readonly string[];
  items?: JsonSchema;
  anyOf?: readonly JsonSchema[];
  oneOf?: readonly JsonSchema[];
  allOf?: readonly JsonSchema[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  additionalProperties?: boolean | JsonSchema;
};

export type OpenApiOperation = {
  id: string;
  method: ApiHttpMethod;
  path: string;
  summary: string;
  tag: string;
  parameters: ReadonlyArray<{
    name: string;
    in: "path" | "query" | "header";
    required: boolean;
    schema?: JsonSchema;
  }>;
  hasBody: boolean;
  bodySchema?: JsonSchema;
};
