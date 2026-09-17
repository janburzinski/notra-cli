#!/usr/bin/env bun
// @bun
import {
  package_default
} from "./chunk-rsjpv8jv.js";

// src/run.ts
import { existsSync as existsSync2 } from "fs";
import { readdir } from "fs/promises";
import { dirname, join as join2, relative, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

// src/cli/core.ts
var Errors;
((Errors) => {

  class CLIError extends Error {
    oclif;
    constructor(message, options) {
      super(message);
      this.name = "CLIError";
      this.oclif = { exit: options?.exit ?? 1 };
    }
  }
  Errors.CLIError = CLIError;
})(Errors ||= {});

// src/constants/version.ts
var VERSION = package_default.version;

// src/utils/command-resolution.ts
import { existsSync } from "node:fs";
import { join } from "node:path";
var COMMAND_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function resolveCommand(values, commandsRoot, extension) {
  const candidates = commandCandidates(values);
  for (let length = candidates.length;length > 0; length -= 1) {
    const selected = candidates.slice(0, length);
    if (selected.some(({ value }) => !COMMAND_SEGMENT.test(value)))
      continue;
    const parts = selected.map(({ value }) => value);
    const file = join(commandsRoot, ...parts) + extension;
    if (existsSync(file)) {
      return {
        file,
        name: parts.join(" "),
        commandIndices: selected.map(({ index }) => index)
      };
    }
  }
  return;
}
function isCommandTopic(topic) {
  return topic === "" || topic.split(" ").every((segment) => COMMAND_SEGMENT.test(segment));
}
function commandCandidates(values) {
  const candidates = [];
  for (let index = 0;index < values.length; index += 1) {
    const value = values[index];
    if (!value)
      continue;
    if (value === "--api-key" || value === "--base-url") {
      index += 1;
      continue;
    }
    if (value === "--json" || value.startsWith("--api-key=") || value.startsWith("--base-url=")) {
      continue;
    }
    if (!value.startsWith("-"))
      candidates.push({ index, value });
  }
  return candidates;
}

// src/run.ts
var root = dirname(fileURLToPath(import.meta.url));
var commandsRoot = join2(root, "commands");
var argv = process.argv.slice(2);
if (argv.includes("--version") || argv.includes("-v")) {
  console.log(VERSION);
  process.exit(0);
}
var helpIndex = argv.findIndex((value) => value === "--help" || value === "-h");
var lookup = helpIndex === -1 ? argv : argv.slice(0, helpIndex);
var resolved = resolveCommand(lookup, commandsRoot, extension());
if (!resolved) {
  const topic = lookup.filter((value) => !value.startsWith("-")).join(" ");
  if (lookup.length === 0 || helpIndex !== -1 && isCommandTopic(topic) && await hasTopic(topic)) {
    await printTopicHelp(topic);
    process.exit(0);
  }
  const attempted = topic || lookup[0] || "";
  const suggestion = await suggestCommand(attempted);
  if (argv.includes("--json")) {
    console.log(JSON.stringify({
      error: `Unknown command: ${attempted}`,
      suggestion: suggestion ?? null
    }));
  } else {
    console.error(`Unknown command: ${attempted}`);
    if (suggestion)
      console.error(`Did you mean \`notra ${suggestion}\`?`);
    else
      console.error("Run `notra --help` to list commands.");
  }
  process.exit(2);
}
var module = await import(pathToFileURL(resolved.file).href);
var CommandClass = module.default;
if (helpIndex !== -1) {
  printCommandHelp(resolved.name, CommandClass);
  process.exit(0);
}
var commandIndices = new Set(resolved.commandIndices);
var commandArgv = argv.filter((_, index) => !commandIndices.has(index));
var command = Reflect.construct(CommandClass, [commandArgv]);
try {
  await command.init();
  await command.run();
} catch (error) {
  try {
    await command.catch(error);
  } catch (unhandled) {
    const message = unhandled instanceof Error ? unhandled.message : String(unhandled);
    const exit = unhandled instanceof Errors.CLIError ? unhandled.oclif.exit : 1;
    console.error(message);
    process.exit(exit);
  }
}
function extension() {
  return import.meta.url.endsWith(".ts") ? ".ts" : ".js";
}
async function hasTopic(topic) {
  if (!isCommandTopic(topic))
    return false;
  return existsSync2(join2(commandsRoot, ...topic.split(" ")));
}
async function printTopicHelp(topic) {
  const files = await commandFiles(commandsRoot);
  const prefix = topic ? `${topic} ` : "";
  const descendants = files.map((file) => relative(commandsRoot, file).replace(/\.(?:js|ts)$/, "").split("/").join(" ")).filter((name) => name.startsWith(prefix)).sort();
  const commands = topic ? immediateChildren(descendants, prefix) : rootEntries(descendants);
  console.log(topic ? `Usage: notra ${topic} <command> [flags]
` : `Usage: notra <command> [flags]
`);
  console.log("Commands:");
  for (const command of commands)
    console.log(`  ${command}`);
  console.log(`
Global flags:`);
  console.log("  --api-key <value>   Override the configured API key");
  console.log("  --base-url <value>  Override the API base URL");
  console.log("  --json              Print machine-readable JSON");
  console.log("  --help, -h          Show help");
  console.log("  --version, -v       Show version");
}
function rootEntries(commands) {
  const entries = new Map;
  for (const command of commands) {
    const parts = command.split(" ");
    const root = parts[0];
    if (!root)
      continue;
    const previous = entries.get(root);
    entries.set(root, {
      count: (previous?.count ?? 0) + 1,
      nested: previous?.nested === true || parts.length > 1
    });
  }
  return [...entries].sort(([a], [b]) => a.localeCompare(b)).map(([name, entry]) => entry.nested || entry.count > 1 ? `${name} <command>` : name);
}
function immediateChildren(commands, prefix) {
  const entries = new Map;
  for (const command of commands) {
    const remainder = command.slice(prefix.length);
    const parts = remainder.split(" ");
    const child = parts[0];
    if (!child)
      continue;
    const previous = entries.get(child);
    entries.set(child, {
      count: (previous?.count ?? 0) + 1,
      nested: previous?.nested === true || parts.length > 1
    });
  }
  return [...entries].sort(([a], [b]) => a.localeCompare(b)).map(([name, entry]) => entry.nested || entry.count > 1 ? `${prefix}${name} <command>` : `${prefix}${name}`);
}
async function suggestCommand(attempted) {
  if (!attempted)
    return;
  const commands = (await commandFiles(commandsRoot)).map((file) => relative(commandsRoot, file).replace(/\.(?:js|ts)$/, "").split("/").join(" "));
  const ranked = commands.map((command) => ({ command, distance: editDistance(attempted, command) })).sort((a, b) => a.distance - b.distance);
  const best = ranked[0];
  return best && best.distance <= Math.max(2, Math.floor(attempted.length / 3)) ? best.command : undefined;
}
function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1;row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1;column <= right.length; column += 1) {
      current[column] = Math.min((current[column - 1] ?? 0) + 1, (previous[column] ?? 0) + 1, (previous[column - 1] ?? 0) + (left[row - 1] === right[column - 1] ? 0 : 1));
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] ?? right.length;
}
function printCommandHelp(name, command) {
  const args = Object.entries(command.args ?? {});
  const baseFlags = Object.getPrototypeOf(command).baseFlags ?? {};
  const flags = { ...baseFlags, ...command.flags ?? {} };
  const usageArgs = args.map(([arg, definition]) => definition.required ? `<${arg}>` : `[${arg}]`).join(" ");
  console.log(`Usage: notra ${name}${usageArgs ? ` ${usageArgs}` : ""} [flags]
`);
  if (command.description)
    console.log(`${command.description}
`);
  if (args.length > 0) {
    console.log("Arguments:");
    for (const [arg, definition] of args)
      console.log(`  ${arg.padEnd(20)} ${definition.description ?? ""}`);
    console.log();
  }
  if (Object.keys(flags).length > 0) {
    console.log("Flags:");
    for (const [flag, definition] of Object.entries(flags)) {
      const short = definition.char ? `-${definition.char}, ` : "    ";
      const value = definition.kind === "boolean" ? "" : " <value>";
      console.log(`  ${short}--${flag}${value}`.padEnd(30) + (definition.description ?? ""));
    }
  }
  if (command.examples?.length) {
    console.log(`
Examples:`);
    for (const example of command.examples)
      console.log(`  ${example.replaceAll("<%= config.bin %>", "notra")}`);
  }
}
async function commandFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? commandFiles(path) : [path];
  }));
  return files.flat().filter((file) => file.endsWith(extension()));
}
