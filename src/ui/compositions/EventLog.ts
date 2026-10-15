import type { EventLine } from '@/modules/event-log';

export type { EventLine };

/** Which end of the log is drawn first. */
export type EventLogOrder = 'newest-first' | 'chronological';
