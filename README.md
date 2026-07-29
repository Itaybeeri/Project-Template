# Project Template — spec-driven dev with ADRs, a feature lifecycle, and AI gates

A copy-paste starting structure for a new project. It encodes a disciplined way of
building software: **the repo is the memory.** Decisions live in ADRs, features go through
a five-phase lifecycle with two AI review gates, and the docs never lag reality. Drop this
into a fresh repo, fill in the `<FILL: …>` markers, and you don't reinvent the process each
time.

## What you get

```
CLAUDE.md                         # the router the agent reads every session (generalized)
docs/
├── architecture.md               # Target architecture (enduring) + Current state (live)
├── GLOSSARY.md                   # canonical terms — one word per concept
├── ONBOARDING.md                 # fresh-machine setup
├── CI-ROADMAP.md                 # deferred CI work + when to revisit it (read on every PR)
├── PORTAL-PATTERN.md             # optional: a "browse all the docs" portal pattern
├── adr/                          # Architecture Decision Records — global, append-only
│   ├── ADR-INDEX.md
│   ├── ADR-RULES.md              # immutability, supersession, impact analysis
│   └── ADR-TEMPLATE.md
├── features/                     # one folder per feature
│   ├── FEATURE-INDEX.md          # the central list + reserved numbers
│   └── FEATURE-RULES.md          # design rules + completion rules + the merge gate
├── releases/                     # one release note per merge — bullets first
│   ├── TEMPLATE.md               # copy this when a feature is about to open its PR
│   └── NNNN-slug.md              # the notes themselves (own number counter)
└── workflow/
    ├── feature-lifecycle.md      # the five phases + the two AI gates
    ├── brainstorm-TEMPLATE.md
    └── feature-spec-TEMPLATE.md
ProjectCommandCenter/             # read-only command center — parses docs/ + git, no build/deps
├── collect.mjs                   # the parser: repo → one project-state object (source of truth)
├── serve.mjs                     # zero-dep dev server; re-parses live on every request
├── generate.mjs                  # writes a shareable static snapshot.html (+ data.json)
├── index.html                    # the UI (self-contained: inline CSS/JS, no CDN)
└── README.md                     # how it works + how to copy it
ReleaseNotes/                     # rendered release notes — committed HTML, no build/deps
├── parse.mjs                     # the parser: docs/releases/*.md → notes (shared w/ command center)
├── generate.mjs                  # validates, then writes index.html + one page per note
└── README.md                     # how to write a note + how generation works
.claude/
├── SKILLS.md                     # manifest: what's shipped here vs. plugin skills to install
├── skills/
│   ├── architect-review/SKILL.md # AI gate #1 (after Brainstorm, before Plan)
│   └── plan-review/SKILL.md      # AI gate #2 (after Plan, before Implement)
├── agents/
│   ├── implementer.md            # Implement phase, when the main session orchestrates
│   └── tester.md                 # Test phase — AC-by-AC verification in a fresh context
└── commands/
    └── continue.md               # /continue — resume a feature at its current phase
.gitignore                        # ignores the command center's generated data.json / snapshot.html
```

## The model in one paragraph

Every feature flows **Brainstorm → Plan → Implement → Test → Review/Merge**. Two AI gates
guard the early phases — **architect-review** (is the design sound against the ADRs and
rules?) and **plan-review** (is the spec correct, testable, complete?) — and neither
replaces the human's final yes. Architecturally significant decisions are recorded as
**ADRs** (immutable, append-only, superseded never edited). `docs/architecture.md` always
reflects current reality. One feature = one branch = one PR; nothing merges until every
acceptance criterion is verified and the gate is green.

## The Project Command Center (a live dashboard)

`ProjectCommandCenter/` ships a self-contained, **read-only** command center. It parses
`CLAUDE.md`, `docs/` (feature index, each feature folder, ADR index, CI-roadmap) and git on
**every** request and renders the whole project on one page: the delivery pipeline (every
feature by lifecycle phase), a per-feature detail drawer (phase stepper, plan-review rounds,
acceptance criteria, related ADRs, branch/PR state), the ADRs, the CI-roadmap, and recent git
activity.

```bash
node ProjectCommandCenter/serve.mjs      # → http://localhost:4317  (live, 60s auto-refresh)
node ProjectCommandCenter/generate.mjs   # → ProjectCommandCenter/snapshot.html (shareable, offline)
```

