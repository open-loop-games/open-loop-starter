/**
 * Steering spec: the route is descended, not sampled, and the score and the choice are one
 * policy. Pure over an arena state. No magnitudes.
 */

import { describe, expect, it } from 'vitest';
import { STARS } from '../../data';
import { createArena, WORLD_HALF, type ArenaMods } from './arena';
import {
  NAV_CELL,
  REEL_ROUTE_WEIGHT,
  buildNav,
  chooseHeading,
  computeFields,
  descendRoute,
  scoreHeadings,
  toCell,
} from './steering';

const mods: ArenaMods = { damage: 1, fireRate: 1, moveSpeed: 1, pickup: 1, maxHp: 100, contact: 1 };
const instinct = STARS[0]!.instinct;
const nav = buildNav();
const arena = () => createArena({ rng: () => 0.5, rating: 0, startRig: 'prop-pistol', maxHp: 100 });
const reel = (x: number, y: number) => ({ x, y, value: 1, gold: false, pulled: false });
const grunt = { id: 'grunt', hpFactor: 1, speed: 62, weight: 1, fromScene: 0, radius: 11 } as const;

describe('survivor/steering — the reel route is descended', () => {
  it('descends all the way to the reel it routes to', () => {
    const a = arena();
    a.reels.push(reel(5 * NAV_CELL, 0));
    const route = descendRoute(computeFields(a, nav).reels, nav, toCell(a.player, nav), 20);
    expect(route.at(-1)).toEqual(toCell(a.reels[0]!, nav));
  });

  it('routes around a crowded cell when a clear route is no longer', () => {
    const a = arena();
    a.reels.push(reel(3 * NAV_CELL, 0));
    for (let i = 0; i < 6; i++)
      a.extras.push({
        id: i,
        kind: grunt,
        x: 1.5 * NAV_CELL,
        y: 0,
        hp: 1,
        maxHp: 1,
        orbitCd: 0,
        flash: 0,
      });
    const route = descendRoute(computeFields(a, nav).reels, nav, toCell(a.player, nav), 20);
    const crowded = toCell({ x: 1.5 * NAV_CELL, y: 0 }, nav);
    expect(route.some((c) => c.x === crowded.x && c.y === crowded.y)).toBe(false);
  });

  it('has no route when there is nothing to collect', () => {
    const a = arena();
    expect(descendRoute(computeFields(a, nav).reels, nav, toCell(a.player, nav), 20)).toEqual([]);
  });
});

describe('survivor/steering — the score and the choice are one policy', () => {
  const floor = () => {
    const a = arena();
    a.reels.push(reel(-250, 80));
    a.extras.push({ id: 1, kind: grunt, x: 200, y: 30, hp: 1e6, maxHp: 1e6, orbitCd: 0, flash: 0 });
    return a;
  };

  it('picks the candidate the breakdown scores highest', () => {
    const a = floor();
    const fields = computeFields(a, nav);
    const scores = scoreHeadings(a, mods, instinct, nav, fields);
    const best = scores.reduce((x, y) => (y.total > x.total ? y : x));
    expect(chooseHeading(a, mods, instinct, nav, fields)).toEqual(best.heading);
  });

  it('sums each breakdown back to its total', () => {
    const a = floor();
    for (const s of scoreHeadings(a, mods, instinct, nav, computeFields(a, nav))) {
      const sum =
        s.threat +
        s.engage +
        s.connect +
        instinct.eta * (REEL_ROUTE_WEIGHT * s.route + s.near) +
        s.wall +
        s.turn;
      expect(sum).toBeCloseTo(s.total, 9);
    }
  });

  it('scores only headings that stay on the floor', () => {
    const a = arena();
    a.player.x = WORLD_HALF - 10;
    const scores = scoreHeadings(a, mods, instinct, nav, computeFields(a, nav));
    expect(scores.length).toBeLessThan(16);
    expect(scores.every((s) => s.heading.x <= 0.1)).toBe(true);
  });
});
