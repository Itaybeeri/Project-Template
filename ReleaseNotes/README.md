# Release Notes

Rendered release notes. **The source of truth is `docs/releases/*.md`** — one MD memo per merge,
written on the feature branch before its PR opens. This folder holds the generated HTML, which is
committed so the notes are readable on any machine, and on GitHub, with nothing to run.

## Generate

```bash
node ReleaseNotes/generate.mjs            # writes index.html + one page per note
node ReleaseNotes/generate.mjs --check    # validate only, write nothing
```

Validation runs on **every** invocation. A dead ref, a duplicate note number, or a missing required
field exits non-zero and writes nothing. Pages for notes that no longer exist are pruned, so a
renamed or deleted note leaves nothing stale behind.

No build step, no dependencies (Node ≥ 18).

## Files

| File | Role |
|------|------|
| `parse.mjs` | The parser — `docs/releases/*.md` → note objects, refs resolved to real paths. Shared with `ProjectCommandCenter/collect.mjs`. |
| `generate.mjs` | Validates, then renders `index.html` + `NNNN-slug.html`. |
| `index.html`, `NNNN-*.html` | Generated output (committed). |

## Writing a note

Copy `docs/releases/TEMPLATE.md` to `docs/releases/NNNN-slug.md`, taking the next free number
**after** syncing with the default branch. Lead with readable bullets — what changed and why, not
commit subjects — and reference related work with `Refs: Feature NNNN, ADR-NNNN, Idea NNN`. Each
ref resolves to the real MD files and is linked from the note's page; a ref that resolves to
nothing fails the build. See `docs/workflow/feature-lifecycle.md`, phase 5.

**Any repo path you write in backticks becomes a link** — in `## Files touched`, in the bullets,
anywhere. `` `CLAUDE.md` `` renders as a link to the real file. Three deliberate exceptions stay
plain text: something with spaces (`` `node ReleaseNotes/generate.mjs` `` is a command, not a
path), a path that no longer exists (deleted or renamed by that very change — a link would 404),
and anything containing `..`. So you write paths naturally and they resolve, without a dead link
ever being generated.

Links point at GitHub blob URLs when `origin` is a GitHub remote and at repo-relative paths
otherwise. `RELEASE_NOTES_REMOTE=""` forces relative mode.
