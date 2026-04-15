# TODO.md — frozen backlog

Work that's been thought about and is worth tracking, but isn't an active
Vikunja ticket. Things graduate *out* of here into Vikunja when someone
actually wants them; they get deleted from here if they stop being relevant.

Keep entries short. Link to context when it exists. Date entries so they
can be pruned later.

---

## cc-authentic vs. real Cookie Clicker first-hour validation

**Added:** 2026-04-14
**Scope:** open-loop-sim (sim-tool calibration, not engine correctness)

Validate that ticking `cc-authentic` through the engine matches real Cookie
Clicker's first-hour timing within ±10%. Would fire if/when someone wants
that external-validation signal. Shape:

- Source a CC first-hour citation (speedrun / wiki / headless CC run) —
  note this is policy-dependent (greedy cheapest vs. payback-period vs.
  scripted build), so the citation has to specify or imply a buy policy.
- Add an integrated-metric test that ticks cc-authentic with the matching
  buy policy to some target (e.g. 1e6 cookies or 1hr wall time) and asserts
  against the citation.
- Requires a buy driver in the starter harness, or composition of engine's
  `setupAutoPurchaseProducers` in a scripted-policy mode.

**Why parked:** the P2 triangulation framing (OL-426 as originally scoped)
bundled this with engine-correctness work. Engine-correctness is the valuable
part and it stands alone. External-CC validation is genuinely a sim-tool
calibration story — "does our balance tooling model CC faithfully" — not an
engine-correctness story. Nice-to-have, not critical path, no owner.

**OL-428 connection:** cc-authentic full-depth (vm-sandbox extraction) used
to be gated on this. Its trigger condition now needs rewriting: "fire if the
parked validation work exposes a gap the minimal fixture can't catch." If
this TODO ever graduates into a ticket, update OL-428's blocked_by.
