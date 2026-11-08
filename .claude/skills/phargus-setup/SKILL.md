---
name: phargus-setup
description: Install, connect, and verify Phargus diagnostics in a Node.js application. Use when adding Phargus, configuring agent output, or repairing the agent-to-collector-to-dashboard connection.
license: Apache-2.0
compatibility: Node.js >=22.18.0; access to the target application and to npm (@pharn-dev/phargus 0.1.x) or the Phargus v0.1.0 source tag.
---

# Phargus Setup

Connect Phargus to the actual application and leave a reproducible start recipe.
Read [compatibility](references/compatibility.md) before selecting a package and
[setup](references/setup.md) for the integration procedure. Use
[tools](references/tools.md) for bundled command options.

1. Inspect the application, its start command, module format, Node version and logging.
   Resolve the absolute directory of this SKILL.md; run scripts/phargus.mjs from that
   directory, with --project pointing to the application.
2. Use doctor to inspect an existing installation. When needed, install the tested
   release from npm (@pharn-dev/phargus@0.1.0) with the application's package manager;
   build the v0.1.0 source tag only when the registry is unavailable.
3. Configure early preload and a dedicated NDJSON file. Create a portable application-side
   collector recipe by copying the bundled scripts directory; save commands using those
   application-owned paths, not plugin-cache paths.
4. Start the application and collector, exercise a suitable existing endpoint/workload,
   capture SSE, and inspect actual samples and incoming spans. Read
   [data semantics](references/data.md) when interpreting that verification.
5. Restart with the saved recipe and verify again. Clean up test processes you started.
6. When the request names a file for a helper result (for example a summarize result in
   tool-result.json), write that helper's JSON output to exactly the named path. Resolve
   a relative name against the application directory itself, not .phargus/ or the
   capture directory, and confirm the file exists there before finishing.

Return the changed files, reproducible launch commands, the saved result paths and
observed data proving the connection. Report missing requirements or incomplete
verification explicitly.

Example request: "Add Phargus to this Express app and show that its dashboard receives data."
