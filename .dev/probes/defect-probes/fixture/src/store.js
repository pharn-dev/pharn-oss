import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// The whole database is one JSON document. Its shape is versioned: a change to a stored record's shape bumps
// SCHEMA_VERSION and adds a step to MIGRATIONS, so a file written by an older release still loads.
export const SCHEMA_VERSION = 2;

// MIGRATIONS[n] takes a document at version n and returns it at version n + 1.
const MIGRATIONS = {
  // 2 added payments to invoices and the audit log.
  1: (doc) => ({
    ...doc,
    schemaVersion: 2,
    audit: doc.audit ?? [],
    invoices: doc.invoices.map((inv) => ({ ...inv, payments: inv.payments ?? [] })),
  }),
};

export function emptyDocument() {
  return { schemaVersion: SCHEMA_VERSION, orgs: [], keys: [], invoices: [], audit: [] };
}

export function migrate(doc) {
  let current = doc;
  while (current.schemaVersion < SCHEMA_VERSION) {
    const step = MIGRATIONS[current.schemaVersion];
    if (!step) throw new Error(`no migration from schema version ${current.schemaVersion}`);
    current = step(current);
  }
  if (current.schemaVersion !== SCHEMA_VERSION) throw new Error(`unsupported schema version ${current.schemaVersion}`);
  return current;
}

export class Store {
  constructor(path) {
    this.path = path;
    this.doc = null;
    this.queue = Promise.resolve();
  }

  async load() {
    try {
      this.doc = migrate(JSON.parse(await readFile(this.path, "utf8")));
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
      this.doc = emptyDocument();
    }
    return this;
  }

  /** The current document. Read-only by convention: change it only inside transact(). */
  read() {
    return this.doc;
  }

  /**
   * Run fn on a copy of the document, then write the copy to a temporary file and rename it over the store, so a crash
   * never leaves a half-written file. Calls are serialized. If fn throws, nothing is written and the error propagates.
   */
  transact(fn) {
    const run = async () => {
      const next = structuredClone(this.doc);
      const result = await fn(next);
      await mkdir(dirname(this.path), { recursive: true });
      const tmp = `${this.path}.tmp`;
      await writeFile(tmp, JSON.stringify(next, null, 2));
      await rename(tmp, this.path);
      this.doc = next;
      return result;
    };
    const pending = this.queue.then(run, run);
    this.queue = pending.catch(() => {});
    return pending;
  }
}
