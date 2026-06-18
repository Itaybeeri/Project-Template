---
description: Resume work on a feature at its current phase (Brainstorm → Plan → Implement → Test → Review). Worktree/branch-aware; supports parallel features.
argument-hint: "[feature number, e.g. 0002 — optional]"
---

# /continue — resume the feature workflow

Resume work on a feature exactly where it left off, following the five-phase lifecycle in
`docs/workflow/feature-lifecycle.md`. The repo is the memory: figure out the current state
from files on disk, not from any prior conversation.

Arguments: `$ARGUMENTS` (optional feature number).

## Step 1 — Resolve WHICH feature (in this order)

1. **If `$ARGUMENTS` names a feature number** (e.g. `0002`), use that feature.
2. **Else infer from the current git branch.** Run `git branch --show-current`. If it
   matches `feat/<NNNN>-...`, use `<NNNN>`. (This is how parallel worktrees each resume
   their own feature with a bare `/continue`.)
3. **Else scan `docs/features/`** for features whose status is not Done:
   - Exactly one in progress → use it.
   - More than one → **list them with their current phase and STOP, asking which to
     continue.** Do not guess.
   - None → tell the user there's nothing in progress; offer to start a new feature
     (Brainstorm).

**Before redoing any work, check the remote.** Run `git fetch origin`. If
`origin/feat/<NNNN>-...` exists, compare it to local
(`git log --oneline origin/feat/<NNNN>-...`): if it is ahead of or diverged from your
local state, **STOP and reconcile with the human** (adopt the remote / compare /
overwrite) **before** re-running any phase or creating a worktree. Local `docs/` status
can lag a parallel agent (or another machine/session) that already advanced — or fully
finished — the feature on the remote. Never force-push over a remote feature branch you
didn't create.

**Check the default branch too, not just the feature branch.** A *merged* feature has no
divergent `feat/` branch to catch — its `origin/feat/<NNNN>-...` can read identical to
local while the work already lives in `origin/<default-branch>`. So also check: does
`origin/<default-branch>`'s `FEATURE-INDEX.md` mark this feature **Done**, or do its key
files already exist there? If so, **STOP** — it has shipped; confirm with the human before
re-doing anything. **Trust the default branch for "is it done."**

State which feature you resolved and why before proceeding.

## Step 2 — Resolve WHICH phase

Read the feature folder `docs/features/<NNNN-name>/` and determine the phase:

| Evidence on disk | Current phase | Next action |
|---|---|---|
| No `brainstorm.md` | Brainstorm not started | Start the Brainstorm phase. |
| `brainstorm.md` exists, status not "complete" | Brainstorm in progress | **Resume** brainstorming from its "Notes for Plan" / resume notes — do NOT run architect-review yet. |
| `brainstorm.md` complete, not yet architect-reviewed | Brainstorm done | Run the `architect-review` skill; on PASS go to Plan. |
| Brainstorm PASSED, no `spec.md` | Plan | Write `spec.md` (see Step 3). |
| `spec.md` exists, no `plan-review.md` or its last round ≠ PASS | Plan review | Run the `plan-review` skill; loop findings→revise until PASS, then get the human's final approval. |
| `spec.md` Approved (plan-review PASS + human yes), no code | Implement | Create the worktree + `feat/<NNNN>-...` branch (always); build per spec (TDD). |
| Code exists, tests not green | Test | Run the test phase; failures → back to Implement. |
| Tests green (all ACs COVERED), no PR | Review/Merge | In order: sync branch with the default branch (`git fetch` + `git merge`) → re-run the green gate → **then** open the PR. Never open the PR before tests pass. |

Confirm the detected phase with one line before doing the work.

## Step 3 — Honor project conventions

- **Spec location:** always `docs/features/<NNNN-name>/spec.md`.
- **ADRs:** only if an architecturally significant decision is made; follow
  `docs/adr/ADR-RULES.md` (immutable, append-only, impact analysis, update index +
  architecture.md).
- **Feature rules:** the design must satisfy `docs/features/FEATURE-RULES.md`.
- **No code before an approved spec** (anything above a trivial fix): `plan-review` PASS
  **then** a human yes.
- **Onboarding:** if the work adds a tool/dependency/env var, update `docs/ONBOARDING.md`
  in the same change.

## Step 4 — Proceed

Carry out the next action for the resolved phase. Commit in small steps. When the phase's
output exists and is approved, stop and report what's next.
