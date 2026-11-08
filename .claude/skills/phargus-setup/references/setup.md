# Connect Phargus to an application

Inspect package.json, Node version, actual start command and stdout logging. Run doctor
if Phargus is already installed. Otherwise install the tested release from npm:

```bash
cd /app
npm install @pharn-dev/phargus@0.1.0
```

Respect the application's existing package manager and lockfile; for example
pnpm add @pharn-dev/phargus@0.1.0 or yarn add @pharn-dev/phargus@0.1.0. If the registry
is unavailable, build the release tag from source and install its tarball:

```bash
git clone --branch v0.1.0 --depth 1 https://github.com/pharn-dev/phargus.git /chosen/source/phargus
cd /chosen/source/phargus
npm ci
npm pack
cd /app
npm install /chosen/source/phargus/pharn-dev-phargus-0.1.0.tgz
```

The source Phargus repository itself uses npm. If the user already supplied a compatible
tarball (version >=0.1.0 <0.2.0), use it.

Load the agent before application code. CommonJS: node --require @pharn-dev/phargus/agent app.cjs.
ESM: node --import @pharn-dev/phargus/agent app.mjs. These are Node commands, not a nonexistent
Phargus CLI. Adapt wrappers such as tsx or framework runners to their actual Node launch.

Prefer PHARGUS_OUTPUT=/absolute/app/.phargus/raw.ndjson so ordinary logs cannot corrupt the
data stream. The parent directory must exist. PHARGUS_INTERVAL_MS defaults to 1000,
PHARGUS_QUEUE_BOUND to 1024, PHARGUS_ENABLED to true. phargus.config.json has output,
intervalMs, queueBound and enabled. Unknown PHARGUS_* variables warn; invalid values
disable collection while the application continues. Check stderr as well as startup.

The agent does not launch a dashboard. For a portable application-side collector,
copy the entire bundled scripts directory to an application-owned location such as
.phargus/tools, then create a diagnostic npm script invoking those local files. Preserve
their sibling modules. Never leave an absolute path to a user's skill/plugin cache in
the start command. Keep transient captures out of version control.

Start the application, then run the copied collect helper with --follow. Bind to
127.0.0.1 by default. Non-loopback requires a nonempty token. The dashboard is HTTP;
use a tunnel or TLS proxy for remote access. Scripts use Authorization: Bearer.
The dashboard answers only its bind address (plus localhost names for loopback); any
other Host header gets 421 and a cross-origin /events request gets 403. Behind a reverse
proxy or container port mapping that forwards another name, pass --allowed-host NAME
(repeatable; NAME or NAME:PORT) to the collect helper, or allowedHosts to
createDashboardServer. An SSH tunnel to the loopback port needs no allowed host.

Exercise an existing harmless application endpoint or its representative test workload,
wait for samples, and capture /events. Check metrics and expected incoming request spans.
Restart using the saved recipe and repeat; successful imports alone do not verify setup.
Stop processes you started and close the collector/dashboard when the test finishes.

Helpers print their JSON result to stdout. When the user names a file for a result, such
as a summarize result in tool-result.json, redirect it to exactly that path. A relative
name is relative to the application directory: tool-result.json means /app/tool-result.json,
not /app/.phargus/tool-result.json or a file in the capture directory. .phargus/ holds raw
data, captures and copied tools, never a result the user asked for elsewhere. Check that
the named file exists before reporting setup as verified.

Under the Node permission model, grant the required output file access. Tracing and
samplers add measurable overhead, especially promise-heavy work on Node 22. Use an
application workload to quantify it; a successful setup is not a zero-overhead claim.
