# Skills & agents this workflow uses

Two kinds: **shipped here** (custom, product-agnostic — copied with the template) and
**plugin** (from the `superpowers` plugin — install it; don't copy/fork it, it's versioned
and would go stale).

## Shipped in this template (`.claude/`)

| Name | Kind | Phase / when | File |
|---|---|---|---|
| `continue` | command | resume a feature at its current phase | `.claude/commands/continue.md` |
| `architect-review` | skill | AI gate after Brainstorm (design soundness) | `.claude/skills/architect-review/SKILL.md` |
| `plan-review` | skill | AI gate after Plan (spec correctness) | `.claude/skills/plan-review/SKILL.md` |
| `implementer` | agent | Implement phase, when the main session orchestrates | `.claude/agents/implementer.md` |
| `tester` | agent | Test phase — AC-by-AC verification in a fresh context | `.claude/agents/tester.md` |

## Plugin skills the lifecycle leans on (install `superpowers`)

These are referenced by `feature-lifecycle.md` and `continue.md`. They come from the
**superpowers** plugin for an agent harness (e.g. Claude Code). Install the plugin rather
than copying these files. If you don't use superpowers, substitute your own equivalents.

| Skill | When it's used (most-used first) |
|---|---|
| `superpowers:brainstorming` | **Brainstorm** — explore intent/options before any design. |
| `superpowers:writing-plans` | **Plan** — turn the brainstorm into a step-by-step `spec.md`. |
| `superpowers:test-driven-development` | **Implement** — red→green→refactor, test before code. |
| `superpowers:executing-plans` | **Implement** — execute a written plan inline with checkpoints. |
| `superpowers:subagent-driven-development` | **Implement** — one fresh subagent per task. |
| `superpowers:verification-before-completion` | before claiming done / opening a PR — evidence before assertions. |
| `superpowers:requesting-code-review` | **Review/Merge** — get the diff reviewed before merge. |
| `superpowers:receiving-code-review` | handling review feedback with rigor, not blind agreement. |
| `superpowers:systematic-debugging` | any bug / test failure / unexpected behavior. |
| `superpowers:using-git-worktrees` | isolating feature work in a dedicated worktree. |
| `superpowers:finishing-a-development-branch` | deciding how to integrate finished work. |

> The gates (`architect-review`, `plan-review`) and the agents (`tester`, `implementer`)
> deliberately overlap with code-review tooling: the gates check *design* and *plan*; the
> tester verifies *acceptance-criteria coverage*; a code review checks the *diff*. Keep all
> of them — they catch different classes of problem.
