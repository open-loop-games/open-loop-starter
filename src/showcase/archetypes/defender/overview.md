# Defender — Bloons

First-arc port of Bloons TD 1 (2007 Flash) — rounds 1–10, 4 towers (Dart / Tack / Bomb / Ice), 4 bloon types on a 1-HP shedding ladder (red / blue / green / yellow), one Monkey-Lane path. Verbatim balance constants from the decompiled AS at `open-loop-research/reference-code/bloons-td-1/scripts/`, pinned at `tunable()` reader sites with `BloonsTD.as:LINE` / `Tower.as:LINE` / `Bloon.as:LINE` citations.

## Identity

Wave-Pacing + Threat-Range Coverage + Cost Scaling. Each round opens a wave of bloons that walk a fixed path; the player commits towers from a fixed roster before/between waves, watches them auto-fire, and reacts between rounds by buying more towers or upgrading existing ones. The strategic surface is *coverage composition under cost pressure* — Dart is general-purpose, Tack is cheap area-coverage near tight bends, Bomb is heavy single-target with splash, Ice slows and softens the wave for downstream towers. Money flows from per-pop drops + round-clear bonuses; losing comes from too many leaks past the exit.

**NOT Placement-Adjacency** — BTD1's vanilla 4 towers have AOE-of-effect (Tack 8-directional, Bomb radius) but no neighbour-*bonus* structure. The Placement-Adjacency shape (gem pairing, building-buff synergy) arrives later under a Defender-Packer hybrid demo with GemCraft as its exemplar. See OL-1021 framing correction.

## Patterns

[Phase 5: Wave Pacing (Tier-3) — bloons spawn in temporal streams per round. Cost Scaling CPP — per-tower base costs + upgrade tiers. Modifier Chains CPP — per-tower upgrade chains deferred to Phase 2.5. Synergy Systems CPP — Ice-slow + Bomb-pierce-overlap as composition multiplier, not first-class.]

## First arc

[Phase 5: rounds 1–10, beat-by-beat narrative. Round 1 onboarding (12 reds, single Dart suffices). Round 3 first blue-shed observed. Round 6 first non-red shed wave (10 greens). Round 10 arc closure (35 greens). Money-budgeting tension peaks at rounds 7–9; round 10 either resolves cleanly or fails on coverage gaps in the second half of the path.]

## Citations

- Tower costs / ranges / starting money / max lives / sell rate: `BloonsTD.as:802-826`
- Wave compositions (rounds 1–50, arc 1 uses 1–10): `BloonsTD.as:574+ BuildLevels()`
- Per-tower fire mechanics (attack rate, projectile speed, pierce): `Tower.as:178-216`
- Tower targeting policy (furthest-along-path, frozen-skip for non-bomb): `Tower.as:257-296`
- Bloon shedding (rank N → rank N-1 on pop): `Bloon.as:279-281`
- Lives-on-leak equals bloon rank: `BloonsTD.as:1151`
- Money-per-pop = 1: `BloonsTD.as:1142`
- Round-clear bonus = `101 - round`: `BloonsTD.as:1174-1175`
- Ice freeze + thaw timeout: `Bloon.as:176`, `Tower.as:215`

## Out of scope (arc 1)

- Upgrade tree (range / pierce / rate / size / freeze upgrades — `BloonsTD.as:808-815` ships costs but arc 1 stays on base towers)
- Bloon ranks 5+ (pink/black/lead/camo/ceramic/MOAB) and rounds 11–50
- Spikey + Super Monkey towers (`BloonsTD.as:804, 807`)
- Multiple maps — only Monkey Lane
