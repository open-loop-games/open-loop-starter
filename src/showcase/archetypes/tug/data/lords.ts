// ─── Skeleton ───
// The ladder: five neighbouring lords, each with a keep, a tell and a temperament. A
// temperament is behaviour, never a balance knob: difficulty across the ladder comes only
// from the spine's rung scaling. Everything here is written in Fairhold's voice, except a
// herald's boast, which is the lord's own.

import type { TroopId } from './troops';
import type { WeaponKind } from './weapons';

/** From battle second `from`, the share of its silver a keep spends at each horn. */
export interface ProfileStep {
  from: number;
  spend: number;
}

/** How a lord composes its waves: a param bundle the rival's decision function reads. */
export interface Temperament {
  id: string;
  /** Bias over the troops a wave's intent asks for; 1 is neutral. */
  mix: Partial<Record<TroopId, number>>;
  /** 0..1: how hard it shifts toward the answer to the other keep's last wave. */
  counterRead: number;
  /** Every Nth wave is a charge, whatever the other keep sent. */
  chargeEvery: number;
  /** Raises of the tithe it will buy in a battle. */
  tithes: number;
  /** Most of its host's worth it puts into mangonels. */
  siegeShare: number;
  /** How it spends over a battle: rush, hoard then unleash, build to the last week. */
  profile: ProfileStep[];
  /** Sounds its horn early to answer a wave it can counter. */
  earlyHorn: boolean;
  /** The engine on its walls. */
  weapon?: WeaponKind;
}

export interface LordDef {
  rung: number;
  name: string;
  keep: string;
  /** One line on the ladder, in Fairhold's voice. */
  tell: string;
  temperament: Temperament;
  /** What the lord's herald cries at its horn, in the lord's own voice. */
  boasts: string[];
  /** What Fairhold's chronicler makes of it. */
  glosses: string[];
}

const RABBLE: Temperament = {
  id: 'rabble',
  mix: { pike: 2, horse: 0.6, bow: 1 },
  counterRead: 0.1,
  chargeEvery: 5,
  tithes: 0,
  siegeShare: 0.2,
  profile: [{ from: 0, spend: 1 }],
  earlyHorn: false,
};
const HOARD: Temperament = {
  id: 'hoard',
  mix: { pike: 1.5, horse: 0.5, bow: 1.5 },
  counterRead: 0.3,
  chargeEvery: 6,
  tithes: 3,
  siegeShare: 0.25,
  profile: [
    { from: 0, spend: 0.5 },
    { from: 90, spend: 1 },
  ],
  earlyHorn: false,
  weapon: 'trebuchet',
};
const WATCH: Temperament = {
  id: 'watch',
  mix: { pike: 1, horse: 1, bow: 1 },
  counterRead: 0.8,
  chargeEvery: 4,
  tithes: 2,
  siegeShare: 0.25,
  profile: [{ from: 0, spend: 1 }],
  earlyHorn: true,
  weapon: 'firepots',
};

export const LORDS: LordDef[] = [
  {
    rung: 0,
    name: 'Lord Grubb of the Mire',
    keep: 'the Mudhole',
    tell: 'Sends his rabble the moment he can feed them.',
    temperament: RABBLE,
    boasts: ['The Mire-Guard marches for the honour of the Mire!', 'Forward, gallant Mire-Guard!'],
    glosses: ["Grubb's rabble wades out again.", 'More mud-men, roughly in a line.'],
  },
  {
    rung: 1,
    name: 'the Abbot of Dunmarrow',
    keep: 'the Counting-House',
    tell: 'Hoards his tithes, then marches pikes in a wall.',
    temperament: HOARD,
    boasts: ['The holy brothers march, and the Lord marches with them!', 'Blessed are the pikes!'],
    glosses: ["The Abbot's pikes, paid for in stolen tithes.", 'A wall of monks with sticks.'],
  },
  {
    rung: 2,
    name: 'Lady Vesk',
    keep: 'the Spyglass',
    tell: 'Watches what we send, and sends its answer.',
    temperament: WATCH,
    boasts: ['The Spyglass sees all, and answers all!', 'My lady has read you like a ledger.'],
    glosses: [
      'Vesk has been peering at our horn again.',
      'She copies our homework and calls it strategy.',
    ],
  },
  {
    rung: 3,
    name: 'the Brothers Harrow',
    keep: 'the Twin Sties',
    tell: 'More rabble, sooner, and two of everything.',
    temperament: { ...RABBLE, chargeEvery: 3, tithes: 1, counterRead: 0.3, weapon: 'trebuchet' },
    boasts: ['Harrow and Harrow ride as one!', 'Two brothers, one glorious host!'],
    glosses: ['Both Harrows, and neither one sober.', 'Twice the rabble, half the sense.'],
  },
  {
    rung: 4,
    name: 'the Usurper',
    keep: 'the Stolen Throne',
    tell: 'Reads every horn. Take his keep and the Causeway is ours.',
    temperament: {
      ...WATCH,
      tithes: 3,
      siegeShare: 0.3,
      profile: [
        { from: 0, spend: 0.7 },
        { from: 150, spend: 1 },
      ],
    },
    boasts: ['The rightful king commands it!', 'Kneel, Fairhold, before your true king!'],
    glosses: ['The pretender sends his hirelings.', 'A stolen crown, and borrowed men to keep it.'],
  },
];

/** Fairhold's own herald, at its horn. */
export const OUR_HERALD = [
  "Fairhold's yeomen march for hearth and harvest!",
  'For Fairhold and the Homeward Road!',
  'The horn! The bailey empties onto the Causeway.',
];

/** Past the ending the ladder keeps climbing on the last lord's temperament. */
export function lordAt(rung: number): LordDef {
  if (rung < LORDS.length) return LORDS[rung]!;
  const last = LORDS[LORDS.length - 1]!;
  return {
    ...last,
    rung,
    name: `the Usurper's heir (the ${ordinal(rung - LORDS.length + 1)})`,
    tell: "The Usurper's heirs keep coming, each a little less legitimate.",
  };
}

function ordinal(n: number): string {
  const words = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'];
  return words[n - 1] ?? `${n}th`;
}

/** The heralds on the battle's other events. `{name}` is a champion's; `{lord}` the lord's. */
export const EVENT_HERALDS = {
  champion: {
    cry: ['Make way for {name}!', '{name} rides for {lord}!'],
    gloss: ['{name}. Large, loud, and coming this way.', 'Here comes {name}, at last.'],
  },
  ourWeapon: {
    trebuchet: ['Loose the trebuchet!', 'A stone for the front rank!'],
    firepots: ['Pitch and fire on their engine!', 'Burn it! Burn the engine!'],
  },
  theirWeapon: {
    trebuchet: ['Rocks from {lord}’s walls!', 'Their trebuchet speaks.'],
    firepots: ['Fire-pots from {lord}’s walls, on our engine!', 'They have burned an engine.'],
  },
  ourEarly: ['The horn, early! Out, out!', 'Sound it now. Now!'],
  theirEarly: ['Their horn, early. Someone is impatient.', '{lord} sounds early.'],
};
