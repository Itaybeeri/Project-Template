# Onboarding — fresh-machine setup

Keep this current: whenever a change adds or alters something a fresh machine needs (a
tool, a dependency, a setup step, an env var), update this file in the **same** change.

## Prerequisites

<FILL: tools + versions a fresh machine needs (language runtime, package manager,
container runtime, cluster tools, etc.).>

| Tool | Version | Why |
|---|---|---|
| <FILL> | <FILL> | <FILL> |

## Setup

```
<FILL: clone + install + bootstrap commands>
```

## Common commands

<FILL: mirror CLAUDE.md → Common commands (test / lint / typecheck / run).>

## Services & environment variables

<FILL: per service/component — what it is and the env vars it reads (name, owner,
default). Add a row as each feature introduces new config.>

- **<service>** — <what it is>. Env: `<VAR>` (default `<x>`), …
