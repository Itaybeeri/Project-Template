# CLAUDE.md — <PROJECT_NAME>

> Router file. Keep it small and stable. The agent reads this at the start of every
> session; detailed content lives in the files it points to, loaded on demand.

## First session — fill the placeholders BEFORE any feature work

If this file or any `docs/` file still contains `<FILL: …>` or `<PROJECT_NAME>` markers, the
project has **not** been initialized yet. On the first session, the agent MUST **interview the
human one question at a time and fill every placeholder** across `CLAUDE.md` and `docs/` (name,
what it does, the core mental model, stack, build/test/lint/run commands, guardrails) before
starting feature 0001 — do not leave `<FILL>` markers dangling and do not write code until the
router reflects the real project. Placeholders that are genuinely not yet knowable (e.g. real
run commands before the code is scaffolded) get an honest "populated in <phase>" note, not a
bare `<FILL>`.

As part of this first-session interview, the agent MUST also check whether the plugin skills
the lifecycle leans on are installed (see `.claude/SKILLS.md`). If any are missing, **ask the
human whether to install them** (the `superpowers` plugin) before proceeding — don't install
silently and don't assume they're absent. If they're already installed, say so and move on.

**Once the placeholders are filled (the project is personalized), the agent MUST tell the human
that the project dashboard now reflects their real project and offer to open it** — run
`node dashboard/serve.mjs` and point them at http://localhost:4317. The dashboard is a live,
read-only command center that parses `CLAUDE.md` + `docs/` + git on every request, so it goes
from generic template placeholders to the real project the moment the interview is done (see
`dashboard/README.md`). Don't leave it un-offered — it's the fastest way for the human to see
their initialized project at a glance.

## Project

<FILL: one paragraph — what this project is, who it's for, and the deliverable.>

**Status:** <FILL: e.g. "In active development — building from scratch.">
See `docs/adr/` for accepted architectural decisions.

## The core mental model (keep this in mind)

<FILL: the one diagram / few sentences that capture how the system works end to end —
the thing you'd draw on a whiteboard. Keep the detail in docs/architecture.md.>

```
<FILL: optional ASCII diagram of the core loop / data flow>
```

Full detail (components, stack, deployment) lives in **`docs/architecture.md` → "Target
architecture"** (read when you need it).

## Common commands

<FILL: the canonical build/test/lint/typecheck/run commands. Examples:>
- `<FILL: test command>` — unit + integration tests.
- `<FILL: lint command>` · `<FILL: typecheck command>`.
- `<FILL: local dev / run command>`.
- Full fresh-machine setup: `docs/ONBOARDING.md`.

## Where things live (read on demand)

- **Architecture:** `docs/architecture.md` — *Target architecture* (enduring intent) +
  *Current state* (what's built today).
- **Glossary:** `docs/GLOSSARY.md` — canonical terms. Use these words exactly; update it
  when a term changes.
- **Architecture Decision Records (ADRs):** `docs/adr/` — GLOBAL, append-only. Read
  `docs/adr/ADR-INDEX.md` first, then the relevant ADR before changing a subsystem it
  covers.
- **Per-feature docs:** `docs/features/<NNNN-name>/` — `brainstorm.md` + `spec.md`
  (+ `plan-review.md`).
- **Feature index:** `docs/features/FEATURE-INDEX.md` — central list of features +
  **reserved** numbers. Check it before picking a feature number; keep it current.
- **Feature rules:** when working on any feature, **read `docs/features/FEATURE-RULES.md`**
  (mandatory design + completion rules, the AI gates, and the merge gate).
- **Feature workflow:** `docs/workflow/feature-lifecycle.md` — the five phases + mechanics.
- **CI-Roadmap (deferred CI work):** `docs/CI-ROADMAP.md` — **read on every PR**; when a
  deferred item's trigger now holds, surface it for the human (don't act on it).
- **Resuming work:** `/continue [NNNN]` resumes a feature at its current phase
  (branch/worktree-aware; asks which when several are in progress).
