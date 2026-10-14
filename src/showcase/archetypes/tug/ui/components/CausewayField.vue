<!--
  CausewayField — the battle as a strip of embroidered tapestry, Fairhold's gate on the left
  and the rival's on the right. Every member is a stitched figure in its keep's dye, walking
  in one of the three files; a figure that strikes or is struck flashes undyed. The ramparts'
  reach shades the road near each gate, where cover is strongest, and fades to nothing at the
  middle. A gold stitch marks where the two fronts meet. The field's own ground is worked into
  the road: a ford as a band of water that slows every man, stakes as a palisade no knight
  charges through. A lord's champion is stitched larger, with its name over it.

  The causeway step mutates its member list raw, so this reads `version` to know the figures
  moved, and positions each by transform alone: a member row is the strip's full width, so a
  percentage translate is a percentage of the road.

  Costume classes: `.causeway-field`, `.cf-member`, `.cf-member--player|rival`, `.cf-line`,
  `.cf-gate`, `.cf-reach`, `.cf-band--ford|stakes`, `.champion`, `.cf-champion-name`,
  `.last-week`.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { toRaw } from 'vue';
import { ANCHORS, troop, type TroopId } from '../../data';
import { getBattle, getCauseway, getKeep, type Side } from '../../modules';
import TroopGlyph from './TroopGlyph.vue';

const causeway = getCauseway();
const battle = getBattle();
const keeps = { player: getKeep('player'), rival: getKeep('rival') };
const L = ANCHORS.causewayLength;

interface Figure {
  id: number;
  side: Side;
  troop: TroopId;
  x: number;
  file: number;
  struck: boolean;
  worn: number;
  name?: string;
}

const figures = computed<Figure[]>(() => {
  void causeway.version.value;
  return toRaw(causeway.members.value)
    .filter((m) => m.x >= -2 && m.x <= L + 2)
    .map((m) => ({
      id: m.id,
      side: m.side,
      troop: m.troop,
      x: (m.x / L) * 100,
      file: m.file,
      struck: m.hitAgo < 0.3,
      worn: m.maxHp > 0 ? m.hp / m.maxHp : 1,
      name: m.name,
    }));
});

const bands = computed(() =>
  causeway.bands().map((b, i) => ({
    key: `${b.kind}-${i}`,
    kind: b.kind,
    left: (b.from / L) * 100,
    width: ((b.to - b.from) / L) * 100,
  })),
);

const line = computed(() => {
  void causeway.version.value;
  const at = causeway.line();
  return at === null ? null : (at / L) * 100;
});

const breach = (side: Side) =>
  computed(() => Math.min(1, keeps[side].gateDamage.value / keeps[side].gateMax.value));
const breached = { player: breach('player'), rival: breach('rival') };
const lastWeek = computed(() => causeway.clock.value > battle.seasonSeconds.value);
const big = (t: TroopId) => troop(t).breaksWalls === true;
</script>

<template>
  <section class="causeway-field" :class="{ 'last-week': lastWeek }" aria-label="The Causeway">
    <div class="cf-border cf-border--top">
      <span class="cf-caption cf-caption--ours">Hic · the Homeward Road</span>
      <span class="cf-caption cf-caption--mid">✠</span>
      <span class="cf-caption cf-caption--theirs">the Heathen Mile</span>
    </div>
    <div class="cf-marsh"></div>
    <div class="cf-road">
      <div
        class="cf-reach cf-reach--player"
        title="The ramparts' reach: under our walls, a yeoman is worth three"
      ></div>
      <div class="cf-reach cf-reach--rival"></div>
      <div
        v-for="b in bands"
        :key="b.key"
        class="cf-band"
        :class="`cf-band--${b.kind}`"
        :style="{ left: `${b.left}%`, width: `${b.width}%` }"
        :title="
          b.kind === 'ford' ? 'A ford: every man wades slower' : 'Stakes: no knight charges here'
        "
      >
        <span class="cf-band-label">{{ b.kind === 'ford' ? 'ford' : 'stakes' }}</span>
      </div>
      <div class="cf-midline"></div>

      <div
        v-for="f in figures"
        :key="f.id"
        class="cf-member"
        :class="[
          `cf-member--${f.side}`,
          `cf-file-${f.file}`,
          { struck: f.struck, big: big(f.troop), champion: !!f.name },
        ]"
        :style="{ transform: `translate3d(${f.x}%, 0, 0)` }"
      >
        <span class="cf-figure" :style="{ opacity: 0.45 + 0.55 * f.worn }">
          <TroopGlyph :troop="f.troop" />
        </span>
        <span v-if="f.name" class="cf-champion-name">{{ f.name }}</span>
      </div>

      <div
        v-if="line !== null"
        class="cf-line"
        :style="{ transform: `translate3d(${line}%, 0, 0)` }"
        aria-label="Where the lines meet"
      >
        <span class="cf-line-stitch"></span>
      </div>
    </div>
    <div class="cf-marsh"></div>
    <div class="cf-border cf-border--bottom"></div>

    <div class="cf-gate cf-gate--player" :style="{ '--breach': breached.player.value }">
      <span class="cf-banner"></span>
      <span class="cf-tower"></span>
    </div>
    <div class="cf-gate cf-gate--rival" :style="{ '--breach': breached.rival.value }">
      <span class="cf-banner"></span>
      <span class="cf-tower"></span>
    </div>
  </section>
