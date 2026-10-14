/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def'],
  title: 'Scripter — domain language',
  description:
    'Inkfist Dojo: an old master writes kata that a student performs line by line, over a student ladder; challengers at the gate each beat the scroll in hand until the technique that answers them is learned, and graduation banks Insight.',
  curated: [
    {
      term: 'kata',
      note: 'The scroll the sensei writes: one move per line, read top to bottom and round again. The draft is what is typed; the inked scroll is what the student performs.',
    },
    {
      term: 'beat',
      note: 'One step of the student: a line performs its move, the move resolves, then the scroll advances. A failing `if` is passed over without spending one; a failing `when` holds through them.',
    },
    {
      term: 'technique',
      note: 'A purchase that teaches the scroll words. A challenger’s arrival puts its answering technique on the shelf; the rest arrive with the dojo’s growth.',
    },
    {
      term: 'challenger',
      note: 'A visitor at the gate with a pattern the scroll must read. Arrives once all-time Ki passes its gate; once beaten, returns in rotation. A bout cannot be refused.',
    },
    {
      term: 'bout',
      note: 'The beats the student spends against a challenger, until it falls or the incense burns out. A win pays a bounty against the reference scroll’s pace, its par.',
    },
    {
      term: 'par',
      note: 'The median beats the reference scroll takes against a challenger, measured over seeded bouts. The bounty is paid against it.',
    },
    {
      term: 'standing',
      note: 'All Ki × a factor for each challenger the dojo has ever beaten.',
    },
    {
      term: 'training strike',
      note: 'A blow outside a bout: banks (strike seconds + Temper) seconds of the students’ income. Most of the dojo’s Ki.',
    },
    {
      term: 'rack',
      note: 'Saved scrolls, inked in one move. Dispatch by hand until `foe is` blocks let one scroll tell challengers apart.',
    },
    {
      term: 'graduation',
      note: 'The prestige reset: the dojo resets and Insight banks, a square root of Ki earned this run. The scroll, the rack, the gate’s record and the executor tier survive.',
    },
    {
      term: 'executor tier',
      note: 'The student’s hand: each tier performs a beat a quarter faster and holds two more moves on a scroll.',
    },
  ],
};
