// rewrite.mjs — the pharn-footprint-move path rewrite (PLAN.md "The rewrite", rules R1–R5).
//
//   node rewrite.mjs <root> <file-list> [--apply] [--tsv <out.tsv>]
//
// Dry-run by default: prints a summary and writes one TSV row per hit (file, line, rule, old, new) — the per-hit
// record L75 asks for. With --apply it rewrites the files in place under <root> (used on a scratch copy; the
// worktree receives the result through the guarded writer, never through this script).
//
// Root-anchored only. A token preceded by `/`, `.`, a letter, a digit, `_` or `-` is never touched, so
// `.dev/memory-bank/`, `pharn/LIMITS.md`, `.pharn-ci` and `x.pharn/` are left alone. `.pharn/ci.yml` is out of
// scope and kept. A quoted `.pharn` SEGMENT in code (`".pharn"`) is NOT rewritten: those sites are fixed by hand
// (PLAN.md), and the script lists them as rule SEG with no replacement.
//
// Markdown link targets are RESOLVED, not string-replaced: each relative target is resolved against the file's
// OLD directory, mapped through MOVES, and re-relativized from the file's NEW directory. Links are masked while
// the token rules run, so a re-relativized `](LIMITS.md)` can never be rewritten a second time.
import fs from "node:fs";
import path from "node:path";

export const MOVES = [
  ["THREAT-MODEL.md", "pharn/THREAT-MODEL.md"],
  ["LIMITS.md", "pharn/LIMITS.md"],
  ["pharn.spec-template.md", "pharn/spec-template.md"],
  ["memory-bank", "pharn/memory-bank"], // a directory: also maps memory-bank/<x>
];

export function mapPath(rel) {
  for (const [from, to] of MOVES) {
    if (rel === from) return to;
    if (rel.startsWith(from + "/")) return to + rel.slice(from.length);
  }
  if (rel === ".pharn/ci.yml") return rel;
  if (rel === ".pharn") return "pharn/.run";
  if (rel.startsWith(".pharn/")) return "pharn/.run" + rel.slice(".pharn".length);
  return rel;
}

