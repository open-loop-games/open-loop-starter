/**
 * What the field draws, read from the match as one plain value. It is the player's view:
 * a rival squad shows only where the player sees it now, its last sighting where they do
 * not, and a rival convoy only while an end of its road is seen. The field reads nothing
 * else, so the fog in the pixels is the fog this function applies.
 *
 * The host reads it in a `computed`, so it is rebuilt once per sim tick, not per frame.
 */
import { toNumber } from '@open-loop/engine';
import { DISTRICTS } from '../../data/contracts';
import { adjacent, type Place } from '../../data/map';
import { UNIT_KINDS } from '../../data/units';
import { PRESENCE, countsOf, heldBy, noCounts, total, type Counts } from '../../modules/battle';
import type { MatchApi, Owner, Sighting } from '../../modules/match';
import { readyUnits } from '../../modules/orders';
import { blockOf, type Block, type Focus, type Stance } from '../../modules/side';
import { destination, roadsLeft, type Convoy } from '../../modules/travel';

export interface PlaceView {
  place: Place;
  /** Your units here: the squad in a district, the whole units ready at your safehouse. */
  mine: Counts;
  /** The rival's units you see here now; absent where you have no eyes. */
  theirs?: Counts;
  /** What you last saw of the rival here, while you do not see it now. */
  sighting?: Sighting;
  /** −1..1, +1 all yours; 0 at a safehouse. */
  control: number;
  owner: Owner;
  /** Sentry nest integrity, 0..1; the rival's is 0 where you do not see it. */
  nests: { p: number; e: number };
  stance: Stance;
  focus: Focus;
  fight: boolean;
  /** A siege leaving this district for the rival's safehouse, or for yours. */
  siege: 'out' | 'in' | 'none';
}

export interface ConvoyView {
  side: 'p' | 'e';
  id: number;
  counts: Counts;
  from: Place;
  /** The place at the far end of the road it is on. */
  next: Place;
  /** 0..1 along that road. */
  progress: number;
  destination: Place;
  /** Seconds until it gets where it is going, unstopped. */
  eta: number;
}

export interface FieldFrame {
  /** Your safehouse, the districts in order, the rival's safehouse. */
  places: PlaceView[];
  convoys: ConvoyView[];
  integrity: { p: number; e: number; max: number };
  turrets: { p: number; e: number };
  /** What stands on each safehouse block: yours now, the rival's as the scout last saw it. */
  blocks: { p: Block; e?: Block };
  scouting: boolean;
}

export const PLACES: readonly Place[] = ['p', ...DISTRICTS.map((_, i) => i), 'e'];

function safehouse(m: MatchApi, side: 'p' | 'e', scouting: boolean): PlaceView {
  const home = Object.fromEntries(UNIT_KINDS.map((k) => [k, readyUnits(m.p, k)])) as Counts;
  return {
    place: side,
    mine: side === 'p' ? home : noCounts(),
    theirs: side === 'p' ? noCounts() : scouting ? countsOf(m.e.reserve) : undefined,
    sighting: side === 'e' && !scouting ? m.safehouseSighting.value : undefined,
    control: 0,
    owner: side,
    nests: { p: 0, e: 0 },
    stance: 'hold',
    focus: 'spread',
    fight: false,
    siege: 'none',
  };
}

function district(m: MatchApi, i: number): PlaceView {
  const seen = m.visible(i);
  const mine = countsOf(m.p.squads[i]!);
  const theirs = seen ? countsOf(m.e.squads[i]!) : undefined;
  const control = m.control[i]!.value;
  const held = heldBy(control);
  const nestMax = m.tune.nestHp.value;
  const nests = {
    p: toNumber(m.p.nests[i]!.hp.value) / nestMax,
    e: seen ? toNumber(m.e.nests[i]!.hp.value) / nestMax : 0,
  };
  const here = total(mine) > PRESENCE;
  const there = theirs !== undefined && total(theirs) > PRESENCE;
  const assault = (side: 'p' | 'e') => m[side].stance[i]!.value === 'assault';
  return {
    place: i,
    mine,
    theirs,
    sighting: seen ? undefined : m.sightings.value[i],
    control,
    owner: m.owner[i]!.value,
    nests,
    stance: m.p.stance[i]!.value,
    focus: m.p.focus[i]!.value,
    fight: (here && (there || nests.e > 0)) || (there && nests.p > 0),
    siege:
      held === 'p' && here && assault('p') && adjacent(i, 'e')
        ? 'out'
        : held === 'e' && there && assault('e') && adjacent(i, 'p')
          ? 'in'
          : 'none',
  };
}

function convoy(m: MatchApi, side: 'p' | 'e', c: Convoy): ConvoyView {
  return {
    side,
    id: c.id,
    counts: { ...c.counts },
    from: c.from,
    next: c.path[0]!,
    progress: c.progress,
    destination: destination(c),
    eta: roadsLeft(c) * m.tune.hopS.value,
  };
}

/** The field's view of the match now. */
export function readFrame(m: MatchApi): FieldFrame {
  const scouting = m.scoutLeft.value > 0;
  return {
    places: [
      safehouse(m, 'p', scouting),
      ...DISTRICTS.map((_, i) => district(m, i)),
      safehouse(m, 'e', scouting),
    ],
    convoys: [
      ...m.p.convoys.value.map((c) => convoy(m, 'p', c)),
      ...m.seenConvoys().map((c) => convoy(m, 'e', c)),
    ],
    integrity: {
      p: toNumber(m.p.hq.value),
      e: toNumber(m.e.hq.value),
      max: m.tune.hqIntegrity.value,
    },
    turrets: { p: m.p.turretLevel(), e: m.e.turretLevel() },
    blocks: { p: blockOf(m.p), e: m.safehouseSighting.value?.block },
    scouting,
  };
}
