// pharn/floor/validate.test.mjs — black-box tests for the deterministic floor validator.
//
// Run as a subprocess so validate.mjs keeps its dependency-free, top-level-exec contract:
// we only assert on its public surface (exit code + canonical stdout report).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const VALIDATE = join(here, "validate.mjs");

function run(target) {
  return spawnSync(process.execPath, [VALIDATE, target], { encoding: "utf8" });
}

test("GREEN fixture: valid capability exits 0", () => {
  const r = run(join(here, "test-fixtures", "green"));
  assert.equal(r.status, 0);
  assert.match(r.stdout, /FLOOR: GREEN/);
});

test("RED fixture: missing required fields exits 1", () => {
  const r = run(join(here, "test-fixtures", "red"));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FLOOR: RED/);
});

// Build a hermetic repo of { "rel/path": "contents" } in a scratch dir, run validate, clean up.
function withRepo(files, fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-validate-"));
  try {
    for (const [rel, body] of Object.entries(files)) {
      const p = join(root, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, body);
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// A minimal valid product capability (role-bearing + non-empty evals) — validate COUNTS and passes it.
const VALID_CAP = `---
name: sample-lens
role: lens
kind: pharn-owned
applies: ["universal"]
version: 0.1.0
---

# A sample product capability
`;

// Locks the dev/product boundary on the floor: validate excludes .dev/ WHOLESALE (the move replaced the
// old per-folder `floor/` special-case with a single `.dev/` segment). A role-bearing file anywhere under
// .dev/ must NOT be counted; the one product capability at root must be. If either .dev/ file were counted
// the report would be "RED — … 2/3 capabilities checked" (they have no evals), never "GREEN — 1".
test("★ .dev/ excluded WHOLESALE: role-bearing files under .dev/ are NOT counted; the root product capability IS (count stays 1)", () => {
  withRepo(
    {
      "pharn-review/sample/sample.md": VALID_CAP,
      "pharn-review/sample/evals/cases/case-1.md": "# a case\n",
      "pharn-review/sample/evals/expected/expected-1.md": "# expected\n",
      ".dev/floor/fake-capability.md": VALID_CAP,
      ".dev/features/x/also-fake.md": VALID_CAP,
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.match(r.stdout, /FLOOR: GREEN — 1 capabilities checked/);
    }
  );
});

// CHECK 4b — `applies` archetype scoping (ARCH §5 enum {ssr,backend,spa,lib} + `universal` wildcard).
// Required field, enum-checked (post-GATE-2: absent or empty → RED; mirrors CHECK 4 coupling).

// A capability that carries `applies:` — valid where its members are archetype-enum values (+ evals).
const APPLIES_CAP = (value) => `---
name: sample-lens
role: lens
kind: pharn-owned
coupling: agnostic
applies: ${value}
version: 0.1.0
---

# a sample capability declaring an archetype scope
`;
const APPLIES_EVALS = {
  "pharn-review/sample/evals/cases/case-1.md": "# a case\n",
  "pharn-review/sample/evals/expected/expected-1.md": "# expected\n",
};

test("applies enum: valid archetype members (`universal` wildcard + §5 archetypes) exit 0 (GREEN)", () => {
  withRepo({ "pharn-review/sample/sample.md": APPLIES_CAP(`["ssr", "spa"]`), ...APPLIES_EVALS }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /FLOOR: GREEN/);
  });
});

// RED is ATTRIBUTABLE to CHECK 4b: the fixture is otherwise fully valid (required fields + valid coupling
// + non-empty evals), and we assert the applies-SPECIFIC signal — so the test cannot green on an unrelated
// failure. `frontend` is deliberately the rejected CLI value: it is NOT a member of the §5 archetype enum.
test("applies enum: a non-enum `applies` value exits 1 (RED) with the applies-specific finding", () => {
  withRepo({ "pharn-review/sample/sample.md": APPLIES_CAP(`["frontend"]`), ...APPLIES_EVALS }, (root) => {
    const r = run(root);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FLOOR: RED/);
    assert.match(r.stdout, /applies value not in enum: frontend/);
  });
});

// `applies` is REQUIRED (GATE-2): a capability that omits it is RED. The fixture is otherwise fully
// valid (required fields + valid coupling + evals), so the RED is attributable to the missing `applies`.
test("applies required: a capability MISSING `applies` exits 1 (RED) with the missing-required finding", () => {
  const cap = `---
name: sample-lens
role: lens
kind: pharn-owned
coupling: agnostic
version: 0.1.0
---

# a capability that declares no archetype scope
`;
  withRepo({ "pharn-review/sample/sample.md": cap, ...APPLIES_EVALS }, (root) => {
    const r = run(root);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FLOOR: RED/);
    assert.match(r.stdout, /missing required frontmatter field: applies/);
  });
});

// ── CHECK 8 — the canon must name a relocated floor checker at its LIVE path ──────────────────────
// A canon file that CITES a floor checker, plus a pharn/floor that does or does not hold the twin.
// Deliberately carries no `rule_id:`/`problem:` tokens, so CHECK 5 cannot fire and every RED below is
// attributable to CHECK 8.
const CANON_DOC = (cite) => `# a capability body that invokes the floor\n\nRun \`node ${cite}\` over the artifact.\n`;

