# Portal pattern (optional) — "browse the whole project in one place"

A nice-to-have once the project grows: a small web view that renders the repo's own
`docs/` — the feature index, ADRs, specs, brainstorms, architecture, glossary — so the
process is *visible*, not just on disk. This file describes the pattern so you can add it
as a feature when you want it; it is intentionally not built into the template (the UI
framework is your choice).

## Shape

A thin **backend-for-frontend (BFF)** + a small single-page UI, served from one origin:

- **BFF** (any minimal web framework):
  - `GET /api/project/tree` — list every `.md` / `.html` under the docs dir (relative
    paths + a top-level group, e.g. `features` / `adr` / `workflow` / `root`).
  - `GET /api/project/doc?path=…` — return one file's text. **Guard it:** reject path
    traversal (`../`), absolute paths, non-doc extensions, and missing files → 404.
  - (Optional) proxy read-only views of your running services for a live dashboard.
- **Frontend**: a grouped sidebar (features / adr / workflow / root), the feature index as
  the landing doc, markdown rendered client-side; render any committed `.html` mockups in a
  **sandboxed** iframe. Treat repo docs as first-party trusted content.
- **One deployable**: build the static UI into the BFF's image (multi-stage), serve the UI
  at `/` and the API under `/api`.

## Why it's worth it

- The five-phase process and the decision trail become discoverable to anyone, not just
  whoever knows the file tree.
- It pairs naturally with a live "what's happening now" dashboard if your system has a
  runtime worth watching.

## When to build it

Reserve a feature number and run it through the normal lifecycle once you have enough docs
that browsing them in a UI beats reading the tree. Keep the BFF a pure reader (no writes to
anything it doesn't own).
