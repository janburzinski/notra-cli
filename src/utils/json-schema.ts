import type { JsonSchema } from "../types/openapi";

export function assertJsonSchema(
  value: unknown,
  schema: JsonSchema,
  path = "input",
): void {
  if (schema.allOf)
    for (const candidate of schema.allOf)
      assertJsonSchema(value, candidate, path);
  if (
    schema.anyOf &&
    !schema.anyOf.some((candidate) => isValid(value, candidate, path))
  ) {
    throw new Error(`${path} does not match any allowed shape.`);
  }
  if (
    schema.oneOf &&
    schema.oneOf.filter((candidate) => isValid(value, candidate, path))
      .length !== 1
  ) {
    throw new Error(`${path} must match exactly one allowed shape.`);
  }
  if (
    schema.enum &&
    !schema.enum.some((candidate) => Object.is(candidate, value))
  ) {
    throw new Error(
      `${path} must be one of: ${schema.enum.map(String).join(", ")}.`,
    );
  }

  const types =
    schema.type === undefined
      ? []
      : Array.isArray(schema.type)
        ? schema.type
        : [schema.type];
  if (types.length > 0 && !types.some((type) => matchesType(value, type))) {
    throw new Error(`${path} must be ${types.join(" or ")}.`);
  }

  if (typeof value === "string") validateString(value, schema, path);
  if (typeof value === "number") validateNumber(value, schema, path);
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) =>
      assertJsonSchema(item, schema.items!, `${path}[${index}]`),
    );
  }
  if (isRecord(value) && (schema.properties || schema.required)) {
    for (const name of schema.required ?? []) {
      if (value[name] === undefined)
        throw new Error(`Missing required input: ${path}.${name}`);
    }
    for (const [name, item] of Object.entries(value)) {
      const property = schema.properties?.[name];
      if (property) assertJsonSchema(item, property, `${path}.${name}`);
      else if (
        schema.additionalProperties &&
        typeof schema.additionalProperties === "object"
      ) {
        assertJsonSchema(item, schema.additionalProperties, `${path}.${name}`);
      } else if (schema.additionalProperties !== true) {
        throw new Error(`Unknown input field: ${path}.${name}`);
      }
    }
  }
}

function isValid(value: unknown, schema: JsonSchema, path: string): boolean {
  try {
    assertJsonSchema(value, schema, path);
    return true;
  } catch {
    return false;
  }
}

function matchesType(value: unknown, type: string): boolean {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isRecord(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

function validateString(value: string, schema: JsonSchema, path: string): void {
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    throw new Error(
      `${path} must contain at least ${schema.minLength} characters.`,
    );
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    throw new Error(
      `${path} must contain at most ${schema.maxLength} characters.`,
    );
  }
  if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
    throw new Error(`${path} has an invalid format.`);
  }
  if (schema.format === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${path} must be a date in YYYY-MM-DD format.`);
  }
}

function validateNumber(value: number, schema: JsonSchema, path: string): void {
  if (schema.minimum !== undefined && value < schema.minimum) {
    throw new Error(`${path} must be at least ${schema.minimum}.`);
  }
  if (schema.maximum !== undefined && value > schema.maximum) {
    throw new Error(`${path} must be at most ${schema.maximum}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