test("CHECK 8: a canon cite of a RELOCATED floor checker (twin exists) is RED and names both paths", () => {
  withRepo(
    {
      "pharn/pharn-review/sample/sample.md": CANON_DOC(".dev/floor/validate.mjs"),
      "pharn/floor/validate.mjs": "// the twin lives here now\n",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stdout, /FLOOR: RED/);
      assert.match(r.stdout, /P6\/floor-path/);
      assert.match(r.stdout, /pharn\/pharn-review\/sample\/sample\.md/);
      assert.match(r.stdout, /cites \.dev\/floor\/validate\.mjs/);
      assert.match(r.stdout, /now lives at pharn\/floor\/validate\.mjs/);
    }
  );
});

// The F2 boundary is CLOSED, and this pins that it stays closed. The five scan-plan-* grill-scanners
// used to live only in .dev/floor/ — dead in every user install, which ships pharn/ without .dev/ —
// and CHECK 8 stayed silent because with no twin there was nothing to point at. F2 relocated all five
// (plus their tests) to pharn/floor/, which is exactly the event that made this check start flagging
// their canon cites and forced the rewrite. So the assertion INVERTS: a griller cite of the old path
// is now a RED, and this test is the regression guard against re-introducing a dead scan-plan cite.
test("CHECK 8: a griller cite of a RELOCATED scan-plan scanner is RED — the F2 boundary is closed", () => {
  withRepo(
    {
      "pharn/pharn-pipeline/grillers/g/g.md": CANON_DOC(".dev/floor/scan-plan-secrets.mjs"),
      "pharn/floor/scan-plan-secrets.mjs": "// relocated by F2 — the twin now ships with the product\n",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stdout, /FLOOR: RED/);
      assert.match(r.stdout, /P6\/floor-path/);
      assert.match(r.stdout, /pharn\/pharn-pipeline\/grillers\/g\/g\.md/);
      assert.match(r.stdout, /cites \.dev\/floor\/scan-plan-secrets\.mjs/);
      assert.match(r.stdout, /now lives at pharn\/floor\/scan-plan-secrets\.mjs/);
    }
  );
});

// A scanner resident NOWHERE — griller prose names these as scanners that are not built. No twin, so
// no match. This is the half of the existence gate F2 did NOT close: the five relocated scan-plan-*
// now have twins and are flagged (above), while a ghost stays silent because there is still nothing
// to point it at. One mechanism, two outcomes, decided solely by whether the file exists.
test("CHECK 8: a GHOST cite (resident in neither floor) is NOT flagged", () => {
  withRepo({ "pharn/pharn-pipeline/grillers/g/g.md": CANON_DOC(".dev/floor/scan-plan-a11y.mjs") }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /FLOOR: GREEN/);
  });
});

// Inside pharn/floor a `.dev/floor/<twin>` is an INTENTIONAL dev-reference — the cross-copy pin's
// home, or the "deliberately does NOT import the packaged-away copy" note. Rewriting one would turn a
// true statement false, so the scope excludes that directory entirely.
test("CHECK 8: an intentional dev-reference INSIDE pharn/floor is NOT flagged", () => {
  withRepo(
    {
      "pharn/floor/check-loop-record.mjs":
        "// `.dev/floor/check-provenance.mjs` carries near-identical guards; this file deliberately does NOT import it.\n",
      "pharn/floor/check-provenance.mjs": "// the deliberate product-side copy\n",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.match(r.stdout, /FLOOR: GREEN/);
    }
  );
});

// Why CHECK 8 is scoped POSITIVELY to canon rather than "TARGET minus EXCLUDE_SEGMENTS": four checkers
// exist in BOTH floors as deliberate copies, and the root meta-docs correctly document the DEV one.
// Measured on the real tree at the time this landed: 9 such cites in CLAUDE.md, 21 in CHANGELOG.md,
// 1 in docs/lessons-index.md. A TARGET-wide walk would report all 31 correct sentences as drift.
test("CHECK 8: a root meta-doc citing the DEV copy of a copy-pair is NOT flagged (canon-scoped)", () => {
  withRepo(
    {
      "CLAUDE.md": "Run `node .dev/floor/check-provenance.mjs <candidate.json> <canon-file.md>`.\n",
      "pharn/floor/check-provenance.mjs": "// the deliberate product twin\n",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.match(r.stdout, /FLOOR: GREEN/);
    }
  );
});

// The semantic-judge fixtures cite the scanners by the same dead path, and validate's capability walk
// is .md-only — so CHECK 8 does its own collection over .md AND .json.
test("CHECK 8: an eval judge .json is scanned too, not just .md", () => {
  withRepo(
    {
      "pharn/pharn-review/ssrf/evals/expected/expected-x.json": JSON.stringify(
        { assertions: { semantic: [{ judge: "detected deterministically by .dev/floor/scan-code-ssrf.mjs" }] } },
        null,
        2
      ),
      "pharn/floor/scan-code-ssrf.mjs": "// moved here\n",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stdout, /FLOOR: RED/);
      assert.match(r.stdout, /expected-x\.json/);
      assert.match(r.stdout, /now lives at pharn\/floor\/scan-code-ssrf\.mjs/);
    }
  );
});

test("CHECK 8: canon citing the LIVE pharn/floor path is GREEN", () => {
  withRepo(
    {
      "pharn/pharn-review/sample/sample.md": CANON_DOC("pharn/floor/scan-code-injection.mjs"),
      "pharn/floor/scan-code-injection.mjs": "// lives here\n",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.match(r.stdout, /FLOOR: GREEN/);
    }
  );
});