- **Project dashboard:** `dashboard/` — a self-contained, read-only command center. Run
  `node dashboard/serve.mjs` (→ http://localhost:4317); it re-reads `CLAUDE.md` + `docs/` + git
  on every request, so it always reflects the current project state. No build, no deps
  (Node ≥ 18). Details in `dashboard/README.md`.

## Numbering

Feature and ADR numbers are SEPARATE counters. Before picking a feature number, check
`docs/features/FEATURE-INDEX.md` (lists used + **reserved** numbers).

## Documentation discipline

1. **`docs/architecture.md` has two parts:** *Current state* is overwritten freely as we
   build (never lag reality); *Target architecture* is the enduring intent and changes
   only by an explicit decision / ADR.
2. **ADRs are immutable and the log is append-only.** When writing or superseding any ADR,
   **read `docs/adr/ADR-RULES.md` first** — it holds the full, mandatory rules.
3. **Keep `docs/ONBOARDING.md` current.** Whenever a change adds or changes something a
   fresh machine needs — a new tool/dependency, a changed setup or command, new env vars —
   update `docs/ONBOARDING.md` in the same change.

## Workflow rules

Every feature follows five phases — **Brainstorm → Plan → Implement → Test → Review/Merge**.
The mechanics live in **`docs/workflow/feature-lifecycle.md`**; the mandatory design +
completion rules (the two AI gates and the **NON-NEGOTIABLE merge gate**) live in
**`docs/features/FEATURE-RULES.md`**. **Read both when working on a feature.**

Router-level invariants (full rules in those two files):
- **Match ceremony to weight** — trivial fix vs feature (`spec.md`) vs architecturally
  significant (`spec.md` + ADR). **No code before the plan is approved:** `plan-review`
  PASS **then** a human yes.
- **One feature = one branch (`feat/<NNNN>-...`) → one PR into `<FILL: default branch,
  e.g. main>`.** Never implement on the default branch or in the primary checkout — **always
  build in a dedicated git worktree**, one worktree per feature branch.
- **Commit after every agreed decision or completed step — never leave agreed work
  uncommitted, so nothing is forgotten.** This applies to docs/brainstorm/spec artifacts,
  not just code. Commit on the feature's `feat/<NNNN>-...` branch (branch first if on the
  default branch); don't commit feature work directly on the default branch.
- **Commit + push the branch after every green step** (don't batch locally).
- **Nothing merges without a PR and a fully green gate where every acceptance criterion is
  COVERED; the Test phase + a default-branch sync happen BEFORE the PR is opened.** The
  agent never merges, force-pushes the default branch, or changes branch protection / CI
  unprompted.

## Build / deploy guardrails (do NOT do without asking me first)

<FILL: the irreversible / outward-facing actions that always require approval. Examples:>
- Do **not** deploy or touch live infrastructure / cloud resources.
- Do **not** merge a PR, change branch protection, or alter CI config unprompted.
- Reading config is fine; mutating live systems is not.

## Permission prompts

**Allow what is safe and undoable; keep prompting for what is destructive, outward-facing,
or irreversible.** Reduce prompts on frequent safe commands (read-only git, the
test/lint/typecheck tools, feature-branch push, read-only inspection) by allow-listing
them. **Always keep prompting** for: PR merges, pushing to the default branch, force-push,
branch/worktree deletes, branch-protection changes, deploys, destructive deletes, and
anything touching auth / secrets / production data / customer data.

**Run commands one at a time so the allow-list can match them.** Avoid chained/wrapped
commands (`cd … &&`, pipes, redirects, `$(…)` substitution) on allow-listed commands —
they can't be statically analyzed and will prompt anyway.

## Security guardrails

<FILL: project-specific security rules. Examples / common ones:>
- Never remove, weaken, or bypass authorization / access-control checks. If a task seems
  to require it, STOP and confirm.
- Do **not** hardcode or commit secrets, credentials, or sensitive data. Reference them
  from secure config/stores. Never log secrets or place them in URLs/query strings.
- When a change touches authorization, data egress, or production behavior, propose it and
  wait for approval (use plan mode).
