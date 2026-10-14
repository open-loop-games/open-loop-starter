// ─── Skeleton ───
// What exists in the Imperial Aeroworks and how it is named: the stocks, the estate's
// buildings, the Académie's patents, the four trades and the Emperor's charters. Pure
// data with no engine refs; every number comes from `./spine.ts`.

import {
  BUILDING_COST,
  CHARTER_COST,
  CITE_GROWTH,
  COST_GROWTH,
  RESEARCH_COST,
  WAREHOUSE_GROWTH,
  type Cost,
  type ResourceId,
  type RoleId,
} from './spine';

export interface ResourceDef {
  id: ResourceId;
  name: string;
  /** Ledger group: raw stock, worked stock, or the finished aeroplane. */
  stage: 'raw' | 'worked' | 'finished';
  /** Stock at the start of each run. */
  start: number;
}

export const RESOURCES: ResourceDef[] = [
  { id: 'bread', name: 'Bread', stage: 'raw', start: 30 },
  { id: 'spruce', name: 'Spruce', stage: 'raw', start: 0 },
  { id: 'bauxite', name: 'Bauxite', stage: 'raw', start: 0 },
  { id: 'coal', name: 'Coal', stage: 'raw', start: 0 },
  { id: 'spars', name: 'Spars', stage: 'worked', start: 0 },
  { id: 'aluminium', name: 'Aluminium', stage: 'worked', start: 0 },
  { id: 'engines', name: 'Engines', stage: 'worked', start: 0 },
  { id: 'aeroplanes', name: 'Aeroplanes', stage: 'finished', start: 0 },
];

export type BuildingId = keyof typeof BUILDING_COST;

export interface BuildingDef {
  id: BuildingId;
  name: string;
  blurb: string;
  cost: Cost;
  growth: number;
  /** The patent that opens it; absent means open from the start. */
  opensWith?: ResearchId;
  /** The raw stock it yields, for producer buildings. */
  yields?: ResourceId;
  /** Owned at the start of each run. */
  start: number;
}

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'yard',
    name: 'Timber Yard',
    blurb: 'Vosges spruce, seasoned and stacked.',
    cost: BUILDING_COST.yard,
    growth: COST_GROWTH,
    yields: 'spruce',
    start: 1,
  },
  {
    id: 'farm',
    name: 'Market Garden',
    blurb: 'Feeds the works. Four mouths a garden.',
    cost: BUILDING_COST.farm,
    growth: COST_GROWTH,
    yields: 'bread',
    start: 1,
  },
  {
    id: 'mine',
    name: 'Bauxite Pit',
    blurb: 'Red earth from Les Baux, by the cartload.',
    cost: BUILDING_COST.mine,
    growth: COST_GROWTH,
    yields: 'bauxite',
    opensWith: 'concession',
    start: 0,
  },
  {
    id: 'pit',
    name: 'Coal Drift',
    blurb: 'Saint-Étienne coal for furnace and boiler.',
    cost: BUILDING_COST.pit,
    growth: COST_GROWTH,
    yields: 'coal',
    opensWith: 'concession',
    start: 0,
  },
  {
    id: 'warehouse',
    name: 'Bonded Warehouse',
    blurb: 'Every bin holds half again its base.',
    cost: BUILDING_COST.warehouse,
    growth: WAREHOUSE_GROWTH,
    opensWith: 'bonded',
    start: 0,
  },
  {
    id: 'cite',
    name: 'Cité Ouvrière',
    blurb: 'Lodging for two more compagnons.',
    cost: BUILDING_COST.cite,
    growth: CITE_GROWTH,
    opensWith: 'cites',
    start: 0,
  },
];

export type ResearchId = keyof typeof RESEARCH_COST;

export interface ResearchDef {
  id: ResearchId;
  name: string;
  year: number;
  blurb: string;
  cost: Cost;
  /** Prerequisite edges: every named patent must already be held. */
  requires: ResearchId[];
}