// One finding per stale checker per file — a body citing the same scanner eight times is one defect,
// not eight. (On the real pre-fix tree this collapsed 322 raw references into 210 findings.)
test("CHECK 8: repeated cites of the same checker in one file yield exactly ONE finding", () => {
  withRepo(
    {
      "pharn/pharn-review/sample/sample.md":
        CANON_DOC(".dev/floor/validate.mjs") + "\nAlso `.dev/floor/validate.mjs`, and again `.dev/floor/validate.mjs`.\n",
      "pharn/floor/validate.mjs": "// the twin\n",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 1);
      assert.equal(r.stdout.match(/P6\/floor-path/g).length, 1);
    }
  );
});

// The integration assertion: the REAL tree is clean. This is what the hermetic fixtures above cannot
// show — that the rewrite actually landed everywhere CHECK 8 looks.
test("CHECK 8: the real repo tree is GREEN — no canon file cites a relocated floor checker", () => {
  const r = run(join(here, "..", ".."));
  assert.equal(r.status, 0);
  assert.match(r.stdout, /FLOOR: GREEN/);
});

// ── CHECK 8's canon scope is DISCOVERED from the target, not a fixed list ─────────────────────────
// The four modules that exist today were once a hardcoded array, which made every FUTURE pharn-*
// module a silent blind spot in the one check meant to stop floor-rot. CANON_DIRS is now every
// pharn/pharn-* directory under the target, sorted. These four pin the axis: a module outside the old
// list is scanned; the graceful skip when pharn/ is absent survives the extra readdirSync; the
// `pharn-` prefix is what excludes pharn/floor; and a pharn-*-named FILE is not a module root.

test("CHECK 8: a module OUTSIDE the old hardcoded four (pharn-audits) IS scanned — the scope is discovered", () => {
  withRepo(
    {
      "pharn/pharn-audits/some/some.md": CANON_DOC(".dev/floor/validate.mjs"),
      "pharn/floor/validate.mjs": "// the twin lives here now\n",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stdout, /FLOOR: RED/);
      assert.match(r.stdout, /P6\/floor-path/);
      assert.match(r.stdout, /pharn\/pharn-audits\/some\/some\.md/);
      // The message-level assertion is the linchpin: a scope that never visits pharn-audits emits no
      // CHECK 8 finding at all, so only this line fails when the enumeration regresses to a fixed list.
      assert.match(r.stdout, /now lives at pharn\/floor\/validate\.mjs/);
    }
  );
});

// The enumeration reads <TARGET>/pharn directly, one level ABOVE walkExts. Without the same
// try/catch -> [], a target with no pharn/ goes from a clean skip to a crash of the whole validator.
test("CHECK 8: a target with NO pharn/ directory does not throw — the documented fail-open path holds", () => {
  withRepo({ "README.md": "# a repo that is not PHARN\n" }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.doesNotMatch(r.stderr, /Error/);
    assert.match(r.stdout, /FLOOR: GREEN/);
  });
});

// `floor` carries no `pharn-` prefix, so the discovered scope never visits it — the exclusion the old
// list got by omission is now structural. A twinned dev-ref there is INTENTIONAL (the cross-copy pin's
// home); flagging it would turn a true statement into a false one.
test("CHECK 8: the `pharn-` prefix excludes pharn/floor — a twinned dev-ref there emits no finding", () => {
  withRepo(
    {
      "pharn/floor/check-loop-record.mjs": "// deliberately does NOT import `.dev/floor/check-provenance.mjs`\n",
      "pharn/floor/check-provenance.mjs": "// the deliberate product-side copy\n",
      "pharn/pharn-review/sample/sample.md": CANON_DOC("pharn/floor/check-provenance.mjs"),
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.match(r.stdout, /FLOOR: GREEN/);
      assert.doesNotMatch(r.stdout, /now lives at/);
    }
  );
});

// The `pharn-` prefix is the POSITIVE scope, and it is NOT redundant with EXCLUDE_SEGMENTS: that list
// names pharn/floor specifically, so ANY OTHER non-module directory under pharn/ would be walked
// without the prefix test. Canon is pharn-*; a sibling directory is not canon and is not scanned.
// (This is the case that kills a prefix-filter mutant — the pharn/floor case above cannot, because
// EXCLUDE_SEGMENTS catches that one on its own.)
test("CHECK 8: a non-module directory under pharn/ (not `pharn-*`, not floor) is NOT scanned", () => {
  withRepo(
    {
      "pharn/templates/t.md": CANON_DOC(".dev/floor/validate.mjs"),
      "pharn/floor/validate.mjs": "// the twin\n",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.match(r.stdout, /FLOOR: GREEN/);
      assert.doesNotMatch(r.stdout, /now lives at/);
    }
  );
});

// A pharn-*-named FILE is not a module root. NARROWED, and stated: this pins the observable BEHAVIOR,
// not the isDirectory() guard itself — walkExts's own readdirSync try/catch produces the same silence
// when handed a file path, so removing the guard is not black-box detectable. The guard is kept for
// explicitness: the scope should be directories by construction, not by an exception downstream.
test("CHECK 8: a pharn-*-named FILE beside a real module is NOT treated as a module root", () => {
  withRepo(
    {
      "pharn/pharn-notadir.md": CANON_DOC(".dev/floor/validate.mjs"),
      "pharn/pharn-review/sample/sample.md": CANON_DOC(".dev/floor/validate.mjs"),
      "pharn/floor/validate.mjs": "// the twin\n",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 1);
      // Exactly ONE finding — the real module's. The sibling FILE is skipped, never scanned as a root.
      assert.equal(r.stdout.match(/P6\/floor-path/g).length, 1);
      assert.match(r.stdout, /pharn\/pharn-review\/sample\/sample\.md/);
      assert.doesNotMatch(r.stdout, /pharn-notadir/);
    }
  );
});

