# Architecture

> Two parts, different lifecycles:
> - **Target architecture** — the enduring *intended* design. Changes only by an explicit
>   decision / ADR, not casually.
> - **Current state** — what is *actually built today*; overwritten freely as we build,
>   and must never lag reality.
>
> Neither explains *why* — that's `docs/adr/`.

_Current-state last updated: YYYY-MM-DD · Reflects up to ADR-NNNN._

---

## Target architecture (where we're headed)

### The core model

<FILL: the enduring mental model — the core loop / data flow / component interaction.
A diagram + a few sentences.>

### Components

| Component | Responsibility |
|---|---|
| <FILL> | <FILL> |

### Stack

<FILL: languages, frameworks, datastores, infra. What's chosen and what's still open.>

### Deployment

<FILL: where it runs, the promotion path (local → staging → prod, or your ladder),
and any portability constraints.>

---

## Current state (what's built today)

<FILL: what actually exists right now. Start with "Nothing built yet." and overwrite this
section as features land — it must never lag reality.>

### Code layout

<FILL: the directory/module layout as it exists.>

### Implemented components

<FILL: bullet per built component, with the feature number that introduced it.>

### CI/CD

<FILL: what CI runs today (see docs/CI-ROADMAP.md for deferred scope).>
