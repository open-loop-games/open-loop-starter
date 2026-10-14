/** The two keeps on the causeway. Fairhold is the player's; the rival is the lord on the ladder. */
export type Side = 'player' | 'rival';
export const SIDES: Side[] = ['player', 'rival'];
export const other = (side: Side): Side => (side === 'player' ? 'rival' : 'player');