// Two broken-symlink cases, one per enumeration level — the discovered scope reads <TARGET>/pharn
// itself, so a stat failure is now possible one level ABOVE walkExts as well as inside it. Both must
// degrade to a skip: the scope walk feeds a floor verdict, and a crash converts RED-or-GREEN into no
// verdict at all, which is strictly worse than either. Each asserts the REST of the scope still
// reports, so one bad entry cannot silently swallow the scan.
const DANGLING_FIXTURE = {
  "pharn/pharn-review/s/s.md": CANON_DOC(".dev/floor/validate.mjs"),
  "pharn/floor/validate.mjs": "// the twin\n",
};

test("CHECK 8: a broken symlink NAMED pharn-* is skipped, not crashed on — the rest of the scope still reports", () => {
  withRepo(DANGLING_FIXTURE, (root) => {
    symlinkSync(join(root, "nowhere"), join(root, "pharn", "pharn-dangling"));
    const r = run(root);
    assert.equal(r.status, 1);
    assert.doesNotMatch(r.stderr, /Error/);
    assert.match(r.stdout, /now lives at pharn\/floor\/validate\.mjs/);
  });
});

test("CHECK 8: a broken symlink INSIDE a module is skipped, not crashed on — the rest of the scope still reports", () => {
  withRepo(DANGLING_FIXTURE, (root) => {
    symlinkSync(join(root, "nowhere"), join(root, "pharn", "pharn-review", "dangling.md"));
    const r = run(root);
    assert.equal(r.status, 1);
    assert.doesNotMatch(r.stderr, /Error/);
    assert.match(r.stdout, /now lives at pharn\/floor\/validate\.mjs/);
  });
});

// ---------------------------------------------------------------------------------------------
// CHECK 3 (fix #6) — the enforces↔evals binding is EXACT VALUE MEMBERSHIP, not a substring scan.
//
// Regression set for three false-GREENs reproduced live against the pre-fix check: a prefix
// collision (`SEC-1` is a substring of `SEC-12`), a bare prose mention satisfying the binding, and
// an unparseable fixture falling through to "" instead of REDding. The last two tests pin the
// non-JSON path, which is deliberately weaker than the JSON one but must still reject prose.

// A capability whose `enforces` is the file-qualified form P4 prescribes — the form where the
// prefix collision actually bites (the principle ids P0–P7 cannot collide with each other).
const ENFORCING_CAP = (id) => `---
name: sample-lens
role: lens
kind: pharn-owned
applies: ["universal"]
enforces: ["${id}"]
version: 0.1.0
---

# A sample product capability
`;

// An eval-format expected fixture (pharn-contracts/eval-format.md): the rule_id lives in the
// STRUCTURED location — a structural[] field_equals entry — never in the prose beside it.
const EXPECTED_JSON = (ruleId) =>
  JSON.stringify(
    {
      skill_kind: "llm",
      assertions: {
        structural: [
          { kind: "finding_count", op: "==", value: 1 },
          { kind: "field_equals", field: "rule_id", value: ruleId },
        ],
        semantic: [],
      },
    },
    null,
    2
  );

test("★ CHECK 3: PREFIX COLLISION — enforces SEC-1 with a fixture producing only SEC-12 is RED (was GREEN)", () => {
  withRepo(
    {
      "pharn-review/sample/sample.md": ENFORCING_CAP("security.md SEC-1"),
      "pharn-review/sample/evals/cases/case-1.md": "# a case\n",
      "pharn-review/sample/evals/expected/expected-1.json": EXPECTED_JSON("security.md SEC-12"),
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stdout, /P1\/fix#6/);
      assert.match(r.stdout, /enforces rule_id "security\.md SEC-1" has no eval case that produces it/);
      // The message names what the fixtures DO declare — otherwise the collision is invisible.
      assert.match(r.stdout, /fixtures declare: security\.md SEC-12/);
    }
  );
});

test("★ CHECK 3: EXACT MATCH — enforces SEC-1 with a fixture producing SEC-1 stays GREEN", () => {
  withRepo(
    {
      "pharn-review/sample/sample.md": ENFORCING_CAP("security.md SEC-1"),
      "pharn-review/sample/evals/cases/case-1.md": "# a case\n",
      "pharn-review/sample/evals/expected/expected-1.json": EXPECTED_JSON("security.md SEC-1"),
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.match(r.stdout, /FLOOR: GREEN — 1 capabilities checked/);
    }
  );
});

