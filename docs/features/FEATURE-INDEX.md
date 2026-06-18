# Feature Index

The central list of features in `docs/features/`. Feature numbers are a counter
**separate** from ADR numbers (see CLAUDE.md → Numbering). This index makes numbering
discoverable and prevents collisions — **reserved** numbers are listed here too.

**Keep this current:** add a row when you start a feature (status In progress), update
its status as it moves through the phases, and set it Done at merge. Reserve a number by
adding a Reserved row before anything is built.

**Deferred work lands here, immediately.** When you agree to defer a task or future
feature ("save this for later"), record it as a row (status `Reserved` or `Planned`) the
moment it's agreed — and, if it's a sibling of a feature being designed, also note it in
that feature's `brainstorm.md`. Session task lists are ephemeral; agreed-upon future work
must never live only there.

## Status legend

`Planned` · `In progress` · `Done` · `Reserved`

## Index

Name links → the feature's local docs folder (`brainstorm.md` / `spec.md` /
`plan-review.md`); PR links → the pull request (full diff, CI, discussion).

| #    | Name | Status | PR | Summary |
| ---- | ---- | ------ | -- | ------- |
| 0001 | <FILL: first-feature-name> | Planned | — | <FILL: one-line summary> |

> Newest at the bottom. Names are the `docs/features/<NNNN-name>/` folder slug. When you
> add a row, link the name to its folder and the PR number to its URL.
