#!/usr/bin/env node
// Check a pharn-ci org policy document against policy.v1.json before it is committed or served, offline:
// an unknown key, a wrong type, a missing `version` or a value outside its bounds is named by its JSON Pointer.
// Node core only (no network, no npm packages); reads the policy file and the schema, writes nothing.
//
//   node check-policy.mjs <policy.json> [--schema <schema.json>]
//
// scripts/policy.v1.json is a byte copy of pharn-ci 0.12.0's schema/policy.v1.json (sha256
// a9272db9565d6c950322f8e0738200d28db308ac7b8fa890a84fa9707c021cd2), which adds `dependencies.lookup`,
// `dependencies.allowed_hosts`, `test_integrity.signals.TI17` and the `injection` object to 0.4.0's. The validator implements exactly the JSON Schema keywords that file uses and
// refuses (exit 2) a schema that uses another one.
//
// Exit 0: valid. Exit 1: invalid, one stdout line per problem as `<JSON Pointer>: <reason>`. Exit 2: a usage
// error, an unreadable file, a file that is not JSON, a file over 1 MiB, or an unsupported schema keyword.
//
// This is an advisory pre-check: it mirrors the schema, and pharn-ci's own validation decides in CI (a
// duplicate key, for one, is not detected here). A message names the path and the rule, never a value from the
// document.
import { closeSync, constants as fsConstants, fstatSync, openSync, readSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCHEMA = path.join(HERE, "policy.v1.json");
const MAX_BYTES = 1024 * 1024;
const MAX_PROBLEMS = 100;
const MAX_DEPTH = 64;
const MAX_SEGMENT_CODE_POINTS = 64;

export class UsageError extends Error {}

// <shared:read-file>
// Byte-identical in all four pharn-ci helper scripts (tests/shared-block.test.mjs checks it). It needs
// `closeSync`, `fsConstants` (node:fs `constants`), `fstatSync`, `openSync` and `readSync` from node:fs and a
// `UsageError` class from the file around it.

/**
 * Reads `file` as UTF-8 when it is a regular file of at most `cap` bytes, checking and reading through one
 * descriptor so the file checked is the file read. O_NONBLOCK so a FIFO is refused instead of blocking the
 * open; isFile so a directory or a device (which reports size 0) is refused; the read stops once more than
 * `cap` bytes arrive. Throws a UsageError naming `name` and the reason, carrying the system error's code.
 */
function readRegularFile(file, cap, name) {
  let fd;
  try {
    fd = openSync(file, fsConstants.O_RDONLY | fsConstants.O_NONBLOCK);
    const stat = fstatSync(fd);
    if (!stat.isFile()) throw new UsageError(`${name} is not a regular file`);
    const over = () => new UsageError(`${name} is larger than ${cap / (1024 * 1024)} MiB`);
    if (stat.size > cap) throw over();
    const chunks = [];
    let total = 0;
    for (let n = -1; n !== 0; ) {
      const chunk = Buffer.allocUnsafe(64 * 1024);
      n = readSync(fd, chunk, 0, chunk.length, null);
      total += n;
      if (total > cap) throw over();
      chunks.push(chunk.subarray(0, n));
    }
    return Buffer.concat(chunks, total).toString("utf8");
  } catch (err) {
    if (err instanceof UsageError) throw err;
    throw Object.assign(new UsageError(`cannot read ${name}: ${err?.code ?? "unknown error"}`), { code: err?.code });
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
// </shared:read-file>

const ANNOTATIONS = new Set(["$schema", "$id", "title", "description"]);
const SUPPORTED = new Set([
  ...ANNOTATIONS,
  "$defs",
  "$ref",
  "type",
  "const",
  "enum",
  "required",
  "properties",
  "additionalProperties",
  "items",
  "maxItems",
  "minLength",
  "maxLength",
  "pattern",
  "minimum",
  "maximum",
  "anyOf",
]);

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function jsonType(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}

function hasType(v, type) {
  const t = jsonType(v);
  return t === type || (type === "number" && t === "integer");
}

const TYPE_WORDS = {
  object: "an object",
  array: "a list",
  string: "a string",
  number: "a number",
  integer: "an integer",
  boolean: "true or false",
  null: "null",
};

/** An unknown key as a JSON Pointer segment: control characters become `?`, a long key is cut, then ~ and / are escaped. */
function segment(key) {
  let kept = "";
  let count = 0;
  let cut = false;
  for (const ch of String(key)) {
    if (count === MAX_SEGMENT_CODE_POINTS) {
      cut = true;
      break;
    }
    const code = ch.codePointAt(0);
    kept += code <= 0x1f || code === 0x7f ? "?" : ch;
    count++;
  }
  if (cut) kept += "…";
  return kept.replace(/~/g, "~0").replace(/\//g, "~1");
}

const codePoints = (s) => [...s].length;

/** Loads the schema (the bundled policy.v1.json by default), checks that it only uses supported keywords. */
export function loadSchema(file = DEFAULT_SCHEMA) {
  const name = `the schema ${path.basename(String(file))}`;
  const text = readRegularFile(file, MAX_BYTES, name);
  let schema;
  try {
    schema = JSON.parse(text);
  } catch {
    throw new UsageError(`cannot read ${name} as JSON`);
  }
  checkSchema(schema, schema, "#", 0);
  return schema;
}

function checkSchema(node, root, where, depth) {
  if (typeof node === "boolean") return;
  if (!isObject(node)) throw new UsageError(`schema ${where} is not an object`);
  if (depth > MAX_DEPTH) throw new UsageError("the schema is nested too deeply");
  for (const key of Object.keys(node)) {
    if (!SUPPORTED.has(key)) throw new UsageError(`the schema uses a keyword this checker does not implement: ${key} (at ${where})`);
  }
  if (node.pattern !== undefined) {
    try {
      new RegExp(node.pattern, "u");
    } catch {
      throw new UsageError(`schema ${where}: pattern is not a valid regular expression`);
    }
  }
  if (node.$ref !== undefined) resolveRef(root, node.$ref);
  for (const [k, sub] of Object.entries(node.properties ?? {})) checkSchema(sub, root, `${where}/properties/${k}`, depth + 1);
  for (const [k, sub] of Object.entries(node.$defs ?? {})) checkSchema(sub, root, `${where}/$defs/${k}`, depth + 1);
  if (node.items !== undefined) checkSchema(node.items, root, `${where}/items`, depth + 1);
  if (isObject(node.additionalProperties)) checkSchema(node.additionalProperties, root, `${where}/additionalProperties`, depth + 1);
  for (const [i, sub] of (node.anyOf ?? []).entries()) checkSchema(sub, root, `${where}/anyOf/${i}`, depth + 1);
}

function resolveRef(root, ref) {
  const m = /^#\/\$defs\/([A-Za-z0-9_-]+)$/.exec(String(ref));
  if (m === null || !isObject(root.$defs) || !isObject(root.$defs[m[1]])) {
    throw new UsageError(`the schema has a $ref this checker does not resolve: ${String(ref)}`);
  }
  return { schema: root.$defs[m[1]], name: m[1] };
}

/**
 * Validates a parsed policy document against the schema. Returns the problems as `{ path, message }`, the path
 * a JSON Pointer ("" for the whole document). No message holds a value from the document.
 */
export function validatePolicy(doc, schema) {
  const problems = [];
  let total = 0;
  const report = (p, message) => {
    total++;
    if (problems.length < MAX_PROBLEMS) problems.push({ path: p, message });
  };
  validate(doc, schema, "", schema, report, null, 0);
  if (total > problems.length) problems.push({ path: "", message: `${total - problems.length} more problems not listed` });
  return problems;
}

function validate(value, schema, at, root, report, refName, depth) {
  if (schema === true || schema === undefined) return true;
  if (schema === false) {
    report(at, "is not allowed");
    return false;
  }
  if (depth > MAX_DEPTH) {
    report(at, "is nested too deeply");
    return false;
  }
  let ok = true;
  let name = refName;
  if (schema.$ref !== undefined) {
    const target = resolveRef(root, schema.$ref);
    name = target.name;
    ok = validate(value, target.schema, at, root, report, name, depth + 1) && ok;
  }
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => hasType(value, t))) {
      report(at, `must be ${types.map((t) => TYPE_WORDS[t] ?? t).join(" or ")}`);
      return false;
    }
  }
  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    report(at, `must be ${JSON.stringify(schema.const)}`);
    ok = false;
  }
  if (schema.enum !== undefined && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    report(at, `must be one of: ${schema.enum.join(", ")}`);
    ok = false;
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      report(at, `must be at least ${schema.minimum}`);
      ok = false;
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      report(at, `must be at most ${schema.maximum}`);
      ok = false;
    }
  }
  if (typeof value === "string") {
    const length = codePoints(value);
    if (schema.minLength !== undefined && length < schema.minLength) {
      report(at, schema.minLength === 1 ? "must not be empty" : `must be at least ${schema.minLength} characters`);
      ok = false;
    }
    if (schema.maxLength !== undefined && length > schema.maxLength) {
      report(at, `must be at most ${schema.maxLength} characters`);
      ok = false;
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(value)) {
      report(at, name === null ? "does not match the required pattern" : `is not a valid ${name} (see its definition in the schema)`);
      ok = false;
    }
  }
  if (Array.isArray(value)) {
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      report(at, `must have at most ${schema.maxItems} items`);
      ok = false;
    }
    if (schema.items !== undefined) {
      for (const [i, item] of value.entries()) ok = validate(item, schema.items, `${at}/${i}`, root, report, null, depth + 1) && ok;
    }
  }
  if (isObject(value)) {
    const props = schema.properties ?? {};
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) {
        report(`${at}/${segment(key)}`, "required key missing");
        ok = false;
      }
    }
    for (const key of Object.keys(value)) {
      const where = `${at}/${segment(key)}`;
      if (Object.hasOwn(props, key)) ok = validate(value[key], props[key], where, root, report, null, depth + 1) && ok;
      else if (schema.additionalProperties === false) {
        report(where, "unknown key");
        ok = false;
      } else if (isObject(schema.additionalProperties)) {
        ok = validate(value[key], schema.additionalProperties, where, root, report, null, depth + 1) && ok;
      }
    }
  }
  if (schema.anyOf !== undefined) {
    const matched = schema.anyOf.some((sub) => validate(value, sub, at, root, () => {}, name, depth + 1));
    if (!matched) {
      report(at, "must match one of the allowed forms");
      ok = false;
    }
  }
  return ok;
}

