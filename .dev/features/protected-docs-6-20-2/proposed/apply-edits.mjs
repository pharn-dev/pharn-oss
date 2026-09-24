// Apply edits.txt to a TARGET tree (argv[2]); every OLD must occur exactly once, else abort with nothing written.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root = process.argv[2];
const text = readFileSync(new URL("./edits.txt", import.meta.url), "utf8");
const blocks = text.split(/^@@@ /m).filter((b) => b.trim());
const files = new Map();
for (const b of blocks) {
  const nl = b.indexOf("\n");
  const file = b.slice(0, nl).trim();
  const m = b.slice(nl + 1).match(/^<<<\n([\s\S]*?)\n===\n([\s\S]*?)\n>>>\s*$/);
  if (!m) throw new Error(`malformed block for ${file}`);
  if (!files.has(file)) files.set(file, readFileSync(join(root, file), "utf8"));
  const cur = files.get(file);
  const n = cur.split(m[1]).length - 1;
  if (n !== 1) throw new Error(`${file}: OLD occurs ${n} times: ${JSON.stringify(m[1].slice(0, 70))}`);
  files.set(
    file,
    cur.replace(m[1], () => m[2])
  );
}
for (const [file, s] of files) writeFileSync(join(root, file), s);
console.log(`applied ${blocks.length} edit(s) to ${files.size} file(s)`);
