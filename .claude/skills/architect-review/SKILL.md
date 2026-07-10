---
name: architect-review
description: Use when a feature brainstorm is complete and before the Plan phase begins, or whenever a feature design needs an architectural soundness check against the project's ADRs and feature rules.
---

# Architect Review

## Overview

You are a senior architect reviewing a proposed feature **design** (the brainstorm)
before it proceeds to Plan. Your job is to find architectural faults the author may
have missed — the subtle, scaling, coupling, and conformance problems — not to
rewrite the design. A capable reviewer who works from instinct alone misses *specific*
faults (e.g. provider config leaking into generic settings) by treating them as minor
nits. This skill forces a structured check against the project's own rules so those
faults are named, not waved through.

## When to Use

- A feature `brainstorm.md` is written and you are about to move to Plan.
- Any time someone asks "is this design sound / ready to plan?"
- NOT for completed code review (that is the completion gate / code review).

## Process

1. **Read the rules and decisions first — do not review from memory.**
   - `docs/features/FEATURE-RULES.md` → the "Design rules" section.
   - `docs/adr/ADR-INDEX.md`, then each ADR relevant to this feature.
   If you skip this step you will miss project-specific faults. Read them every time.

2. **Walk every Design rule in order.** For each numbered rule, state explicitly whether
   the design satisfies it and cite the evidence from the brainstorm. Do not summarize
   ("looks good") — check each rule by number. A rule you don't mention is one you
   didn't check.

3. **Hunt the scaling fault specifically.** For every shared/generic structure (config
   classes, base classes, registries, factories), ask: *what happens when the 5th
   adapter/feature/provider is added?* If a generic structure holds provider-specific
   fields, that is a FAIL, not a nit.

4. **Escalate upstream defects — you are authorized and required to.** If reviewing this
   design exposes that a **dependent ADR is itself wrong, contradictory, or outdated**
   (e.g. two ADRs disagree), do NOT quietly design around it. Name the ADR number, the
   defect, and what must change, and raise it **before** the feature proceeds. Resolve it
   by superseding the ADR per `docs/adr/ADR-RULES.md`.

5. **(Optional) Verify each fault with a sub-agent before reporting.** For a large design
   or a long FAIL list, dispatch **one verifier sub-agent per candidate fault** to confirm
   or refute it against the cited rule/ADR; keep only the faults that survive. This buries
   the per-fault back-and-forth one level down so only confirmed faults reach the verdict —
   the reviewer→verifier pattern. Skip it for a handful of clear faults; match ceremony to
   weight.

6. **Produce a verdict.**
   - **PASS** — all design rules satisfied; proceed to Plan.
   - **FAIL** — list each violated rule *by number*, the specific fault, and the minimal
     fix. Return to Brainstorm to resolve before Plan.
   - **ESCALATE** — a dependent ADR is itself defective (step 4); stop and fix the ADR
     before this feature continues.

## Verdict format

```
ARCHITECT REVIEW — feature <NNNN-name>
Rules checked: 1..N (Design rules, FEATURE-RULES.md)
PASS items: <rule#: one-line evidence> ...
FAIL items:
  - Rule <#> (<name>): <the specific fault> → <minimal fix>
VERDICT: PASS | FAIL
```

## Red flags — you are about to rubber-stamp

| Thought | Reality |
|---------|---------|
| "Looks solid overall" | You haven't checked each rule by number. Do it. |
| "That's just a validation nit" | A provider field in generic config is a coupling FAIL. |
| "Can be fixed in Plan" | Design faults are fixed in Brainstorm. FAIL it now. |
| "Only one adapter, fine for now" | Does the shared structure scale to N? Check. |
| "I know the ADRs" | ADRs change. Re-read the index and relevant ADRs every review. |
| "Seems minor" | Violating the letter of a rule violates the spirit. FAIL it. |

The verdict is PASS or FAIL — never "mostly ready". Name a fault by the rule it violates,
not just its symptom.
