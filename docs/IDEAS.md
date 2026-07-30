# Ideas & Thoughts

A notepad for ideas, thoughts, and half-formed things worth talking about — a running list of
memos that aren't (yet) features. Capture first, decide later. When an idea is ready to become
real work it **graduates** into a feature (`docs/features/FEATURE-INDEX.md`); until then it
lives here so it's never lost to a closed session.

**How this connects to the rest of the workflow.** When a conversation drifts to something not
tied to current work, the agent asks: *is this a **feature to implement** or an **idea/thought
to just record**?* Features go to `FEATURE-INDEX.md` and the five-phase lifecycle; ideas land
here as a row + a memo — immediately, so nothing is dropped and nothing is silently built. (See
CLAUDE.md → Workflow rules.)

**Numbering.** Ideas have their **own** counter (`001`, `002`, …), separate from feature and
ADR numbers (see CLAUDE.md → Numbering). Numbers are never reused; a dropped idea keeps its
number and gets status `Dropped`.

## Status legend

`Open` (captured, not discussed) · `Discussing` (actively being talked through) ·
`Parked` (deliberately on hold) · `Graduated` (became a feature — link it) ·
`Dropped` (decided against — kept for the record).

## Index

Each row's **#** links to that idea's memo section below. When an idea graduates, set its
status to `Graduated` and link the **Summary** (or a trailing note) to the feature number in
`FEATURE-INDEX.md`.

| #   | Idea                       | Status | Tag  | Summary                              |
| --- | -------------------------- | ------ | ---- | ------------------------------------ |
| 001 | <FILL: first idea's title> | Open   | —    | <FILL: one-line what & why>          |

> Newest at the bottom. The Tag column is a free-form label (e.g. `ux`, `infra`, `spike`,
> `question`) to group related thoughts. Delete the `<FILL>` example row when you add the
> first real idea.

## Memos

One section per idea, `### NNN — Title`, holding the actual thought and any discussion. Keep
the index row's summary in sync with the memo. The Project Command Center shows these bodies in
a drawer when you click an idea.

<!--
Template for a new memo — copy this block:

### 001 — <FILL: title>

**Status:** Open · **Tag:** — · **Captured:** <FILL: date>

<FILL: the idea itself — what it is, why it might matter, the question to resolve. Add
discussion notes over time. When it graduates, note the feature number here and flip the
index row to Graduated.>
-->