const PRE = "(^|[^A-Za-z0-9_/.\\\\\\-])"; // a backslash before the token means an ESCAPED form (E*, below)
// The root anchor for a token inside a regex LITERAL: a non-path character, or a `/` that is not itself escaped
// (the literal's opening delimiter). `\.dev\/memory-bank\/` is never matched: there the `/` is `\/`.
const PRE_E = "(^|[^A-Za-z0-9_/.\\\\\\-]|(?<!\\\\)/)"; // root anchor: the char before the token (captured, re-emitted)
const RULES = [
  // ESCAPED forms (a regex literal in code asserting a path or a message): first, so the plain rules never see them.
  { id: "E5", re: new RegExp(PRE_E + "\\\\\\.pharn\\\\/", "g"), to: "pharn\\/\\.run\\/" },
  { id: "E5b", re: new RegExp(PRE_E + "\\\\\\.pharn(?!\\\\/|[A-Za-z0-9_-])", "g"), to: "pharn\\/\\.run" },
  { id: "E1", re: new RegExp(PRE_E + "THREAT-MODEL\\\\\\.md", "g"), to: "pharn\\/THREAT-MODEL\\.md" },
  { id: "E2", re: new RegExp(PRE_E + "LIMITS\\\\\\.md", "g"), to: "pharn\\/LIMITS\\.md" },
  { id: "E3", re: new RegExp(PRE_E + "memory-bank\\\\/", "g"), to: "pharn\\/memory-bank\\/" },
  // R5 first, so `.pharn/` never meets R3's `memory-bank` inside a rewritten span.
  { id: "R5", re: new RegExp(PRE + "\\.pharn/(?!ci\\.yml)", "g"), to: "pharn/.run/" },
  // bare `.pharn` (prose, globs ending the path): not followed by a path or name character, nor a quote in code
  // a root-relative path written after a placeholder: `<root>/.pharn/…`, `<repo>/.pharn/`
  { id: "R5p", re: /(<[A-Za-z_-]+>\/)\.pharn\//g, to: "pharn/.run/" },
  { id: "R5b", re: new RegExp(PRE + "\\.pharn(?![A-Za-z0-9_./\\-\"'])", "g"), to: "pharn/.run" },
  { id: "R1", re: new RegExp(PRE + "THREAT-MODEL\\.md", "g"), to: "pharn/THREAT-MODEL.md" },
  { id: "R2", re: new RegExp(PRE + "LIMITS\\.md", "g"), to: "pharn/LIMITS.md" },
  { id: "R4", re: new RegExp(PRE + "pharn\\.spec-template\\.md", "g"), to: "pharn/spec-template.md" },
  // memory-bank as a PATH: followed by `/`, or a quoted/back-ticked bare `memory-bank` (a path value). Prose
  // "memory-bank" with neither is the concept and is left for review.
  { id: "R3", re: new RegExp(PRE + "memory-bank/", "g"), to: "pharn/memory-bank/" },
  { id: "R3q", re: /(["'`])memory-bank(\1)/g, to: null },
];
const SEG = /(["'])\.pharn\1/g;

const LINK = /(\]\()([^)\s]+?)(\))|^(\[[^\]]+\]:\s+)(\S+)/gm;

function isRelative(t) {
  return !/^[a-z][a-z0-9+.-]*:/i.test(t) && !t.startsWith("#") && !t.startsWith("/");
}

export function rewriteText(text, fileRel) {
  const newFileRel = mapPath(fileRel);
  const oldDir = path.posix.dirname(fileRel);
  const newDir = path.posix.dirname(newFileRel);
  const hits = [];
  const isMd = fileRel.endsWith(".md");
  // 1. mask links (markdown only)
  const masks = [];
  let t = text;
  if (isMd) {
    t = t.replace(LINK, (m, a, target, c, refA, refT, offset) => {
      const lead = a ?? refA;
      const raw = target ?? refT;
      const tail = a ? c : "";
      let out = raw;
      if (isRelative(raw)) {
        const [p, frag = ""] = raw.split(/(?=#)/);
        const resolved = path.posix.normalize(path.posix.join(oldDir, decodeURI(p)));
        const mapped = mapPath(resolved);
        if (mapped !== resolved || newDir !== oldDir) {
          let rel = path.posix.relative(newDir, mapped) || path.posix.basename(mapped);
          if (p.startsWith("./") && !rel.startsWith("../")) rel = "./" + rel;
          if (p.endsWith("/") && !rel.endsWith("/")) rel += "/";
          out = rel + frag;
        }
      }
      masks.push(lead + out + tail);
      if (out !== raw) hits.push({ rule: "LINK", old: raw, new: out, line: text.slice(0, offset).split("\n").length });
      return `\u0000${masks.length - 1}\u0000`;
    });
  }
  // 2. token rules, line by line (masks hold no newline, so line numbers are the original file's)
  const lines = t.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const r of RULES) {
      lines[i] = lines[i].replace(r.re, (m, pre, q2) => {
        if (r.id === "R3q") {
          // REPORT ONLY (PLAN revision 2, grill error-handling): a quoted "memory-bank" may be a concept tag or a
          // non-root path segment, so each site is fixed by hand.
          hits.push({ rule: r.id, old: m, new: "(hand fix)", line: i + 1 });
          return m;
        }
        hits.push({ rule: r.id, old: m.slice(pre.length), new: r.to, line: i + 1 });
        return pre + r.to;
      });
    }
    // 2b. SEGj: a `.pharn` SEGMENT inside a join()/resolve() argument list becomes the two segments "pharn", ".run".
    //     Only within a call opened on the same line; every other quoted segment stays for a hand fix (SEG).
    for (;;) {
      const before = lines[i];
      lines[i] = lines[i].replace(/(\b(?:join|resolve)\([^;]*?)(["'])\.pharn\2(?=\s*[,)])/, (m, call, q) => {
        hits.push({ rule: "SEGj", old: `${q}.pharn${q}`, new: `${q}pharn${q}, ${q}.run${q}`, line: i + 1 });
        return `${call}${q}pharn${q}, ${q}.run${q}`;
      });
      if (lines[i] === before) break;
    }
    // 3. report (never rewrite) quoted .pharn segments
    for (const m of lines[i].matchAll(SEG)) hits.push({ rule: "SEG", old: m[0], new: "(hand fix)", line: i + 1 });
  }
  t = lines.join("\n");
  // 4. unmask
  t = t.replace(/\u0000(\d+)\u0000/g, (_, i) => masks[Number(i)]);
  return { text: t, hits, newFileRel };
}

function lineOf(text, needle, from) {
  const i = text.indexOf(needle, from);
  return i < 0 ? 0 : text.slice(0, i).split("\n").length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const [root, listFile, ...rest] = process.argv.slice(2);
  const apply = rest.includes("--apply");
  const tsvI = rest.indexOf("--tsv");
  const tsvOut = tsvI >= 0 ? rest[tsvI + 1] : null;
  const files = fs.readFileSync(listFile, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
  const rows = ["file\tline\trule\told\tnew"];
  const counts = {};
  let changed = 0;
  for (const rel of files) {
    const abs = path.join(root, rel);
    const before = fs.readFileSync(abs, "utf8");
    const { text, hits } = rewriteText(before, rel);
    hits.sort((a, b) => a.line - b.line);
    for (const h of hits) {
      const ln = h.line;
      counts[h.rule] = (counts[h.rule] || 0) + 1;
      rows.push([rel, ln, h.rule, h.old, h.new].map((v) => String(v).replace(/[\t\n]/g, " ")).join("\t"));
    }
    if (text !== before) {
      changed++;
      if (apply) fs.writeFileSync(abs, text);
    }
  }
  if (tsvOut) fs.writeFileSync(tsvOut, rows.join("\n") + "\n");
  console.log(`${apply ? "APPLIED" : "DRY-RUN"}: ${files.length} files read, ${changed} changed; hits by rule: ${JSON.stringify(counts)}`);
}
