#!/usr/bin/env bun
// @bun

// src/run.ts
import { existsSync } from "fs";
import { readdir } from "fs/promises";
import { dirname, join, relative, resolve } from "path";
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

// src/run.ts
var root = dirname(fileURLToPath(import.meta.url));
var commandsRoot = join(root, "commands");
var argv = process.argv.slice(2);
if (argv.includes("--version") || argv.includes("-v")) {
  console.log(process.env.npm_package_version ?? "0.1.0");
  process.exit(0);
}
var helpIndex = argv.findIndex((value) => value === "--help" || value === "-h");
var lookup = helpIndex === -1 ? argv : argv.slice(0, helpIndex);
var resolved = resolveCommand(lookup);
if (!resolved) {
  const topic = lookup.filter((value) => !value.startsWith("-")).join(" ");
  if (helpIndex !== -1 || lookup.length === 0 || topic && await hasTopic(topic)) {
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
var commandArgv = [
  ...argv.slice(0, resolved.start),
  ...argv.slice(resolved.start + resolved.consumed)
];
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
function resolveCommand(values) {
  const start = leadingGlobalFlagLength(values);
  const names = values.slice(start).filter((value) => !value.startsWith("-"));
  for (let length = names.length;length > 0; length -= 1) {
    const parts = names.slice(0, length);
    const file = join(commandsRoot, ...parts) + extension();
    if (existsSync(file))
      return { file, name: parts.join(" "), start, consumed: length };
  }
  return;
}
function leadingGlobalFlagLength(values) {
  let index = 0;
  while (index < values.length) {
    const value = values[index];
    if (value === "--json")
      index += 1;
    else if (value === "--api-key" || value === "--base-url")
      index += 2;
    else if (value?.startsWith("--api-key=") || value?.startsWith("--base-url="))
      index += 1;
    else
      break;
  }
  return index;
}
function extension() {
  return import.meta.url.endsWith(".ts") ? ".ts" : ".js";
}
async function hasTopic(topic) {
  return existsSync(join(commandsRoot, ...topic.split(" ")));
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