export const RESEARCH: ResearchDef[] = [
  {
    id: 'sawpit',
    name: 'Sawpit Guild',
    year: 1856,
    blurb: 'Opens the sawyers: spruce into spars.',
    cost: RESEARCH_COST.sawpit,
    requires: [],
  },
  {
    id: 'concession',
    name: 'Les Baux Concession',
    year: 1857,
    blurb: 'Opens bauxite pits and coal drifts.',
    cost: RESEARCH_COST.concession,
    requires: ['sawpit'],
  },
  {
    id: 'cites',
    name: 'Cités Ouvrières',
    year: 1857,
    blurb: 'Opens worker housing.',
    cost: RESEARCH_COST.cites,
    requires: ['sawpit'],
  },
  {
    id: 'bonded',
    name: 'Bonded Warehousing',
    year: 1858,
    blurb: 'Opens warehouses that widen every bin.',
    cost: RESEARCH_COST.bonded,
    requires: ['sawpit'],
  },
  {
    id: 'hall',
    name: 'Deville Reduction',
    year: 1859,
    blurb: 'Opens the smelters: bauxite and coal into aluminium.',
    cost: RESEARCH_COST.hall,
    requires: ['concession'],
  },
  {
    id: 'coking',
    name: 'Coking Ovens',
    year: 1860,
    blurb: 'Coal drifts yield half again.',
    cost: RESEARCH_COST.coking,
    requires: ['concession'],
  },
  {
    id: 'steam',
    name: 'Light Steam Engine',
    year: 1861,
    blurb: 'Opens the machinists: aluminium and coal into engines.',
    cost: RESEARCH_COST.steam,
    requires: ['hall'],
  },
  {
    id: 'rolling',
    name: 'Sheet Rolling Mill',
    year: 1861,
    blurb: 'Smelters work half again as fast.',
    cost: RESEARCH_COST.rolling,
    requires: ['hall', 'bonded'],
  },
  {
    id: 'monoplane',
    name: 'Monoplane Rigging',
    year: 1862,
    blurb: 'Opens the riggers: spars, aluminium and an engine into an aeroplane.',
    cost: RESEARCH_COST.monoplane,
    requires: ['steam', 'bonded'],
  },
];

export interface RoleDef {
  id: RoleId;
  name: string;
  workshop: string;
  opensWith: ResearchId;
}

export const ROLES: RoleDef[] = [
  { id: 'sawyer', name: 'Sawyers', workshop: 'Sawpit', opensWith: 'sawpit' },
  { id: 'smelter', name: 'Smelters', workshop: 'Reduction Furnace', opensWith: 'hall' },
  { id: 'machinist', name: 'Machinists', workshop: 'Engine Shop', opensWith: 'steam' },
  { id: 'rigger', name: 'Riggers', workshop: 'Rigging Hall', opensWith: 'monoplane' },
];

export type CharterId = keyof typeof CHARTER_COST;

export interface CharterDef {
  id: CharterId;
  name: string;
  blurb: string;
  cost: number;
}

export const CHARTERS: CharterDef[] = [
  {
    id: 'patronage',
    name: 'Imperial Patronage',
    blurb: 'Every run begins with two more compagnons.',
    cost: CHARTER_COST.patronage,
  },
  {
    id: 'patents',
    name: 'Patent Pool',
    blurb: 'The four founding patents survive each Exposition.',
    cost: CHARTER_COST.patents,
  },
  {
    id: 'credit',
    name: 'Crédit Mobilier',
    blurb: 'Every bin holds half again as much.',
    cost: CHARTER_COST.credit,
  },
  {
    id: 'ecole',
    name: 'École Centrale',
    blurb: 'Every workshop runs a quarter faster.',
    cost: CHARTER_COST.ecole,
  },
];

/** The patents the Patent Pool keeps across an Exposition. */
export const PATENT_POOL: ResearchId[] = ['sawpit', 'concession', 'cites', 'bonded'];
