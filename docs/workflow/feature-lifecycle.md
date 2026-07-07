# Feature Lifecycle

How every feature gets built. Five phases. Each phase has an output; the next
phase doesn't start until the previous output exists and is approved.

```
Brainstorm  ->  Plan  ->  Implement  ->  Test  ->  Review / Merge
 (explore)    (decide)    (build)      (verify)   (gate + deploy)
     │            │
  architect    plan review
   review     (AI gate, then
 (AI gate)    human approval)
```

Two AI gates guard the early phases: **architect-review** between Brainstorm and
Plan, and **plan-review** between Plan and Implement. Both run in an isolated context,
both can **escalate upstream** (flag that a brainstorm decision or an ADR is itself
wrong and must be fixed before implementing), and neither replaces the human: after a
gate passes, a human still gives the final go-ahead.

One feature = one folder + one branch + one PR into the default branch. Tests gate on
the PR. Merge triggers the deploy (when you have one).

> **Tooling note.** This lifecycle references an agent harness with the **superpowers**
> plugin (`brainstorming`, `writing-plans`, `executing-plans`, `requesting-code-review`).
> If you don't use it, substitute your own equivalents for those steps — the phase
> structure and gates are what matter.

## Match ceremony to weight

- **Trivial fix** (typo, small obvious bug): branch → fix → test → PR. No brainstorm /
  spec / ADR.
- **Feature within the existing architecture:** full five phases + `spec.md`, no ADR.
- **Architecturally significant** (cross-cutting, hard to reverse, constrains future
  work): full five phases **plus** an ADR (`docs/adr/`, per `ADR-RULES.md`).

`Plan` always produces `spec.md`; it produces an ADR **only** for the architecturally
significant case.

## Each feature gets a folder

`docs/features/<NNNN-name>/` holds the feature-scoped docs:

```
docs/features/0001-example/
├── brainstorm.md      # phase 1 — options explored and why we rejected some
├── spec.md            # phase 2 — the approved plan + acceptance criteria
└── plan-review.md     # phase 2a — the plan-review findings log (one round per pass)
```

The **decision (ADR)** a feature produces does NOT go here — it goes in the global
`docs/adr/` log, and `spec.md` references it by number.

---

## 1. Brainstorm  (diverge)  ->  brainstorm.md

**Goal:** understand the real problem and surface options. Rough is fine, but it IS
committed — the rejected options and the reasons are part of the trail.

- State the problem and constraints.
- List 2-3 approaches with trade-offs; mark which you're leaning toward and why.

**Output:** `docs/features/<NNNN-name>/brainstorm.md` (from `workflow/brainstorm-TEMPLATE.md`).

### 1a. Architect review  (gate between Brainstorm and Plan)

Before Plan, run the **`architect-review`** skill on the brainstorm. Acting as a senior
architect, it checks the design against the "Design rules" in `docs/features/FEATURE-RULES.md`
and the relevant ADRs, and returns **PASS** or **FAIL**. A FAIL returns to Brainstorm.

**Output:** a PASS verdict. **No Plan until the design passes.**

## 2. Plan  (converge)  ->  spec.md (+ ADR)

**Goal:** decide and write it down. **No code in this phase.**

- Write `spec.md` from `workflow/feature-spec-TEMPLATE.md`: scope, approach,
  **acceptance criteria**, edge cases.
- If the choice is architectural, write an ADR in `docs/adr/` and add it to the index.

**Output:** committed `spec.md` (+ ADR).

### 2a. Plan review  (gate between Plan and Implement)  ->  plan-review.md

Before Implement, run the **`plan-review`** skill on `spec.md`. Acting as a senior
reviewer, it checks the plan against the brainstorm, the dependent ADRs, and
`docs/features/FEATURE-RULES.md` (coverage, testability, no placeholders, consistency,
failure modes, security), and returns:

- **PASS** — zero findings; hand to the human for final approval.
- **CHANGES-REQUESTED** — spec-level findings. Answer each, revise the spec, run again.
  **Loop until PASS.**