// The fixture scan is ONE LEVEL DEEP, and the skip is decided by the READ ITSELF: `readFileSync` on a
// directory throws EISDIR. There is deliberately no preceding `statSync(p).isDirectory()` — a
// stat-then-read pair is the time-of-check/time-of-use window CodeQL names `js/file-system-race`.
// These two pin BOTH halves of that skip, which was previously untested: the directory must be passed
// over SILENTLY (no unreadable-fixture RED), and it must NOT contribute the ids it contains.
test("★ CHECK 3: a SUBDIRECTORY under evals/expected is skipped silently — not reported as unreadable", () => {
  withRepo(
    {
      "pharn-review/sample/sample.md": ENFORCING_CAP("security.md SEC-1"),
      "pharn-review/sample/evals/cases/case-1.md": "# a case\n",
      "pharn-review/sample/evals/expected/expected-1.json": EXPECTED_JSON("security.md SEC-1"),
      // Writing one level deeper is what CREATES the `nested/` directory entry inside expected/.
      "pharn-review/sample/evals/expected/nested/expected-2.json": EXPECTED_JSON("security.md SEC-9"),
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.match(r.stdout, /FLOOR: GREEN — 1 capabilities checked/);
      assert.doesNotMatch(r.stdout, /unreadable/);
    }
  );
});

test("★ CHECK 3: a rule_id living ONLY in a subdirectory fixture does not bind — the scan stays one level deep", () => {
  withRepo(
    {
      "pharn-review/sample/sample.md": ENFORCING_CAP("security.md SEC-9"),
      "pharn-review/sample/evals/cases/case-1.md": "# a case\n",
      "pharn-review/sample/evals/expected/expected-1.json": EXPECTED_JSON("security.md SEC-1"),
      "pharn-review/sample/evals/expected/nested/expected-2.json": EXPECTED_JSON("security.md SEC-9"),
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stdout, /enforces rule_id "security\.md SEC-9" has no eval case that produces it/);
    }
  );
});

// The binding must range over enum-gated positions ONLY. A semantic[] judge string is free text that
// inherits the case's untrusted tag (finding-shape.md) — a rule id inside one is DATA about a rule,
// never evidence that a fixture produces it.
test("★ CHECK 3: FREE-TEXT ONLY — a rule_id appearing only in a semantic[] judge string is RED (was GREEN)", () => {
  withRepo(
    {
      "pharn-review/sample/sample.md": ENFORCING_CAP("P2"),
      "pharn-review/sample/evals/cases/case-1.md": "# a case\n",
      "pharn-review/sample/evals/expected/expected-1.json": JSON.stringify({
        skill_kind: "llm",
        assertions: {
          structural: [{ kind: "finding_count", op: "==", value: 0 }],
          semantic: [{ judge: "the sink is reported as a FLOOR finding (rule_id P2), never suppressed" }],
        },
      }),
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stdout, /enforces rule_id "P2" has no eval case that produces it/);
    }
  );
});

// Fail-closed. The valid sibling fixture DOES bind the id, so the binding finding does not fire —
// which is exactly why the pre-fix `catch { return "" }` hid this: the unparseable file contributed
// nothing and nobody noticed. The parse failure must be its own loud RED, naming the file.
test("★ CHECK 3: MALFORMED FIXTURE — an unparseable expected/*.json REDs by name even when a sibling binds the id", () => {
  withRepo(
    {
      "pharn-review/sample/sample.md": ENFORCING_CAP("P2"),
      "pharn-review/sample/evals/cases/case-1.md": "# a case\n",
      "pharn-review/sample/evals/expected/expected-good.json": EXPECTED_JSON("P2"),
      "pharn-review/sample/evals/expected/expected-broken.json": "{ not json at all",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stdout, /expected fixture "expected-broken\.json" is not parseable JSON/);
      // The binding itself is satisfied by the good fixture — exactly ONE finding, the parse failure.
      assert.doesNotMatch(r.stdout, /has no eval case that produces it/);
    }
  );
});

// eval-format.md writes `expected` as evals/expected/*.md, so the .md-only shape is contract-
// conformant and must keep binding — dropping the fallback would convert a valid capability to RED.
test("★ CHECK 3: .md-ONLY fixture — an anchored `rule_id:` line in the finding block binds (no false RED)", () => {
  withRepo(
    {
      "pharn-review/sample/sample.md": ENFORCING_CAP("P2"),
      "pharn-review/sample/evals/cases/case-1.md": "# a case\n",
      "pharn-review/sample/evals/expected/expected-1.md": [
        "# Expected — case-1",
        "",
        "```yaml",
        "- type: FINDING # enum-gated",
        '  rule_id: P2 # enum-gated — cited (P4); also the eval binding for enforces: ["P2"]',
        "  severity: important",
        "```",
      ].join("\n"),
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.match(r.stdout, /FLOOR: GREEN — 1 capabilities checked/);
    }
  );
});

// The fallback's floor: it is a regex over free-form markdown and cannot read a structured location,
// but it must still reject a bare PROSE mention — the live .md fixtures are full of sentences like
// "reported as a FLOOR finding (rule_id P2)" and `purpose:` lines naming the id, none of which are
// declarations. Without this the fallback would re-admit the substring behavior the fix removes.
test("★ CHECK 3: .md PROSE MENTION — a rule_id named only in prose (no `rule_id:` line) does NOT bind", () => {
  withRepo(
    {
      "pharn-review/sample/sample.md": ENFORCING_CAP("P2"),
      "pharn-review/sample/evals/cases/case-1.md": "# a case\n",
      "pharn-review/sample/evals/expected/expected-1.md": [
        "---",
        'purpose: "the sink is reported as exactly one FLOOR finding (rule_id P2)"',
        "---",
        "",
        "# Expected — case-1",
        "",
        "The lens must emit one finding citing rule_id P2, and must not suppress it.",
      ].join("\n"),
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 1);
      assert.match(r.stdout, /enforces rule_id "P2" has no eval case that produces it/);
    }
  );
});

