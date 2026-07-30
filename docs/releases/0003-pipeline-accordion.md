# 0003 — Delivery pipeline folds instead of scrolling

**Released:** 2026-07-30 · **Type:** Fix

## What changed

- The Command Center's delivery pipeline no longer scrolls sideways: it is one collapsible row per lifecycle phase, stacked vertically, so it fits any window width.
- Phases with no features render collapsed — the template's empty state is seven slim lines instead of a board scrolling through seven columns of `—`.
- Folding a phase leaves a one-line summary of what's inside it, and the fold survives the page's 60-second auto-refresh (remembered per browser).
- Deep links still land correctly: opening a feature by URL reveals its phase before opening the drawer.

## Related docs

- [The Command Center and its panels](ProjectCommandCenter/README.md)
- [The five phases the rows correspond to](docs/workflow/feature-lifecycle.md)

## Files touched

- `ProjectCommandCenter/index.html`