</template>

<style scoped>
.causeway-field {
  --gate-w: 46px;
  position: relative;
  display: grid;
  grid-template-rows: 28px 18px 132px 18px 22px;
  padding: 0 var(--gate-w);
  border: 1px solid rgba(160, 139, 98, 0.35);
  border-radius: 2px;
  background: #1c1813;
  overflow: hidden;
  contain: layout paint;
}

/* The tapestry's borders: a running stitch of woad and madder lozenges on dark linen. */
.cf-border {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  background:
    repeating-linear-gradient(
      45deg,
      rgba(107, 151, 199, 0.13) 0 6px,
      transparent 6px 12px,
      rgba(189, 79, 60, 0.12) 12px 18px,
      transparent 18px 24px
    ),
    #231d16;
}
.cf-border--top {
  border-bottom: 1px dashed rgba(160, 139, 98, 0.45);
}
.cf-border--bottom {
  border-top: 1px dashed rgba(160, 139, 98, 0.45);
}
.cf-caption {
  font-family: var(--cw-caps);
  font-size: 14px;
  letter-spacing: 0.06em;
  color: var(--cw-gall);
  background: #231d16;
  padding: 0 8px;
}
.cf-caption--ours {
  color: #9db7d6;
}
.cf-caption--theirs {
  color: #d39a8d;
}
.cf-caption--mid {
  color: var(--cw-gall);
  opacity: 0.7;
}

/* The marsh either side of the road. */
.cf-marsh {
  background:
    repeating-linear-gradient(90deg, rgba(120, 140, 125, 0.08) 0 2px, transparent 2px 9px),
    var(--cw-tide);
}

.cf-road {
  position: relative;
  background:
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.12) 0 1px, transparent 1px 4px),
    linear-gradient(180deg, #43392b, var(--cw-road) 40%, #352c21);
}

/* The ramparts' reach: cover strongest at the gate, none at the middle. */
.cf-reach {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  pointer-events: none;
}
.cf-reach--player {
  left: 0;
  background: linear-gradient(90deg, rgba(107, 151, 199, 0.14), transparent);
}
.cf-reach--rival {
  right: 0;
  background: linear-gradient(270deg, rgba(189, 79, 60, 0.1), transparent);
}
.cf-midline {
  position: absolute;
  left: 50%;
  top: 6px;
  bottom: 6px;
  border-left: 1px dashed rgba(221, 209, 182, 0.18);
}

/* A figure: a full-width row, so its percentage translate is a share of the road. */
.cf-member {
  position: absolute;
  left: 0;
  width: 100%;
  height: 0;
  pointer-events: none;
  transition: transform 0.24s linear;
  will-change: transform;
}
.cf-file-0 {
  top: 30px;
}
.cf-file-1 {
  top: 66px;
}
.cf-file-2 {
  top: 102px;
}
.cf-figure {
  position: absolute;
  left: -11px;
  top: -14px;
  width: 22px;
  height: 26px;
  transition: opacity 0.3s ease;
}
.big .cf-figure {
  left: -15px;
  top: -20px;
  width: 30px;
  height: 32px;
}
.cf-member--player .cf-figure {
  color: var(--cw-woad);
}
.cf-member--rival .cf-figure {
  color: var(--cw-madder);
  transform: scaleX(-1);
}
.cf-member--player.struck .cf-figure {
  color: #c9dcf0;
}
.cf-member--rival.struck .cf-figure {
  color: #f0c4b8;
}

