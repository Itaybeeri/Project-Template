# CLAUDE.md — <PROJECT_NAME>

> Router file. Keep it small and stable. The agent reads this at the start of every
> session; detailed content lives in the files it points to, loaded on demand.

## First session — fill the placeholders BEFORE any feature work

**Step 0 — repoint git to THIS project's repo (do this first).** This template ships wired to
the `project-template` GitHub remote. A copy made to start a real project must **never** keep
that remote — otherwise the new project would push into the template. So on the first session,
before anything else, run `git remote -v`; if `origin` still points at the `project-template`
repository, **STOP and ask the human** whether this checkout *is* the canonical `project-template`
(the one repo that legitimately tracks it) or a new project copied from it. If it's a new
project, get the new repo's URL and repoint it (`git remote set-url origin <url>`), or remove
`origin` (`git remote remove origin`) until they create the repo. Only the canonical template
repo keeps the `project-template` remote; every derived project repoints away from it here.

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

**Clear the template's own release notes on this first session too:** delete `docs/releases/0*.md`
(they document how the *template* was built, not this project) and run
`node ReleaseNotes/generate.mjs` so `ReleaseNotes/` reflects the new project. The first real note
lands with this project's first merge.

**Once the placeholders are filled (the project is personalized), the agent MUST tell the human
that the Project Command Center now reflects their real project and offer to open it** — run
`node ProjectCommandCenter/serve.mjs` and point them at http://localhost:4317. It's a live,
read-only command center that parses `CLAUDE.md` + `docs/` + git on every request, so it goes
from generic template placeholders to the real project the moment the interview is done (see
`ProjectCommandCenter/README.md`). Don't leave it un-offered — it's the fastest way for the
human to see their initialized project at a glance.

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
- **Lessons (compounding memory):** `docs/LESSONS.md` — append-only log of project-specific
  gotchas the agent must not repeat. **Read it at the start of feature work**, and add an
  entry (in the same commit as the fix) whenever a correction reveals a repeatable mistake.
- **Ideas & thoughts (notepad):** `docs/IDEAS.md` — a running list of ideas/thoughts worth
  talking about that aren't (yet) features: an index table + one memo per idea, its own
  number counter. Capture here the moment a thought lands (see the triage rule under Workflow
  rules); an idea **graduates** into a feature when it's ready to build. Surfaced live in the
  Project Command Center's **Ideas** panel.
- **Release notes:** `docs/releases/` — one MD note per merge (readable bullets first),
  rendered to committed HTML in `ReleaseNotes/` (an index + one page per note, linking back
  to the feature / ADR / idea docs each note references). Written **automatically in phase 5,
  before the PR** — never ask permission for it. See `ReleaseNotes/README.md`.
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
- **Project Command Center:** `ProjectCommandCenter/` — a self-contained, read-only command
  center. Run `node ProjectCommandCenter/serve.mjs` (→ http://localhost:4317); it re-reads
  `CLAUDE.md` + `docs/` + git on every request, so it always reflects the current project
  state. No build, no deps (Node ≥ 18). Details in `ProjectCommandCenter/README.md`.

## Numbering

Feature, ADR, idea, and release-note numbers are FOUR SEPARATE counters. Before picking a
feature number, check `docs/features/FEATURE-INDEX.md` (lists used + **reserved** numbers);
ideas have their own `001…` counter in `docs/IDEAS.md`; release notes have their own `0001…`
counter in `docs/releases/`. Numbers are never reused (a dropped idea keeps its number with
status `Dropped`).

## Documentation discipline

1. **`docs/architecture.md` has two parts:** *Current state* is overwritten freely as we
   build (never lag reality); *Target architecture* is the enduring intent and changes
   only by an explicit decision / ADR.
2. **ADRs are immutable and the log is append-only.** When writing or superseding any ADR,
   **read `docs/adr/ADR-RULES.md` first** — it holds the full, mandatory rules.
3. **Keep `docs/ONBOARDING.md` current.** Whenever a change adds or changes something a
   fresh machine needs — a new tool/dependency, a changed setup or command, new env vars —
   update `docs/ONBOARDING.md` in the same change.
4. **Compound the lessons.** When a correction (human feedback, a broken build, a review
   finding) reveals a *repeatable* mistake, append a `symptom → cause → rule` entry to
   `docs/LESSONS.md` **in the same commit as the fix** — so the next session, agent, and
   teammate inherit it and never repeat it. Don't defer it; an empty lessons log means
   re-explaining the same thing every session.

## Workflow rules

Every feature follows five phases — **Brainstorm → Plan → Implement → Test → Review/Merge**.
The mechanics live in **`docs/workflow/feature-lifecycle.md`**; the mandatory design +
completion rules (the two AI gates and the **NON-NEGOTIABLE merge gate**) live in
**`docs/features/FEATURE-RULES.md`**. **Read both when working on a feature.**

Router-level invariants (full rules in those two files):
- **Triage tangents — never drop a thought, never silently build one.** When the
  conversation drifts to something not tied to the current work, STOP and ask the human:
  is this a **feature to implement** or an **idea/thought to just record**? A feature enters
  the lifecycle (brainstorm → `FEATURE-INDEX.md`); an idea/thought lands in `docs/IDEAS.md`
  as a row + memo **immediately**, so it survives the session. When an idea is ready to
  build, it graduates into a feature (flip its row to `Graduated`, link the feature #).
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
- **Every PR ships a release note — automatically, without asking.** In phase 5, after the
  default-branch sync and before the PR is opened, write `docs/releases/NNNN-slug.md` and run
  `node ReleaseNotes/generate.mjs`; commit both on the feature branch. **No release note, no
  PR** — this applies to trivial fixes and docs-only changes too.
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
them — including `node ReleaseNotes/generate.mjs`, which runs on every PR and must never
prompt. **Always keep prompting** for: PR merges, pushing to the default branch, force-push,
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
