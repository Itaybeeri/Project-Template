# LESSONS — project-specific gotchas the agent must not repeat

> **Append-only, checked into git, read at the start of feature work.** This is the
> project's *compounding memory*: every time a mistake is caught — a wrong assumption, a
> footgun in the stack, a convention the agent violated — it gets one entry here so it is
> **never repeated**. An empty file forces the same explanations every session; a
> well-kept one means each session starts already knowing how this project works.
>
> This is distinct from the agent's global memory (`~/.claude/**/memory/`, which is
> user-wide) and from `CLAUDE.md` (the small, stable router). Lessons are **project-scoped,
> concrete, and travel with the repo** to every teammate and every clone.

## When to add an entry (the compounding rule)

Add an entry the moment a correction reveals a **repeatable** mistake — not a one-off typo.
Triggers:

- The human corrects the agent on something the agent could have known.
- A build/test/deploy breaks in a way that will recur (a stack footgun, an ordering
  requirement, a flaky command, an environment quirk).
- The agent picks the wrong pattern and is redirected to the project's real convention.
- A review (`architect-review`, `plan-review`, `tester`, code review) surfaces a class of
  defect worth preventing at the source.

**Record it in the same commit as the fix.** Don't defer — the point is that the next
session (or the next agent, or the next teammate) inherits the lesson automatically.

## What NOT to put here

- Facts already captured elsewhere: architecture (`docs/architecture.md`), decisions
  (`docs/adr/`), terms (`docs/GLOSSARY.md`), setup (`docs/ONBOARDING.md`). Link to those
  instead.
- One-off incidents with no repeatable rule.
- Secrets, credentials, or customer data.

## Format

One entry per lesson. Keep each tight: symptom → cause → the rule to follow next time.
Newest at the top. Date entries (`YYYY-MM-DD`). Prune only when a lesson becomes obsolete
(the code/rule that made it true is gone) — and say so in the commit.

```
### <YYYY-MM-DD> — <short title>
- **Symptom:** what went wrong / what was corrected.
- **Cause:** the underlying reason.
- **Rule:** the concrete thing to do (or never do) from now on.
- **Refs:** (optional) commit, feature NNNN, ADR-NNNN, file:line.
```

---

## Lessons

<!--
Example entry — delete this once you record your first real lesson.

### 2026-07-11 — example: run the migration before seeding
- **Symptom:** `npm run seed` failed with "relation does not exist" on a fresh clone.
- **Cause:** the seed script assumes tables exist; migrations weren't run first.
- **Rule:** always `npm run migrate` before `npm run seed`; onboarding order matters.
- **Refs:** docs/ONBOARDING.md, feature 0003.
-->

_No lessons recorded yet._
