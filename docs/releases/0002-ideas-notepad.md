# 0002 — Ideas & thoughts notepad

**Released:** 2026-07-30 · **PR:** #3 · **Type:** Feature

## What changed

- Ideas and half-formed thoughts have a home: `docs/IDEAS.md` holds an index table plus one memo per idea, on its own number counter.
- Conversation drift is triaged instead of guessed at — the agent asks whether a tangent is a feature to build or an idea to record, and records it immediately either way.
- The Project Command Center shows the notepad as an Ideas panel, with each idea's memo in a click-through drawer.

## Related docs

- [The notepad itself](docs/IDEAS.md)
- [Triage rule — feature or idea?](CLAUDE.md)

## Files touched

- `docs/IDEAS.md`
- `CLAUDE.md`, `README.md`
- `ProjectCommandCenter/collect.mjs`, `ProjectCommandCenter/index.html`, `ProjectCommandCenter/README.md`
