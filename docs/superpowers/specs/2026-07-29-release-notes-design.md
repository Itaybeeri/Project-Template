# Design — Automatic release notes

**Date:** 2026-07-29 · **Branch:** `feat/release-notes` · **Status:** Approved (design), pending spec review

## Problem

Every merge changes the project, and today nothing records *what* changed in human terms. Git
history holds commit subjects; `FEATURE-INDEX.md`, `ADR-INDEX.md`, and `IDEAS.md` hold intent —
but there is no per-change artifact that says "this shipped, here is what it does, here are the
docs behind it," and nothing to hand a human who wants to browse that.

## Goal

Every merge produces a release note automatically — no approval asked — that:

- leads with readable bullets describing what changed and why,
- correlates to the feature / idea / ADR it came from and links every related MD file,
- is rendered to HTML in a folder of its own, with an HTML index linking to each note.

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | The agent writes an MD note; a zero-dep Node generator renders HTML | Bullets carry intent, not commit subjects. Matches the existing docs-are-truth + generator pattern (`ProjectCommandCenter/`). |
| D2 | Bullets lead the note, directly under the title | The note is read by humans first; metadata is a single line above the bullets. |
| D3 | Written during phase 5 on the feature branch, **before** the PR is opened | The note is part of the reviewed diff and merges atomically. No post-merge commits to the default branch. |
| D4 | Generated HTML is committed | The folder is openable on any machine and browsable on GitHub with nothing to run; history shows each release as it looked. |
| D5 | Notes get their own counter (`0001`, `0002`, …), never reused | A fourth counter alongside features, ADRs, and ideas — consistent with existing numbering discipline. No versioning scheme to maintain for a repo with no published artifact. |
| D6 | Links resolve to GitHub blob URLs when `origin` is a GitHub remote; relative paths otherwise | `file://` links to `.md` download rather than render in Chrome. Falls back correctly for an un-repointed template or a repo with no remote. |
| D7 | The Project Command Center gains a **Releases** panel | The command center stays the one place showing the whole project; the standalone HTML remains the shareable artifact. |
| D8 | The template dogfoods: real notes for this repo's own merges live in `docs/releases/` | The feature is visible working immediately. First-session init tells a derived project to clear them and regenerate. |
| D9 | This feature's own planning docs stay out of the shipped tree | The template has never recorded its own features (`FEATURE-INDEX.md` is still a `<FILL>` row). This design doc lives in `docs/superpowers/specs/`; no feature folder, no index row. |

## Architecture

```
docs/releases/NNNN-slug.md         source of truth — agent-written, bullets first
        │
        │  ReleaseNotes/parse.mjs  (the only parser; two consumers)
        ├──────────────────────────────────────┐
        ▼                                      ▼
ReleaseNotes/generate.mjs              ProjectCommandCenter/collect.mjs
        │                                      │
        ▼                                      ▼
ReleaseNotes/index.html                Command Center "Releases" panel
ReleaseNotes/NNNN-slug.html
   └── links → docs/features/<NNNN>/spec.md, docs/adr/ADR-NNNN-*.md, docs/IDEAS.md#NNN
```

### Units and boundaries

| Unit | Does | Depends on |
|------|------|-----------|
| `ReleaseNotes/parse.mjs` | Reads `docs/releases/*.md` → array of note objects. Resolves `Refs` to real file paths; reports unresolvable refs. | `fs`, repo layout |
| `ReleaseNotes/generate.mjs` | Renders `index.html` + one page per note. `--check` validates without writing. | `parse.mjs`, `git remote` |
| `ProjectCommandCenter/collect.mjs` | Adds a `releases` key to the project-state object via a guarded dynamic import of `parse.mjs`. | `parse.mjs` (optional) |
| `ProjectCommandCenter/index.html` | Renders the Releases panel + drawer. | state object |

`collect.mjs` imports `parse.mjs` inside `try/catch`; if `ReleaseNotes/` is absent the state gets
an empty `releases` array. This preserves the Command Center's copy-the-folder portability and its
degrade-gracefully behavior.

## The note format

```markdown
# 0003 — Ideas & thoughts notepad

**Released:** 2026-07-29 · **PR:** #4 · **Type:** Feature · **Refs:** Feature 0002, ADR-0001

## What changed

- Ideas now have a home: `docs/IDEAS.md` — an index table plus one memo per idea.
- Conversation drift is triaged — the agent asks "feature or idea?" instead of guessing.
- The Command Center gained an Ideas panel with a click-through memo drawer.

## Related docs

- `docs/IDEAS.md` — the notepad itself
- (refs resolve automatically; extra links may be listed by hand)

## Files touched

- `CLAUDE.md`, `docs/IDEAS.md`, `ProjectCommandCenter/collect.mjs`, …
```

