# CI-Roadmap — deferred CI work and when to revisit it

> **Read this during every PR** (Review/Merge phase). For each deferred item below,
> check whether its **Trigger** is now true. If a trigger holds, **STOP and tell the
> human**: *"CI-Roadmap: trigger for `<ID>` now holds (`<reason>`) — consider doing it."*
> Surface it for the human to **consider** — do **not** act on it automatically, and do
> not block the PR on it.

Start CI minimal (**scope A**) and layer richer phases in only when they earn their place.
This is the "start minimal, add later" path — it keeps PR feedback fast.

## Scope A — start here

<FILL: the minimal PR gate you start with. Example: lint + typecheck + tests (incl. real
integration) on every PR.> Add the workflow under `.github/workflows/` (or your CI system).

## Deferred items

| ID | Deferred item | Why deferred now | Trigger to revisit | Status |
|----|---------------|------------------|--------------------|--------|
| <FILL: B> | <FILL: e.g. end-to-end / deploy smoke in CI> | <FILL> | <FILL: when this becomes true> | Deferred |
| <FILL: C> | <FILL: e.g. image build/push + multi-env promotion> | <FILL: no deploy target yet> | <FILL: first cloud/prod target started> | Deferred |
| <FILL: D> | <FILL: e.g. make CI a required status check / branch protection> | <FILL: needs a paid plan / org setting> | <FILL: that becomes available> | Deferred |

When a trigger fires and the human agrees, spin the item into its own feature via the
normal lifecycle.
