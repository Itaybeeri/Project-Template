# 0004 — Every file path in a note is a link

**Released:** 2026-07-30 · **Type:** Fix

## What changed

- File paths in a release note are now links to the real files. "Files touched" listed paths you could read but not click — only the Related docs section linked anywhere, which was never the intent.
- This works anywhere in a note, not just in one section: any repo path in backticks resolves to the real file, so you write paths naturally and they become links.
- Three cases deliberately stay plain text so a note can never generate a dead link: something with spaces (a command like `node ReleaseNotes/generate.mjs`, not a path), a path deleted or renamed by that very change, and anything containing `..`.

## Related docs

- [How notes are written and generated](ReleaseNotes/README.md)
- [The note template](docs/releases/TEMPLATE.md)

## Files touched

- `ReleaseNotes/generate.mjs`
- `ReleaseNotes/README.md`
- `docs/releases/TEMPLATE.md`
