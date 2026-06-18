# Feature Rules — read whenever working on a feature

These rules govern every feature in `docs/features/`. They are mandatory.
CLAUDE.md points here; the detail lives here so it loads only when relevant.

Three checkpoints use this file:
- **Architect review** (after Brainstorm, before Plan) — checks the *design* against
  the "Design rules" below. Run via the `architect-review` skill.
- **Plan review** (after Plan, before Implement) — checks the *plan* (`spec.md`)
  against the brainstorm, ADRs, and these rules. Run via the `plan-review` skill.
- **Completion gate** (before merge) — checks the *finished feature* against the
  "Completion rules" below.

**Upstream escalation (applies to every checkpoint).** A reviewer is not limited to
the artifact in front of it. If a review reveals that an *upstream* input is itself
wrong — a brainstorm decision, or a dependent ADR (including two ADRs that conflict) —
the reviewer must **say so and stop**, naming the brainstorm section or ADR number and
the defect, so it is fixed *before* implementation. A correct implementation of a wrong
premise is still wrong.

---

## Design rules (checked at the architect review, after Brainstorm)

A feature design must satisfy all of these before it proceeds to Plan.

> **Adapt rules 2–7 to your architecture.** The universal rules are 1 (ADR conformance),
> 6 (naming), 7 (failure modes), 8 (testability), 9 (YAGNI), 10 (security). Rules 2–5 below
> are an *example* set for a ports/adapters, env-selected-backend style — replace them with
> the structural invariants that matter for YOUR stack (or delete if not applicable).

1. **ADR conformance.** The design obeys every accepted ADR. Read `docs/adr/ADR-INDEX.md`
   and the relevant ADRs first. If the design needs to contradict an ADR, that is a
   STOP — a new ADR must supersede the old one before this feature continues.

2. **<FILL/adapt> Clear module boundaries.** Business/domain code depends on interfaces,
   not concrete implementations; implementations are swappable behind those interfaces.

3. **<FILL/adapt> Selection via configuration.** Which implementation is used is chosen at
   startup through config/env, not by branching in business code.

4. **<FILL/adapt> Config separation.** Generic settings hold only *selectors*; each
   implementation owns its own config, read only when it is selected. No
   provider-specific fields in generic settings.

5. **<FILL/adapt> Strict, enforced interfaces.** Interfaces are explicit and
   machine-checked (types/ABCs). Missing methods fail at build/instantiation, not at runtime.

6. **Naming is unambiguous and consistent.** Distinct concepts get distinct words; no term
   means two things; no two terms mean one thing. Names match across interface,
   implementation, schema, and tests. (Keep `docs/GLOSSARY.md` in sync.)

7. **Failure modes are designed in.** Fail-fast on startup if a required dependency is
   missing/unreachable; unknown config raises a clear error; no silent degradation.

8. **Testability.** Contract tests are written once against the interface and reused by
   every implementation. Integration tests run against a **real** backing service, not a mock.

9. **YAGNI / no speculation.** No interfaces, abstractions, or infrastructure built without
   a real consumer. No premature generalization.

10. **Security guardrails (see CLAUDE.md).** Authorization / access checks are never
    weakened. No secrets or sensitive data in code, logs, URLs, or the repo.

## Completion rules (checked at the completion gate, before merge)

1. **Every acceptance criterion in `spec.md` is verified with observed evidence — 100%,
   no open items.** The test phase produces an AC-by-AC traceability table (each AC →
   verification method → evidence → COVERED / GAP / BLOCKED). The gate passes only when
   **every AC is COVERED**. An AC that is GAP (no check) or BLOCKED (a check exists but
   couldn't run here — missing tool/environment) is **not** verified and **blocks the merge**.
   "Passing tests" is not enough; "correct by inspection" is not evidence.
   - The only ways to clear an open AC: (a) actually run its check where it can run
     (another machine, or CI), or (b) **formally de-scope it with the human's written
     sign-off recorded in `spec.md`**. Never wave it through.
2. The green gate passes: lint + typecheck + tests all green.
3. Docs current: `architecture.md` updated if the system shape changed; any ADR produced is
   in `docs/adr/` with the index updated; **the feature's row in `FEATURE-INDEX.md` is set
   to Done (with its PR #)**; new/changed terms are in `docs/GLOSSARY.md`; `spec.md` status
   set to Done.
4. One feature = one branch = one PR into the default branch.
   **NON-NEGOTIABLE merge gate:**
   - Nothing merges without a PR AND a full green test suite — unit + integration + the
     spec's acceptance tests — where **every acceptance criterion is COVERED** (rule 1).
     Skipped/excluded tests, "correct by inspection", and "acknowledge the gap" are not green.
   - **Order: tests before the PR.** (1) Test phase green; (2) sync the branch with the
     default branch (`git fetch` + `git merge`, resolve conflicts) so there is no diff
     behind it; (3) re-run the full green gate after the sync; (4) only then open the PR.
     Re-sync + re-test if the default branch moves again before merge.
   - No direct pushes of feature work to the default branch, no merging red/untested PRs,
     no "fix the test after merge." The agent never merges, force-pushes, or changes branch
     protection / CI config unprompted.
   - **CI is the automated gate.** Until CI exists (or is a required check), "green" = the
     test-phase AC table all-COVERED + the post-sync green gate, shown on the PR.

---

## How the architect review reports

- **PASS** — design satisfies all design rules; proceed to Plan.
- **FAIL** — list each violated rule by number, the specific fault, and the minimal fix.
  Return to Brainstorm to resolve before Plan.

A design that violates the *letter* of a rule violates the *spirit* of these rules. Do not
wave through a fault because it "seems minor" or "can be fixed in Plan."
