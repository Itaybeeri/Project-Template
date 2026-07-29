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

## Round 2 — 2026-07-29 — the implementation plan

**Reviewing:** `docs/superpowers/plans/2026-07-29-release-notes.md` (resolves F1).
**Axes checked:** 1..6 + upstream escalation.

**PASS items**

- **Axis 2 (coverage)** — the plan's self-review maps all ten ACs plus the Bootstrap and
  clean-template sections to tasks; spot-checking AC4, AC7, and AC10 confirms each names a task
  and a command.
- **Axis 3 (testability)** — every task ends in a runnable command with expected output, and the
  no-test-runner deviation is stated in Global Constraints rather than hidden.
- **Axis 1** — the plan adds nothing outside the clean-template file list, and Task 6 removes the
  planning docs.

**FINDINGS (plan)**

- **[F9] Axis 5 (consistency) — needless async ripple.** Task 5 Step 3 converts the public
  `collectState()` to async, forcing edits at three call sites (`serve.mjs`, `generate.mjs`, the
  debug block) for one guarded import. → `collect.mjs` is ESM: do the guarded `await import()` once
  at module top level and keep `collectState()` synchronous. No call site changes.
- **[F10] Axis 4 (implementability) — commands reference an unset variable.** Task 1's steps use
  `$SCRATCH` / `process.env.SCRATCH` without ever exporting it. → Export it in the task's first
  step.
- **[F11] Axis 4 — the plan ships broken code.** `section()` uses `\Z`, which **JavaScript RegExp
  does not support**; the section body would never terminate correctly. → Use
  `(?=\n##\s|$)` with a lazy body.
- **[F12] Axis 6 (failure modes) — stale output is never pruned.** Renaming or deleting a note
  leaves its old `NNNN-slug.html` in `ReleaseNotes/`, unreferenced by the index but committed and
  linkable. → The generator deletes orphaned `^\d{4}-.*\.html$` files that no current note claims.
- **[F13] Axis 4 — garbled step.** Task 5 Step 6 contains a half-rewritten sentence ("`mkdir
  $SCRATCH/empty` test is unnecessary — instead…"). → Rewrite as two clean sub-steps.
- **[F14] Axis 3 — the idempotence check can't fail.** Task 3 Step 5 checks `git status` after two
  runs, but on the first generation the files are untracked and show as `??` either way. → Hash the
  output, regenerate, compare hashes.
- **[F15] Axis 6 — double escaping in links.** `inline()` escapes the whole string, then applies
  `esc(u)` again to the already-escaped URL, so `&` in a URL becomes `&amp;amp;`. → Drop the second
  `esc(u)`.
- **[F16] Axis 5 — edit target won't match.** Task 4 rewrites CLAUDE.md's Numbering paragraph to
  "FOUR SEPARATE counters", but Task 4 runs **before** Task 5's `git merge origin/main`; on this
  branch that paragraph still reads "Feature and ADR numbers are SEPARATE counters" (pre-Ideas). →
  Move the default-branch merge to the front of Task 4 and state the post-merge source text.

**ESCALATIONS:** none.

**VERDICT: CHANGES-REQUESTED** (8 findings, 0 escalations)

## Round 3 — 2026-07-29 — re-review after fixes

**Axes checked:** 1..6 + upstream escalation. Re-verified each round-2 finding in the plan text:
F9 (top-level await, `collectState()` sync, call sites untouched) · F10 (`export SCRATCH` present)
· F11 (`(?=\n##\s|$)`, no `\Z`) · F12 (prune block with `readdirSync`/`rmSync`, both imported) ·
F13 (empty-state steps rewritten as four commands) · F14 (`md5sum -c`, available in Git Bash) ·
F15 (single escape on link URLs) · F16 (merge at the head of Task 4, post-merge source text
quoted).

Also re-checked type consistency end to end: `parseNotes({root}) → {notes, problems}` and the note
field names are spelled identically in `generate.mjs`, `collectReleases()`, and the panel;
`hrefFor(path, anchor)` matches `resolveRef`'s `{label, path, anchor}`.

**FINDINGS:** none. **ESCALATIONS:** none.

**VERDICT: PASS** — hand to the human for final approval. No code until that approval.

### Round 2 resolutions — 2026-07-29

F9–F16 applied to the plan.

### Round 1 resolutions — 2026-07-29

F2–F8 applied to the spec (bootstrap section, AC→verification table, injectable remote reader,
filename selector + `TEMPLATE.md` exclusion, attribute escaping, offline default-branch
resolution). F1 is resolved by the implementation plan written after this round; round 2 reviews
that plan.
