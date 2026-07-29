# Plan review — automatic release notes

Findings log for `2026-07-29-release-notes-design.md`. One dated round per pass.
(No feature folder by decision D9, so this log sits beside the spec.)

## Round 1 — 2026-07-29

**Axes checked:** 1..6 + upstream escalation.

**PASS items**

- **Axis 1 (ADR & rule conformance)** — no accepted ADRs exist (`ADR-INDEX.md` holds a single
  `<FILL>` row), so nothing to contradict. Design rules 7 and 10 are addressed by D10–D13; the
  two overruled rules (1, 6-numbering) are recorded as explicit human overrides in the spec rather
  than silently dropped.
- **Axis 6 (failure modes)** — hard-error table covers unresolvable refs, duplicate numbers, and
  missing required fields, on every run, writing nothing on failure. No secrets are involved: the
  generator reads only repo docs and `git remote`.

**FINDINGS (spec)**

- **[F1] Axis 4 (implementability)** — the spec describes architecture and acceptance criteria but
  contains **no task breakdown**: no per-file steps, no exact commands with expected output. Not
  implementable as written. → Produce the implementation plan (file-by-file tasks, commands,
  expected output) and re-review.
- **[F2] Axis 2 (coverage)** — the **bootstrap is unspecified**. This feature's own note must be
  produced by the phase-5 step the feature itself introduces, and PR #3 (Ideas panel) merges before
  the machinery exists. AC9 says "at least one real note" without saying which. → State it: note
  `0001` documents this feature, written during its own phase 5; the Ideas panel gets a backfilled
  note; nothing earlier is backfilled.
- **[F3] Axis 3 (AC verifiability)** — AC1, AC2, AC3, AC4, AC8, AC9 declare no verification method;
  only AC5–AC7 and AC10 appear in the Verification section. → Add an AC → verification-method table
  covering all ten.
- **[F4] Axis 3 (environment)** — AC4's *relative-path fallback* cannot be exercised in this repo,
  which has a GitHub remote, and the spec doesn't say where it is verified. → Make the remote
  reader injectable (env override or parameter) so both modes are testable locally, and say so.
- **[F5] Axis 5 (consistency) — latent build break.** The spec globs `docs/releases/*.md`, but also
  implies a shipped template/example file. A `TEMPLATE.md` in that folder would be parsed as a note
  and fail validation, and the illustrative example uses refs (`Feature 0002`, `ADR-0001`) that do
  not exist in this repo — copying it into `docs/releases/` breaks every generator run. → Specify
  the filename pattern as the selector, exclude `TEMPLATE.md` explicitly, and mark the in-spec
  example as illustrative.
- **[F6] Axis 6 (failure modes)** — filename→number derivation is unspecified; a file like
  `draft.md` has no defined behavior. → Selector is `^\d{4}-[a-z0-9-]+\.md$`; `TEMPLATE.md` is
  ignored; any other `.md` in the folder is a hard error naming the file.
- **[F7] Axis 6 (security)** — escaping is specified for note *text* but not for values
  interpolated into HTML **attributes** (resolved `href`s, slugs). → Escape attribute context
  (quotes included) as well as text.
- **[F8] Axis 5 (consistency) — idempotence risk.** GitHub links target "the default branch", but
  the spec never says how that name is resolved. A network or `gh` lookup would make output vary by
  environment and break AC6. → Resolve offline via `git symbolic-ref refs/remotes/origin/HEAD`,
  falling back to `main`; never hit the network.

**ESCALATIONS:** none. The brainstorm decisions are internally consistent, and no ADR is depended
on.

**VERDICT: CHANGES-REQUESTED** (8 findings, 0 escalations)

### Round 1 resolutions — 2026-07-29

F2–F8 applied to the spec (bootstrap section, AC→verification table, injectable remote reader,
filename selector + `TEMPLATE.md` exclusion, attribute escaping, offline default-branch
resolution). F1 is resolved by the implementation plan written after this round; round 2 reviews
that plan.
