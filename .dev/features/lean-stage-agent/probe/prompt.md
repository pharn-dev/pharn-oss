This is a measurement probe for PHARN's `pharn-stage` subagent type. Do exactly these three steps, in order, one
Agent call each, and wait for each agent to finish before the next. In every call pass no `model`, no
`run_in_background` and no `isolation` parameter.

1. Agent call: `subagent_type: "pharn-stage"`, `description: "probe pharn-stage"`, prompt:
   `Reply with exactly PROBE-OK. Make no tool call.`
2. Agent call: `subagent_type: "general-purpose"`, `description: "probe general-purpose"`, prompt:
   `Reply with exactly PROBE-OK. Make no tool call.`
3. Agent call: `subagent_type: "pharn-stage"`, `description: "probe pharn-stage write"`, prompt:
   `Use the Write tool once to create the file pharn/floor/stage-agent-probe/probe.json with the content []. Do not retry, do not use Bash, and do not write any other file. Then reply with the Write tool's result, verbatim.`

If the `pharn-stage` type is not offered, stop at once and say so: never substitute another type. When the three
agents have finished, print each one's agent id and its final reply, and do nothing else.