// ---------------------------------------------------------------------------
// The target guard: an unusable TARGET is a RED, never a GREEN over zero capabilities.
//
// Before the guard, `validate.mjs /no/such/dir` printed `GREEN — 0 capabilities checked` and exited
// 0 — a wrong path or a wrong cwd reported a clean floor having checked nothing, which an
// exit-code-only CI step cannot see.
//
// The refusal branches are ENUMERATED here, in one place, and every rule below iterates this array,
// so a branch added later inherits all of them for free. Authoring the rules against whichever
// branch happened to be in front of us is the shape that reads as discharged while covering half its
// domain (.dev/memory-bank/lessons-learned.md L29 — cited, not restated, P4).
const BAD_TARGETS = [
  {
    name: "a path that does not exist",
    // Built inside a scratch dir and never created, so absence is guaranteed by construction rather
    // than by assuming some fixed path is missing on the runner.
    make: (root) => join(root, "definitely-absent"),
    message: "does not exist",
  },
  {
    name: "a path that is a file, not a directory",
    make: (root) => {
      const p = join(root, "a-file.md");
      writeFileSync(p, "not a directory\n");
      return p;
    },
    message: "is not a readable directory",
  },
];

function withScratch(fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-validate-target-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

for (const branch of BAD_TARGETS) {
  test(`target guard: ${branch.name} exits 1 with a RED`, () => {
    withScratch((root) => {
      const r = run(branch.make(root));
      assert.equal(r.status, 1);
      assert.match(r.stdout, /FLOOR: RED/);
    });
  });

  test(`target guard: ${branch.name} names the offending path`, () => {
    withScratch((root) => {
      const target = branch.make(root);
      const out = run(target).stdout;
      assert.ok(out.includes(target), `the RED must name the rejected path so the operator can see WHICH path was wrong; got: ${out}`);
    });
  });

  // The refusal happens before the walk, so it must not claim a capability count — a "0 capabilities
  // checked" on a refusal would reproduce, inside the RED, the same fabricated-scan reading the
  // guard exists to remove.
  test(`target guard: ${branch.name} claims no capability count`, () => {
    withScratch((root) => {
      assert.doesNotMatch(run(branch.make(root)).stdout, /capabilities checked/);
    });
  });

  // L27's remedy, and the half L29 names load-bearing: each branch's message must be present in ITS
  // case AND ABSENT from every other branch's. Without the absence half, an implementation printing
  // ONE shared message for both branches would satisfy every rule above.
  test(`target guard: ${branch.name} prints its own message and no other branch's`, () => {
    withScratch((root) => {
      const out = run(branch.make(root)).stdout;
      assert.ok(out.includes(branch.message), `expected the branch's own message "${branch.message}"`);
      for (const other of BAD_TARGETS) {
        if (other === branch) continue;
        assert.ok(!out.includes(other.message), `"${other.message}" belongs to a different branch and must not appear here`);
      }
    });
  });
}

// The guard must not RED the legitimate empty walk: an existing, readable, EMPTY directory has
// genuinely zero capabilities, and reporting GREEN over it is honest.
test("target guard: a valid EMPTY directory stays GREEN", () => {
  withScratch((root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /FLOOR: GREEN/);
  });
});

// …nor the real tree, which is the target every caller actually passes.
test("target guard: the repo root itself stays GREEN", () => {
  const r = run(join(here, "..", ".."));
  assert.equal(r.status, 0);
  assert.match(r.stdout, /FLOOR: GREEN/);
});

// ---------------------------------------------------------------------------
// The path is rendered as QUOTED DATA, on BOTH renders.
//
// A path may legally contain a newline. Spliced raw into the report it forged an extra line shaped
// exactly like a finding — probed live before the fix: a target of `x\n- [blocking] FORGED  nowhere`
// rendered that second line verbatim, and it reads as a blocking finding no check produced.
//
// The RED render and the GREEN render are BOTH exercised here, because the property belongs to the
// path rather than to one call site — asserting it on whichever render the defect was reported
// against would leave the other free to reintroduce it (L29).
const rendersThatEchoTheTarget = [
  {
    name: "the RED refusal render",
    // Absent, so the guard refuses and the path is echoed into the finding line.
    target: (root) => join(root, "absent\n- [blocking] FORGED  nowhere"),
    expectStatus: 1,
  },
  {
    name: "the GREEN report render",
    // A real directory whose NAME contains a newline: it passes the guard, so the echo happens on
    // the GREEN line instead.
    target: (root) => {
      const p = join(root, "real\n- [blocking] FORGED  nowhere");
      mkdirSync(p, { recursive: true });
      return p;
    },
    expectStatus: 0,
  },
];

for (const render of rendersThatEchoTheTarget) {
  test(`quoted render: ${render.name} cannot be made to forge a finding line`, () => {
    withScratch((root) => {
      let target;
      try {
        target = render.target(root);
      } catch {
        return; // a filesystem that refuses newlines in names has nothing to forge with
      }
      const r = run(target);
      assert.equal(r.status, render.expectStatus);
      const forged = r.stdout.split("\n").filter((l) => l.trimStart().startsWith("- [blocking]"));
      assert.equal(
        forged.length,
        render.expectStatus === 1 ? 1 : 0,
        `the newline must be escaped, not rendered as a line break; got:\n${r.stdout}`
      );
      // Positive half: the escape is what makes that true, so assert it rather than only its effect.
      assert.match(r.stdout, /\\n/, `the control character must appear escaped; got:\n${r.stdout}`);
    });
  });
}

