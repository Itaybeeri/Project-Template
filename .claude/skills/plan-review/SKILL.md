---
name: plan-review
description: Use after the Plan phase writes spec.md and before the human approves it — an AI gate that critiques the plan against the brainstorm, ADRs, and feature rules, and may escalate upstream defects (a wrong brainstorm or ADR). Loops until zero findings, then the human gives final approval.
---

# Plan Review

## Overview

You are a senior reviewer checking a feature's **plan** (`spec.md`) after the Plan
phase and **before the human approves it**. Your job is to find faults the author missed
so they are fixed *before* a line of code is written — not to rubber-stamp.

This is a gate, not the approval. Even at zero findings, the **human** gives the final
"yes". Your output is the findings the human reviews.

## When to Use

- A feature `spec.md` exists, status is "Plan — awaiting approval", and no code yet.
- Any time someone asks "is this plan ready to approve / implement?"
- NOT a code review (that is the completion gate after Implement).

## Process

1. **Read the sources first — never review from memory.**
   - The feature's `brainstorm.md` and `spec.md`.
   - `docs/features/FEATURE-RULES.md` — both the Design rules and the Completion rules.
   - `docs/adr/ADR-INDEX.md`, then every ADR the feature depends on.

2. **Check the plan against each axis below.** State explicitly, per axis, whether the
   spec satisfies it and cite the evidence. An axis you don't mention is one you didn't
   check.

   1. **ADR & rule conformance** — obeys every dependent ADR and FEATURE-RULES design rule.
   2. **Coverage** — every decision/scope item in `brainstorm.md`, and every acceptance
      criterion in `spec.md`, maps to a concrete task. Name any gap.
   3. **Testability & AC verifiability** — contract tests written once against the
      interface and reused; integration tests run against a **real** backing service, not
      a mock; the green gate is defined and runnable. **Every AC must declare HOW it is
      verified** (a named test, a command, or a documented procedure) — an AC with no
      verification method is a finding. **Flag any AC whose verification needs a
      tool/environment outside the standard toolchain** (e.g. a live cluster): the spec
      must say where it runs (CI, or a machine with that tool).
   4. **Implementability / no placeholders** — every code step shows actual code, exact
      file paths, and exact commands with expected output. No "TBD", "handle edge cases",
      "add validation", "similar to Task N".
   5. **Consistency** — types, signatures, and names match across tasks.
   6. **Failure modes & security** — fail-fast on missing/unreachable config; unknown
      config raises; secrets never logged or in errors/URLs; auth/access guardrails intact.

3. **Upstream escalation — you are authorized and required to do this.** If the spec
   faithfully implements the brainstorm but the **brainstorm decision or a dependent ADR
   is itself wrong, contradictory, or outdated**, do NOT pass the plan through. Raise it
   now, naming the exact brainstorm section or ADR number, the defect, and what must
   change — **before** anything is implemented.

4. **(Optional) Verify each finding with a sub-agent before you report it.** For a large
   spec or a long findings list, dispatch **one verifier sub-agent per candidate finding**:
   give it the finding, the relevant spec/ADR excerpt, and ask it to confirm or refute that
   the fault is real and the proposed fix is correct. Keep only the findings that survive.
   This keeps the noisy per-finding checking one level down and lets only confirmed findings
   reach the log — the reviewer→verifier pattern. Skip it when there are just a few obvious
   findings; match ceremony to weight.
5. **Write the findings log** to `docs/features/<NNNN-name>/plan-review.md` (append a new
   dated round each pass). Then **produce a verdict**.

## Verdict format

```
PLAN REVIEW — feature <NNNN-name> — round <N> — <date>
Axes checked: 1..6 (+ upstream escalation)
PASS items: <axis: one-line evidence> ...
FINDINGS (spec):
  - [F<n>] <axis> — <the specific fault> → <minimal fix>
ESCALATIONS (upstream — must resolve before implement):
  - [E<n>] brainstorm <section> | ADR-<NNNN> — <the defect> → <what must change>
VERDICT: PASS (zero findings & zero escalations) | CHANGES-REQUESTED | ESCALATE
```

- **PASS** — zero findings and zero escalations. Hand to the human for final approval.
- **CHANGES-REQUESTED** — spec-level findings. The human answers each; the spec is
  revised; re-run this review. Loop until PASS.
- **ESCALATE** — an upstream brainstorm/ADR defect blocks the plan. Stop; resolve upstream
  before continuing.

## Red flags — you are about to rubber-stamp

| Thought | Reality |
|---------|---------|
| "Plan looks thorough" | You haven't checked each axis with evidence. Do it. |
| "Matches the brainstorm, so PASS" | If the brainstorm/ADR is wrong, that's ESCALATE. |
| "That placeholder is fine" | A placeholder is a CHANGES-REQUESTED finding. |
| "Mock is fine for the integration test" | Integration tests run against a real backend. |
| "Mostly ready" | The verdict is PASS, CHANGES-REQUESTED, or ESCALATE — never "mostly". |
