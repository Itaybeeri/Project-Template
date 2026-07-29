# 0001 — Automatic release notes

**Released:** 2026-07-29 · **Type:** Feature

## What changed

- Every merge now ships a release note: an MD memo in `docs/releases/`, written on the feature branch before the PR opens, so it lands with the change it describes.
- `ReleaseNotes/` renders those memos to HTML — an index of every note plus one page per note, linking back to the feature, ADR, and idea docs each note references.
- The generator validates on every run: a dead ref, a duplicate note number, or a missing field fails the command and writes nothing, so notes cannot rot into broken links.
- The Project Command Center gained a Releases panel, so the newest notes show up where the rest of the project state already does.

## Related docs

- [How a release note gets written (phase 5)](docs/workflow/feature-lifecycle.md)
- [The merge gate that requires one](docs/features/FEATURE-RULES.md)
- [Writing and generating notes](ReleaseNotes/README.md)
- [Release note — the term](docs/GLOSSARY.md)

## Files touched

- `ReleaseNotes/parse.mjs`, `ReleaseNotes/generate.mjs`, `ReleaseNotes/README.md`
- `docs/releases/TEMPLATE.md`
- `CLAUDE.md`, `docs/workflow/feature-lifecycle.md`, `docs/features/FEATURE-RULES.md`, `docs/GLOSSARY.md`
- `ProjectCommandCenter/collect.mjs`, `ProjectCommandCenter/index.html`
