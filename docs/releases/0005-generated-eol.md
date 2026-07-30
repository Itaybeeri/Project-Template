# 0005 — Regenerating release notes no longer dirties the repo

**Released:** 2026-07-30 · **Type:** Fix

## What changed

- Running `node ReleaseNotes/generate.mjs` on Windows reported five modified files that contained no actual changes. The generator writes LF; a checkout with `core.autocrlf=true` converts the committed HTML to CRLF, so every run looked like a change.
- `.gitattributes` now pins the generated HTML to LF, so regenerating is a true no-op when nothing changed — which matters because the phase-5 step runs the generator on every single PR.

## Related docs

- [How notes are written and generated](ReleaseNotes/README.md)
- [The phase-5 step that runs the generator](docs/workflow/feature-lifecycle.md)

## Files touched

- `.gitattributes`