// ---------------------------------------------------------------------------
// CHECK 6 — no forbidden cross-module reference (P3).
//
// Until the widening, this branch matched `pharn-(?:stack|skills)-*` ONLY. Both families are unbuilt,
// so the branch could not fire on either sibling module that exists (pharn-pipeline, pharn-review) and
// NO test reached it — the only floor expression of P3 was vacuous on the live tree. These tests exist
// because a re-widened branch with no test that RED-fires it would be the same defect wearing a newer
// regex: per L34 a per-item assertion set says nothing until something proves the domain is non-empty.

// A capability in `module`, declaring `reads`. Every other CHECK is satisfied (frontmatter, evals) so a
// non-zero exit can only come from CHECK 6.
function capWithReads(module, name, reads) {
  const dir = `${module}/${name}`;
  return {
    [`${dir}/${name}.md`]: `---
name: ${name}
role: lens
kind: pharn-owned
applies: ["universal"]
reads: [${reads.map((r) => JSON.stringify(r)).join(", ")}]
version: 0.1.0
---

# ${name}
`,
    [`${dir}/evals/cases/case-1.md`]: "# a case\n",
    [`${dir}/evals/expected/expected-1.md`]: "# expected\n",
  };
}

// The finding's own vocabulary — asserted from one place so a reworded message updates one line rather
// than silently un-testing every row below (L29: the enumeration is the deliverable).
const CHECK6_RE = /cross-module reference in reads:/;

// [ownModule, reads, expectedModule|null, why]. The table IS the specification: each row is a shape the
// check must classify, and both directions live side by side so a change that fixes one by breaking the
// other cannot pass (L36 — the exemption is pinned as a SET, not one member at a time).
const check6Cases = [
  // --- the branch that could not fire before ---
  ["pharn-pipeline", ["pharn/pharn-review/injection/injection.md"], "pharn-review", "leaf -> leaf, the live shape"],
  ["pharn-review", ["pharn/pharn-pipeline/grillers/security/security.md"], "pharn-pipeline", "leaf -> leaf, other direction"],
  // --- backward compatibility: the widening must not NARROW what the old regex caught ---
  ["pharn-pipeline", ["pharn-stack-next/tokens.md"], "pharn-stack-next", "the old matcher's only shape still REDs"],
  ["pharn-pipeline", ["pharn-skills-react/x.md"], "pharn-skills-react", "the skills half still REDs"],
  // --- the exemption moved to the TARGET module, so a BASE module's own reads: is now checkable ---
  ["pharn-core", ["pharn/pharn-review/injection/injection.md"], "pharn-review", "a base module reading upward is no longer exempt"],
  // --- laundering: every token is examined, not just the first match ---
  [
    "pharn-pipeline",
    ["pharn/pharn-contracts/finding-shape.md", "pharn/pharn-review/x.md"],
    "pharn-review",
    "a sibling ref alongside an exempt contracts path still REDs",
  ],
  // --- GREEN: the 35-site live shape a target-blind widening would have blocked (L3) ---
  ["pharn-review", ["pharn/pharn-contracts/finding-shape.md"], null, "base target pharn-contracts is exempt"],
  ["pharn-pipeline", ["pharn/pharn-core/seam-resolver/seam-resolver.md"], null, "base target pharn-core is exempt"],
  ["pharn-review", ["pharn/pharn-review/ssrf/ssrf.md"], null, "own-module self-reference"],
  ["pharn-pipeline", ["pharn/ARCHITECTURE.md"], null, "a value naming no module token"],
  ["pharn-pipeline", ["<the PLAN.md under interrogation>"], null, "a placeholder"],
  // --- token-anchored, so a `pharn-` FILENAME is not a module (a substring scan false-REDs this) ---
  ["pharn-pipeline", ["docs/pharn-notes.md"], null, "a pharn- filename is not a module reference"],
  ["pharn-pipeline", ["notpharn-review/x.md"], null, "a token must START at pharn-"],
];

for (const [ownModule, reads, expectedModule, why] of check6Cases) {
  const red = expectedModule !== null;
  test(`★ CHECK 6 ${red ? "RED" : "GREEN"}: ${ownModule} reads ${JSON.stringify(reads)} — ${why}`, () => {
    withRepo(capWithReads(ownModule, "sample", reads), (root) => {
      const r = run(root);
      assert.equal(r.status, red ? 1 : 0, `unexpected verdict; got:\n${r.stdout}`);
      if (red) {
        assert.match(r.stdout, CHECK6_RE, `the RED must be CHECK 6's, not another check's; got:\n${r.stdout}`);
        assert.match(r.stdout, new RegExp(`names module ${expectedModule}\\b`), `the finding must NAME the module; got:\n${r.stdout}`);
      } else {
        assert.doesNotMatch(r.stdout, CHECK6_RE, `CHECK 6 must not fire here; got:\n${r.stdout}`);
      }
    });
  });
}

