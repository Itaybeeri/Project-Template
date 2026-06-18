# NNNN. <Short title of the decision>

- **Status:** Proposed <!-- -> Accepted / Superseded by NNNN / Deprecated -->
- **Date:** YYYY-MM-DD
- **From feature:** <!-- NNNN-name, or "—" if cross-cutting -->
- **Supersedes:** <!-- NNNN, or "none" -->
- **Superseded by:** <!-- NNNN, or leave blank -->

## Context

<!-- The forces at play and what we knew AT THE TIME. The problem, the
constraints, the options considered. Write enough that a future reader (or
the agent) understands why this was even a question. This section captures the
thinking, not just the answer — it is the most important one. -->

## Decision

<!-- What we decided. State it plainly. -->

## Impact on existing features

<!-- MANDATORY (ADR-RULES rule 6). A decision change must never SILENTLY invalidate
existing work. SEARCH before you classify — never mark "not affected" from memory.
Grep the repo for each thing this decision changes; a feature is Unaffected only if
its files return no hits. If none are affected, say so explicitly. -->

**Searches run** (one per changed token; rerunnable by a reviewer):

```
grep -rin "<old path / renamed term / replaced tool>" docs/ <source dirs>
```

| Feature | State | Affected? | Action |
|---|---|---|---|
| <NNNN-name> | <Brainstorm/Plan/Done/Running> | <Yes/No> | <none / reconcile + banner in spec.md / dated exception in spec.md> |

## Consequences

<!-- What gets easier, what gets harder, what we are now committed to, and the
trade-offs we are explicitly accepting. -->