**Fields.** `Released` (ISO date) and `Type` are required. `Type` ∈ `Feature | Fix | Docs | Chore |
ADR | Idea`. `PR` and `Refs` are optional (a note may precede its PR number, and a chore may
reference nothing).

**Ref grammar** — comma-separated, each one of:

| Ref | Resolves to |
|-----|-------------|
| `Feature NNNN` | every `*.md` in `docs/features/NNNN-*/` |
| `ADR-NNNN` | `docs/adr/ADR-NNNN-*.md` |
| `Idea NNN` | `docs/IDEAS.md` anchored at the `### NNN —` memo |

A ref that resolves to nothing is a **hard error**: `generate.mjs --check` prints the offending
note and ref and exits non-zero. Notes cannot rot into dead links.

## The HTML

- **`index.html`** — newest note first; each row shows number, title, date, type, PR, and the
  first bullet, and links to that note's page. This is the release-note index, in HTML.
- **`NNNN-slug.html`** — the note rendered: bullets, related-docs links, files touched, and a
  back-link to the index.
- Self-contained: inline CSS/JS, no CDN, no build, Node ≥ 18. Visual language matches
  `ProjectCommandCenter/index.html`.
- Minimal Markdown support in the renderer: headings, lists, inline code, bold, links. Anything
  fancier is out of scope — notes are short.

## What makes it automatic

Phase 5 (Review/Merge) gains a **mandatory, no-approval-asked** step, ordered after the green gate
and the default-branch sync and **before the PR is opened**:

> Write `docs/releases/NNNN-slug.md`, run `node ReleaseNotes/generate.mjs`, commit both onto the
> feature branch.

Wiring, all in the same change:

- `docs/workflow/feature-lifecycle.md` — the new phase-5 step, in order.
- `docs/features/FEATURE-RULES.md` — merge-gate line: **no release note → no PR**.
- `CLAUDE.md` — a "Where things live" entry; the fourth counter under Numbering; a workflow
  invariant; `node ReleaseNotes/generate.mjs` allow-listed under Permission prompts so it never
  prompts; and a first-session init line telling a derived project to clear `docs/releases/*.md`
  and regenerate.
- `README.md` and `ProjectCommandCenter/README.md` — mention the folder and the panel.

Every merged PR gets exactly one note, including trivial fixes and docs-only changes (a two-bullet
note), distinguished by `Type`.

## Acceptance criteria

1. `docs/releases/` holds MD notes; `ReleaseNotes/` holds committed `index.html` + one page per note.
2. A note's HTML page leads with its bullets and links to every MD its `Refs` resolve to.
3. `index.html` lists every note, newest first, each linking to its own page.
4. Links are GitHub blob URLs when `origin` is a GitHub remote, relative paths otherwise.
5. `node ReleaseNotes/generate.mjs --check` exits non-zero on an unresolvable ref, naming note and ref.
6. `node ReleaseNotes/generate.mjs` is idempotent — running it twice with no doc changes leaves the
   HTML byte-identical (no timestamps in output).
7. The Command Center shows a Releases panel with a memo drawer, and still renders with
   `ReleaseNotes/` deleted.
8. `CLAUDE.md`, `feature-lifecycle.md`, and `FEATURE-RULES.md` state the automatic phase-5 step and
   the merge gate.
9. The repo contains at least one real note (dogfooding) and its rendered HTML.

## Verification

No test runner exists in this repo, so verification is observed behavior, not a suite:

- Run the generator; open `ReleaseNotes/index.html` in a browser; click through to a note and out
  to a linked MD — confirm each lands on real content.
- Break a ref deliberately; confirm `--check` exits non-zero with a useful message; restore it.
- Run the generator twice; confirm `git status` is clean the second time (AC6).
- Delete `ReleaseNotes/` in a scratch copy; confirm the Command Center still serves (AC7).

## Out of scope

- CI enforcement of the merge gate (belongs in `docs/CI-ROADMAP.md` — surfaced, not built).
- Semantic versioning, changelog aggregation, or published-artifact release management.
- Notes for commits that never become a PR.
- A git hook: merges happen on GitHub, so a local `post-merge` hook would fire unreliably.

## Risks

| Risk | Mitigation |
|------|-----------|
| Committed HTML creates diff noise | Generated output is deterministic (AC6), so diffs show only real changes. |
| The agent forgets the step | It is a merge-gate item in `FEATURE-RULES.md` — the same gate that already blocks the PR. |
| A derived project inherits this repo's notes | First-session init clears `docs/releases/*.md` and regenerates. |
| Ref grammar drifts from real doc layout | `--check` fails loudly on the first broken ref. |
