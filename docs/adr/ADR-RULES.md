# ADR Rules — read before writing or superseding any ADR

These rules govern the ADR log (`docs/adr/`). They are mandatory.
CLAUDE.md points here; the detail lives here so it loads only when relevant.

## What an ADR is

An Architecture Decision Record captures one architecturally significant decision —
one that is cross-cutting, hard to reverse, or constrains future work — and *why* it
was made. The ADR log is the append-only trail of how our thinking evolved.

Most features and bug fixes do NOT need an ADR. Only write one when the work makes a
decision that meets the bar above.

## The non-negotiable rules

1. **ADRs are immutable once accepted.** Even if an ADR was written minutes ago, even
   if only a small detail changed, even if the core decision is unchanged: do NOT
   edit it. No exceptions.

2. **Supersede, don't rewrite.** To change a decision, freeze the old ADR
   (set its status to `Superseded by NNNN`) and write a NEW ADR that references it
   and explains what changed and why. A partial change (one section of an old ADR)
   still requires a new ADR — note in both that only that section is affected.

3. **The log is append-only and global.** Never edit an accepted ADR's body. Never
   move ADRs into feature folders — they outlive and cross-cut features.

4. **Every accepted ADR immediately updates `docs/architecture.md`.** Right after
   committing the ADR, overwrite the relevant sections of `architecture.md` to
   reflect the new current state. The `_Reflects up to ADR-NNNN_` line must always
   name the latest accepted ADR.

5. **Every ADR updates the index.** Add (or update the status of) the row in
   `docs/adr/ADR-INDEX.md`.

6. **Every ADR assesses impact on existing features.** A decision change must never
   *silently* invalidate existing work. Each ADR includes an **"Impact on existing
   features"** section. To build it:
   - **Search before you classify — never mark anything "not affected" from memory
     or assumption.** This is a mechanical step, not a judgment call. Identify the
     concrete things the decision changes (an old path, a renamed term, a replaced
     tool, a changed count, a config field) and grep the repo for each one:
     ```
     # run for EACH changed token; every hit is a candidate impact
     grep -rin "<old path / renamed term>" docs/ <source dirs>
     ```
     A feature may be marked **Unaffected only if the searches return no hits in its
     files.** If a search hits, that feature is affected — full stop.
   - List the exact searches you ran in the section (so a reviewer can rerun them).
   - Classify each feature the searches surfaced: **Unaffected**, or **Needs
     reconciliation**.
   - For each *Needs reconciliation* feature, the disposition must be explicit and
     recorded — never left implicit:
     - **Not yet shipped** → update the feature's docs to conform (or note the
       follow-up), so it never enters Plan/Implement non-conformant.
     - **Already shipped / running** → either (a) create a reconciliation follow-up
       and drop a banner in that feature's `spec.md`, or (b) grandfather it with a
       **recorded, dated exception** in its `spec.md` ("Conforms to ADR-NNNN except
       X; exception accepted because Y"). Visible drift, never hidden drift.
   - If no features are affected, say so explicitly (don't omit the section).

## Numbering

ADR numbers are their own counter, separate from feature numbers. Sequential, never
reused. A feature may produce zero, one, or several ADRs.

## Status values

`Proposed` · `Accepted` · `Superseded by NNNN` · `Deprecated`

## Checklist for writing a new ADR

- [ ] Start from `docs/adr/ADR-TEMPLATE.md`.
- [ ] Assign the next free ADR number.
- [ ] Fill in context, options considered (with why each was rejected), decision,
      consequences.
- [ ] If it supersedes an earlier ADR: set the old one's status to
      `Superseded by NNNN` (do NOT touch its body), and reference it in the new one.
- [ ] Add/update the row in `docs/adr/ADR-INDEX.md`.
- [ ] Update `docs/architecture.md` to the new state, including the
      `Reflects up to ADR-NNNN` line.
- [ ] Write the "Impact on existing features" section: **grep the repo for each thing
      the decision changes**; list the searches run; mark a feature *Unaffected* only
      if its files return no hits; record the disposition for any affected shipped feature.
- [ ] Commit.