test("★ CHECK 6: one finding per module per value, not one per occurrence", () => {
  withRepo(capWithReads("pharn-pipeline", "sample", ["pharn-review/a.md pharn-review/b.md"]), (root) => {
    const r = run(root);
    assert.equal(r.status, 1);
    const hits = r.stdout.split("\n").filter((l) => CHECK6_RE.test(l));
    assert.equal(hits.length, 1, `the same module named twice in one value must emit ONCE; got:\n${r.stdout}`);
  });
});

// NON-VACUITY CONTROL (L34). Every test above asserts "the RED fires"; none of them proves the RED comes
// from CHECK 6's branch rather than from something incidental to the fixture. This runs the identical RED
// fixture against a MUTANT validate.mjs whose CHECK 6 emission is disabled, and requires it to go GREEN.
// If the branch were deleted, mutant and original would agree and this test fails.
//
// The anchor is asserted UNIQUE before the mutation, which is the half that keeps the control itself
// honest: a drifted anchor would otherwise mutate nothing, the mutant would RED like the original, and
// the failure would read as "the branch is load-bearing" — a vacuous pass dressed as the real one.
test("★ CHECK 6 NON-VACUITY: the RED disappears when CHECK 6's branch is disabled (mutation control)", () => {
  const source = readFileSync(VALIDATE, "utf8");
  const anchor = "if (!MODULE_TOKEN_RE.test(target)) continue;";
  assert.equal(
    source.split(anchor).length - 1,
    1,
    "the mutation anchor must occur EXACTLY once in validate.mjs, or this control mutates the wrong construct (or nothing)"
  );
  const mutant = source.replace(anchor, "if (true) continue; // MUTANT: CHECK 6 disabled");
  assert.notEqual(mutant, source, "the mutation must actually change the source, or this control is vacuous (L34)");

  withRepo(capWithReads("pharn-pipeline", "sample", ["pharn/pharn-review/injection/injection.md"]), (root) => {
    // Control: the real validator REDs on this fixture.
    const real = run(root);
    assert.equal(real.status, 1, `precondition: the unmutated validator must RED here; got:\n${real.stdout}`);
    assert.match(real.stdout, CHECK6_RE);

    // Mutant: same fixture, CHECK 6 disabled -> GREEN. This is what proves the RED was CHECK 6's.
    withRepo({ "validate.mjs": mutant }, (mutantRoot) => {
      const m = spawnSync(process.execPath, [join(mutantRoot, "validate.mjs"), root], { encoding: "utf8" });
      assert.equal(m.status, 0, `with CHECK 6 disabled the same fixture must be GREEN; got:\n${m.stdout}`);
      assert.doesNotMatch(m.stdout, CHECK6_RE);
    });
  });
});

// BOUND 4, pinned as a KNOWN state rather than left to drift. A bare-filename module reference evades
// CHECK 6: the `.` leaves the token unanchorable. The previous substring matcher caught this shape, so
// the widening genuinely NARROWED here — raised by an automated review of the widening PR. It is
// ACCEPTED because the two shapes are lexically indistinguishable: stripping the extension to catch
// `pharn-stack-next.md` equally turns `docs/pharn-notes.md` into the module token `pharn-notes` and REDs
// a correct declaration. L3 settles the trade (a rule that blocks correct declarations is the recurring
// defect), and CHECK 6 is labeled best-effort. This test asserts BOTH halves, so a future change that
// closes the gap fails here and forces the false-positive question to be answered deliberately.
test("★ CHECK 6 BOUND 4: a bare-filename sibling ref is GREEN (accepted narrowing), while the path form REDs", () => {
  // The evading shape — no path separator, so the extension stays attached to the token.
  withRepo(capWithReads("pharn-pipeline", "sample", ["pharn-stack-next.md"]), (root) => {
    const r = run(root);
    assert.equal(r.status, 0, `bare-filename ref is a KNOWN, documented miss; got:\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, CHECK6_RE);
  });

  // The discriminator: the SAME module named in path form IS caught, so the miss above is specifically
  // the extension-attachment case and not CHECK 6 having stopped working.
  withRepo(capWithReads("pharn-pipeline", "sample", ["pharn-stack-next/tokens.md"]), (root) => {
    const r = run(root);
    assert.equal(r.status, 1, `the path form MUST still RED, or bound 4 is masking a real break; got:\n${r.stdout}`);
    assert.match(r.stdout, CHECK6_RE);
  });

  // And the reason the extension is not simply stripped: this correct declaration must stay GREEN.
  withRepo(capWithReads("pharn-pipeline", "sample", ["docs/pharn-notes.md"]), (root) => {
    const r = run(root);
    assert.equal(r.status, 0, `a doc whose stem merely starts with pharn- must NOT RED; got:\n${r.stdout}`);
  });
});

// The value is free text (fix #1) and reaches the human-facing report, so it gets the same quoted-render
// treatment as the target path: a newline in it must not be able to forge a `- [blocking]` line.
test("★ CHECK 6: a newline-bearing reads: value cannot forge a finding line", () => {
  withRepo(capWithReads("pharn-pipeline", "sample", ["pharn/pharn-review/a.md\n- [blocking] FORGED  nowhere"]), (root) => {
    const r = run(root);
    assert.equal(r.status, 1);
    const blocking = r.stdout.split("\n").filter((l) => l.trimStart().startsWith("- [blocking]"));
    assert.equal(blocking.length, 1, `the newline must be escaped, not rendered as a line break; got:\n${r.stdout}`);
    assert.match(r.stdout, /\\n/, "the control character must appear escaped");
  });
});