/* The field's ground, worked under the figures: a ford's water, a palisade of stakes. */
.cf-band {
  position: absolute;
  top: 0;
  bottom: 0;
  pointer-events: none;
}
.cf-band--ford {
  background:
    repeating-linear-gradient(172deg, rgba(150, 190, 200, 0.16) 0 2px, transparent 2px 9px),
    linear-gradient(180deg, rgba(56, 84, 92, 0.55), rgba(42, 66, 74, 0.7));
  border-left: 1px solid rgba(150, 190, 200, 0.25);
  border-right: 1px solid rgba(150, 190, 200, 0.25);
}
.cf-band--stakes {
  background:
    repeating-linear-gradient(90deg, transparent 0 9px, rgba(120, 92, 58, 0.55) 9px 11px),
    repeating-linear-gradient(0deg, transparent 0 17px, rgba(150, 118, 76, 0.4) 17px 19px);
  border-left: 1px dashed rgba(160, 139, 98, 0.45);
  border-right: 1px dashed rgba(160, 139, 98, 0.45);
}
.cf-band-label {
  position: absolute;
  left: 50%;
  bottom: 2px;
  transform: translateX(-50%);
  font-family: var(--cw-caps);
  font-size: 11.5px;
  letter-spacing: 0.08em;
  color: rgba(221, 209, 182, 0.55);
}

/* A champion: one big figure, its name stitched over it. */
.champion .cf-figure {
  left: -19px;
  top: -26px;
  width: 38px;
  height: 42px;
  filter: drop-shadow(0 0 4px rgba(220, 174, 74, 0.45));
}
.cf-champion-name {
  position: absolute;
  top: -42px;
  left: 0;
  transform: translateX(-50%);
  padding: 0 5px;
  white-space: nowrap;
  font-family: var(--cw-hand);
  font-style: italic;
  font-size: 13px;
  color: #f0c4b8;
  background: rgba(28, 24, 19, 0.85);
  border: 1px solid rgba(189, 79, 60, 0.5);
}

/* The line: a gold stitch where the fronts meet. */
.cf-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 100%;
  pointer-events: none;
  transition: transform 0.6s ease;
}
.cf-line-stitch {
  position: absolute;
  left: -1px;
  top: 2px;
  bottom: 2px;
  border-left: 2px dashed var(--cw-weld);
  opacity: 0.75;
}

/* The gates: a stone tower with its keep's banner; cracks open as the gate breaks. */
.cf-gate {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--gate-w);
  background: linear-gradient(180deg, #4d4438, #3a332a);
}
.cf-gate--player {
  left: 0;
  border-right: 1px solid rgba(0, 0, 0, 0.5);
}
.cf-gate--rival {
  right: 0;
  border-left: 1px solid rgba(0, 0, 0, 0.5);
}
.cf-tower {
  position: absolute;
  inset: 52px 8px 32px;
  background:
    linear-gradient(180deg, transparent 0 46%, #1b1612 46% 100%) center bottom / 14px 34px no-repeat,
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.25) 0 1px, transparent 1px 9px),
    var(--cw-stone);
  clip-path: polygon(
    0 10%,
    20% 10%,
    20% 0,
    40% 0,
    40% 10%,
    60% 10%,
    60% 0,
    80% 0,
    80% 10%,
    100% 10%,
    100% 100%,
    0 100%
  );
}
.cf-tower::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--cw-madder);
  mix-blend-mode: multiply;
  opacity: calc(var(--breach) * 0.85);
}
.cf-banner {
  position: absolute;
  top: 12px;
  left: 50%;
  width: 18px;
  height: 30px;
  margin-left: -9px;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%);
}
.cf-gate--player .cf-banner {
  background: linear-gradient(180deg, var(--cw-woad) 0 60%, var(--cw-weld) 60%);
}
.cf-gate--rival .cf-banner {
  background: linear-gradient(180deg, var(--cw-madder) 0 60%, #1b1612 60%);
}

/* The last week of the campaign season: the borders take an ember cast. */
.last-week .cf-border {
  background:
    repeating-linear-gradient(
      45deg,
      rgba(210, 124, 62, 0.22) 0 6px,
      transparent 6px 12px,
      rgba(189, 79, 60, 0.16) 12px 18px,
      transparent 18px 24px
    ),
    #2a1d14;
  transition: background-color 2s ease;
}
</style>