/** Parses the argument vector: one policy file, and an optional --schema <file>. */
function parseArgs(argv) {
  let file;
  let schema;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--schema") {
      schema = argv[++i];
      if (schema === undefined || schema.startsWith("--")) throw new UsageError("--schema takes a schema file");
    } else if (a.startsWith("--schema=")) schema = a.slice("--schema=".length);
    else if (a.startsWith("-")) throw new UsageError(`unknown option: ${a}`);
    else if (file === undefined) file = a;
    else throw new UsageError("only one policy file can be checked at a time");
  }
  if (file === undefined) throw new UsageError("usage: node check-policy.mjs <policy.json> [--schema <schema.json>]");
  return { file, schema };
}

function readPolicy(file) {
  const text = readRegularFile(file, MAX_BYTES, file);
  try {
    return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    throw new UsageError(`${file} is not valid JSON`);
  }
}

const IO = { stdout: (s) => process.stdout.write(s), stderr: (s) => process.stderr.write(s) };

/** Runs the checker. Returns the exit code: 0 valid, 1 invalid, 2 a usage or input error. */
export function main(argv, io = IO) {
  try {
    const { file, schema: schemaFile } = parseArgs(argv);
    const schema = loadSchema(schemaFile);
    const doc = readPolicy(file);
    const problems = validatePolicy(doc, schema);
    if (problems.length === 0) {
      const label = schemaFile === undefined ? "policy.v1.json, pharn-ci 0.12.0" : path.basename(schemaFile);
      io.stdout(`ok — ${file} is a valid pharn-ci policy (${label})\n`);
      return 0;
    }
    io.stdout(`${problems.map((p) => `${p.path === "" ? "(whole document)" : p.path}: ${p.message}`).join("\n")}\n`);
    return 1;
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    io.stderr(`check-policy: ${err.message}\n`);
    return 2;
  }
}

let isMain;
try {
  isMain = process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
} catch {
  isMain = false;
}
if (isMain) process.exitCode = main(process.argv.slice(2));