- **ESCALATE** — a brainstorm decision or a dependent ADR is itself wrong; stop and fix
  it upstream before continuing.

Findings are logged to `docs/features/<NNNN-name>/plan-review.md` (one dated round per
pass). **No code until plan-review is PASS *and* the human gives the final approval.**

## 3. Implement  (build)

- **Always** build in a dedicated **git worktree** on a `feat/<NNNN-name>` branch — never on
  the default branch, never in the primary checkout. One worktree per feature; the worktree
  is mandatory, not optional.
- **Before creating the branch/worktree, `git fetch` and check for an existing
  `origin/feat/<NNNN-name>`.** If it exists (a parallel agent, another machine, or a prior
  session may have started — or finished — the feature), base on / adopt it rather than
  branching a divergent copy; reconcile with the human if it has diverged from local.
- **Also check the default branch, not just the feature branch.** A feature that already
  merged has no divergent `feat/` branch to catch — the signal lives in
  `origin/<default-branch>`. If its `FEATURE-INDEX.md` there marks the feature **Done**, or
  its key files already exist on the default branch, **STOP** — it shipped; confirm with the
  human before re-implementing. Trust the default branch for "is it done." If this branch has
  merely drifted behind, `git merge origin/<default-branch>` **now**, not at Review (phase 5).
- Build against the approved spec. If you find the plan was wrong, STOP, update spec/ADR
  first, then continue. Don't silently drift.
- **Commit + push after every green step.** Once the full local gate is green for that
  step (lint + typecheck + tests), commit it and immediately push the feature branch.
  Never batch up green steps locally.

**Output:** working code committed and pushed on the feature branch after each green step.

## 4. Test  (verify)

- Cover the spec's acceptance criteria + edge cases.
- Produce an **AC-by-AC traceability table** (each AC → how it's verified → evidence →
  COVERED / GAP / BLOCKED). A dedicated tester agent run in its own context is ideal.
- **Result is verified only when every AC is COVERED.** A failing test or a closeable GAP
  → back to phase 3. A **BLOCKED** required AC (needs a tool/env you lack, or CI) means the
  feature **cannot be certified here**; run it where it can run, or formally de-scope it
  with the human's written sign-off in `spec.md`.

**Output:** the AC-evidence table with **zero open items**, green suite on the branch.

## 5. Review / Merge  (gate + deploy)

**The PR is opened only AFTER tests pass and the branch is in sync with the default
branch.** Follow this order exactly:

1. **Precondition — phase 4 is green.** Every AC COVERED (no GAP/BLOCKED).
2. **Sync with the default branch BEFORE opening the PR:**
   ```
   git fetch origin
   git merge origin/<default-branch>   # resolve conflicts here, on the branch
   ```
   (Merge, not force-push — keeps the pushed branch intact.)
3. **Re-run the full green gate after the sync** and re-confirm the AC table is all-COVERED.
4. **Only now open the PR.** CI runs the tests on the PR — this is the gate.
5. **Check the CI-Roadmap** (`docs/CI-ROADMAP.md`): for each deferred item, if its trigger
   now holds, **surface it to the human** to consider. Don't act on it automatically.
6. Review the diff (security, correctness, error handling).
7. **Before merging, re-check the branch is still in sync** with the default branch; if it
   moved, repeat steps 2–3. **Merge only when green AND every AC COVERED AND up to date.**
8. Update `docs/architecture.md` if the shape changed; set `spec.md` status to Done and the
   FEATURE-INDEX row to Done (+ PR #).

**Output:** merged, deployed (if applicable), state doc current.

---

## Parallel work

Git worktrees make parallel features possible — one repo, multiple working directories,
each on its own branch, one agent session per worktree:

```
git worktree add .worktrees/feat-0002-name -b feat/0002-name origin/<default-branch>
```

Each branch runs phases 3-5 independently with its own PR.