No build step and no dependencies (Node ≥ 18). It's **generic** — it degrades gracefully
while the repo is still `<FILL:>` placeholders, then personalizes itself the moment the
first-session interview fills in the real project. Details in `ProjectCommandCenter/README.md`.

## How to use it

1. **Copy** this tree into your new repo's root (merge `.claude/` and `docs/` in).
2. **Fill the markers.** Search the tree for `<FILL:` and `<PROJECT_NAME>` and replace each.
   Start with `CLAUDE.md` (the router) — it points at everything else.
3. **Keep the process files mostly as-is.** `ADR-RULES.md`, `FEATURE-RULES.md`,
   `feature-lifecycle.md`, the templates, and the two gate skills are product-agnostic;
   adapt only the parts flagged for your stack (e.g. the "Design rules" that assume a
   particular architecture).
4. **Seed your first ADR-0001** for your foundational architecture decision, and your first
   feature folder under `docs/features/0001-<name>/`.
5. **Adopt the commands/skills/agents.** See **`.claude/SKILLS.md`** for the full map of
   what ships here (the `architect-review` / `plan-review` skills, the `tester` /
   `implementer` agents, the `/continue` command) versus the **superpowers** plugin skills
   the lifecycle leans on (`brainstorming` / `writing-plans` / `executing-plans` /
   `test-driven-development` / `requesting-code-review` / …). Install the superpowers plugin
   rather than copying it; if you don't use it, replace those references in
   `feature-lifecycle.md` and `continue.md` with your own equivalents.

## First session (turnkey kickoff)

After copying the tree in and **installing the `superpowers` plugin**, open the agent in the
repo and paste this:

> Read `README.md`, `CLAUDE.md`, and `.claude/SKILLS.md`. This is a project template with
> `<FILL: …>` placeholders. Interview me one question at a time to fill in every placeholder
> across `CLAUDE.md` and `docs/` for **this** project (name, what it does, the core model,
> stack, build/test/lint commands, guardrails, first ADR, first feature). Don't write code —
> just fill the template and confirm the structure with me. When the blanks are filled, we'll
> start feature 0001.

The agent first repoints git away from the `project-template` remote to **your** new repo (a
copy must never push back into the template), then interviews you one question at a time, checks
whether the `superpowers` plugin skills are installed (asking before it installs anything), and
— once the placeholders are filled — offers to open the now-personalized command center
(`node ProjectCommandCenter/serve.mjs`).

(`CLAUDE.md` auto-loads each session and `.claude/` skills/agents/commands are auto-discovered,
so you don't need to re-point the agent at them after this.)

## Fill-in checklist (the `<FILL: …>` markers)

- `CLAUDE.md` — project name, one-line description, the core mental model / diagram,
  the build/test/lint commands, the stack, security & deploy guardrails, the
  allow-list philosophy for permission prompts.
- `docs/architecture.md` — Target architecture (components, stack, deployment) and the
  Current state.
- `docs/GLOSSARY.md` — your domain terms.
- `docs/ONBOARDING.md` — prerequisites, setup steps, env vars.
- `docs/CI-ROADMAP.md` — your deferred-CI items + triggers (or delete if you start with
  full CI).
- `docs/features/FEATURE-RULES.md` — adapt the "Design rules" to your architecture; the
  "Completion rules" and the merge gate are reusable as-is.
- `.claude/skills/*/SKILL.md` — the gate descriptions reference "the project"; no edits
  needed unless you rename things.

## What's deliberately NOT here

- **A docs portal** — the shipped `ProjectCommandCenter/` is a read-only *command center*
  (pipeline, features, ADRs, git), not a full markdown-rendering portal for browsing every
  doc. Building that is framework-specific; `docs/PORTAL-PATTERN.md` describes the pattern (a
  thin backend-for-frontend that lists `docs/` and renders markdown) so you can add it as a
  feature when you want it.
- **A language/build toolchain** — pick yours; wire the commands into `CLAUDE.md` and
  `ONBOARDING.md`. (The command center itself needs only Node ≥ 18, no install.)
- **CI workflow files** — add `.github/workflows/` to match `CI-ROADMAP.md` scope A.
