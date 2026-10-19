/**
 * The player's lieutenants: one per automation tier, each running one scope of
 * the shared policy once hired. Hires last the match.
 */
import { lieutenantCost } from './spine';

export type CrewTier = 'none' | 'fixer' | 'quartermaster' | 'tactician';
export type PolicyScope = 'econ' | 'build' | 'command';

export interface LieutenantDef {
  id: Exclude<CrewTier, 'none'>;
  name: string;
  /** What the lieutenant does once hired, for the crew panel. */
  does: string;
  /** The policy scope the lieutenant runs. */
  scope: PolicyScope;
  /** Scrip, from `lieutenantCost`. */
  cost: number;
}

// ─── Skeleton ───
export const LIEUTENANTS: LieutenantDef[] = [
  {
    id: 'fixer',
    name: 'Moth, your fixer',
    does: 'hires hustlers, sinks ley taps, rents squats; never spends what your next training floor costs',
    scope: 'econ',
    cost: lieutenantCost[0]!,
  },
  {
    id: 'quartermaster',
    name: 'Old Brass, quartermaster',
    does: 'builds training floors, buys research, runs the training switches',
    scope: 'build',
    cost: lieutenantCost[1]!,
  },
  {
    id: 'tactician',
    name: 'Saint Ivo, tactician',
    does: 'deploys, focuses fire, pulls back and calls assaults',
    scope: 'command',
    cost: lieutenantCost[2]!,
  },
];
