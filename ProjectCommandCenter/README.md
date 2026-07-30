# Project Command Center

A self-contained **command center** for the project: it reads the repo's own docs
(`CLAUDE.md`, `docs/features/FEATURE-INDEX.md`, each feature folder, `docs/adr/ADR-INDEX.md`,
`docs/CI-ROADMAP.md`, `docs/IDEAS.md`) plus git, and renders the whole picture on one page —

- **Delivery pipeline** — every feature placed by lifecycle phase (Queued → Brainstorm →
  Plan → Implement → Test → Review/Merge → Done), so you see at a glance what's being built
  now, what's queued, and what's done.
- **Feature detail drawer** (click any card) — summary, phase stepper, plan-review rounds and
  verdicts, acceptance criteria, related ADRs, branch/PR state.
- **Architecture decisions** (ADRs) and their status.
- **CI-roadmap** — deferred work and the trigger that revives each item.
- **Ideas & thoughts** — the `docs/IDEAS.md` notepad, one card per idea with its status; click
  an idea to read its full memo in a drawer.
- **Release notes** — the `docs/releases/` notes, newest first; click one to read its bullets,
  related docs, and files touched in a drawer. Rendered HTML lives in `ReleaseNotes/`.
- **Recent git activity** and contributors.

It is **generic**: it parses whatever a project has and degrades gracefully when the repo is
still `<FILL:>` template placeholders — which is why it lives in the template and is copied
into every new project.

## Run it (live)

```bash
node ProjectCommandCenter/serve.mjs          # → http://localhost:4317
PORT=8080 node ProjectCommandCenter/serve.mjs
```

The server re-reads `docs/` + git on **every** request, so the page's **60-second
auto-refresh** and its **Refresh** button always reflect the current state on disk — edit a
spec, move a `FEATURE-INDEX` row, or commit, and the next refresh shows it. No build step, no
dependencies (Node ≥ 18 only).

## Static snapshot (offline / shareable)

```bash
node ProjectCommandCenter/generate.mjs       # writes ProjectCommandCenter/snapshot.html (+ data.json)
```

`snapshot.html` is a single self-contained file with the state inlined — open it directly or
share it. It shows the state as of generation time (no auto-refresh). Both generated files are
git-ignored.

## Files

| File | Role |
|------|------|
| `collect.mjs` | The parser — reads the repo, returns one project-state object. The single source of truth; both entry points use it. |
| `serve.mjs` | Zero-dep dev server; `GET /api/state` re-parses live. |
| `generate.mjs` | Writes `data.json` + a self-contained `snapshot.html`. |
| `index.html` | The command center UI (self-contained: inline CSS/JS, no CDN). |

## Copying into the template / a new project

Copy the whole `ProjectCommandCenter/` folder. It assumes the conventional layout (`CLAUDE.md`
at the repo root; `docs/features/FEATURE-INDEX.md`, `docs/adr/ADR-INDEX.md`,
`docs/CI-ROADMAP.md`, `docs/IDEAS.md`, and `docs/features/<NNNN-name>/{brainstorm,spec,plan-review}.md`).
Nothing is hard-coded to this project — change the docs and the command center follows.
