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
| D10 | The generator validates on **every** run, not only under `--check` | The automatic phase-5 step runs the plain generator; validating only under a flag would let it write and commit dead links. `--check` becomes validate-only (no writes). |
| D11 | Duplicate note numbers are a hard error | Parallel features in worktrees can each claim the same next number; nothing else would catch the collision after both merge. |
| D12 | The Command Center distinguishes "no notes" from "parser unavailable" | A guarded import that renders an identical empty panel in both cases is silent degradation (Design rule 7). |
| D13 | Note content is HTML-escaped by default | The renderer writes committed HTML that is opened in a browser. Source is repo-authored, so risk is low, but escaping costs nothing. |

### Human overrides of architect-review findings

The architect review (2026-07-29) returned **FAIL** with six items. Four are resolved above
(D10–D13) plus the glossary half of Rule 6 (below). Two were **overruled by the human**, on the
record:

- **Rule 1 — no ADR.** The review held that changing the merge gate, adding a fourth counter, and
  committing generated artifacts (reversing the `.gitignore` convention) is architecturally
  significant and warrants an ADR. **Decision: spec only, no ADR.** The reasoning lives here in
  the decision table instead.
- **Rule 6 — plain `0001` numbering.** The review proposed an `RN-0001` prefix so a bare number is
  unambiguous across the feature / ADR / idea / note counters. **Decision: keep plain `0001`,**
  matching feature-folder style.

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
| `ReleaseNotes/parse.mjs` | Reads `docs/releases/*.md` → array of note objects. Resolves `Refs` to real file paths; returns unresolvable refs and duplicate numbers as structured problems. | `fs`, repo layout |
| `ReleaseNotes/generate.mjs` | Validates, then renders `index.html` + one page per note. Validation runs on **every** invocation; `--check` validates without writing. Any problem → message naming note + cause, exit 1, nothing written. | `parse.mjs`, `git remote` |
| `ProjectCommandCenter/collect.mjs` | Adds a `releases` key to the project-state object via a guarded dynamic import of `parse.mjs`. | `parse.mjs` (optional) |
| `ProjectCommandCenter/index.html` | Renders the Releases panel + drawer. | state object |

`collect.mjs` imports `parse.mjs` inside `try/catch`, so the Command Center keeps its
copy-the-folder portability. The state distinguishes the two empty cases — `releases: []` with
`releasesStatus: "ok"` (no notes yet) versus `releasesStatus: "unavailable"` plus the error text
(parser missing or throwing). The panel renders them differently: an ordinary empty state versus a
visible warning. An empty panel never means "something is broken."

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

**Hard errors** (every run, not just `--check`; the generator writes nothing and exits 1):

| Error | Message names |
|-------|---------------|
| A ref resolves to no file | the note and the offending ref |
| Two notes claim the same number | both filenames |
| A required field (`Released`, `Type`) is missing or malformed | the note and the field |

Notes therefore cannot rot into dead links, and two parallel feature branches cannot both merge a
`0004`. The phase-5 step picks a note number **after** the default-branch sync, which closes the
common case; the duplicate check closes the race that remains.

## The HTML

- **`index.html`** — newest note first; each row shows number, title, date, type, PR, and the
  first bullet, and links to that note's page. This is the release-note index, in HTML.
- **`NNNN-slug.html`** — the note rendered: bullets, related-docs links, files touched, and a
  back-link to the index.
- Self-contained: inline CSS/JS, no CDN, no build, Node ≥ 18. Visual language matches
  `ProjectCommandCenter/index.html`.
- Minimal Markdown support in the renderer: headings, lists, inline code, bold, links. Anything
  fancier is out of scope — notes are short.
- **Everything is HTML-escaped first**, then the whitelisted Markdown subset is applied. Raw HTML
  in a note is rendered as text, never as markup — the output is committed and opened in a browser.

## What makes it automatic

Phase 5 (Review/Merge) gains a **mandatory, no-approval-asked** step, ordered after the green gate
and the default-branch sync and **before the PR is opened**:

> Take the next free note number (read **after** the sync, so a note that merged meanwhile is
> seen), write `docs/releases/NNNN-slug.md`, run `node ReleaseNotes/generate.mjs` — which
> validates and fails the step on any bad ref or duplicate number — and commit both onto the
> feature branch.

Wiring, all in the same change:

- `docs/workflow/feature-lifecycle.md` — the new phase-5 step, in order.
- `docs/GLOSSARY.md` — **release note** defined as the canonical term: the MD memo in
  `docs/releases/` is the release note; `ReleaseNotes/` is its rendered output. One concept, one
  word (Design rule 6).
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
5. An unresolvable ref, a duplicate note number, or a missing required field makes **both**
   `generate.mjs` and `generate.mjs --check` exit non-zero with a message naming the note and the
   cause — and a failing plain run writes no HTML.
6. `node ReleaseNotes/generate.mjs` is idempotent — running it twice with no doc changes leaves the
   HTML byte-identical (no timestamps in output).
7. The Command Center shows a Releases panel with a memo drawer; with `ReleaseNotes/` deleted it
   still renders, and the panel shows a visible "parser unavailable" warning — distinct from the
   ordinary "no releases yet" empty state.
8. `CLAUDE.md`, `feature-lifecycle.md`, and `FEATURE-RULES.md` state the automatic phase-5 step and
   the merge gate; `docs/GLOSSARY.md` defines **release note**.
9. The repo contains at least one real note (dogfooding) and its rendered HTML.
10. A note whose body contains raw HTML (e.g. `<script>`) renders as visible text in the output,
    not as markup.

## Verification

No test runner exists in this repo, so verification is observed behavior, not a suite:

- Run the generator; open `ReleaseNotes/index.html` in a browser; click through to a note and out
  to a linked MD — confirm each lands on real content.
- Break a ref deliberately; confirm **both** the plain run and `--check` exit non-zero with a
  useful message and that the plain run left the HTML untouched; restore it (AC5).
- Copy a note to a second file with the same number; confirm the duplicate-number error names both
  files; delete it (AC5).
- Run the generator twice; confirm `git status` is clean the second time (AC6).
- Delete `ReleaseNotes/` in a scratch copy; confirm the Command Center still serves and the panel
  shows the "parser unavailable" warning, then confirm an empty `docs/releases/` shows the ordinary
  empty state instead (AC7).
- Put `<script>alert(1)</script>` in a scratch note; confirm it renders as visible text (AC10).

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
