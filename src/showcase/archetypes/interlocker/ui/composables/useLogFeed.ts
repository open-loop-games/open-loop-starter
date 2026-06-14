import { onUnmounted, watch } from 'vue';
import { getBuildings, getCalendar, getResources, getSciences, getVillage } from '../../modules';
import { DEFAULT_INTERLOCKER_DATA } from '../../data';
import { useGameLog } from './useGameLog';

/**
 * Wire the colony's notable moments into the event log: science completions and
 * kitten deaths come from the modules' own push-event hooks; building
 * constructions and kitten births are diffed from their reactive counts
 * (buildings emit no purchase event, and population growth has no hook).
 *
 * Crafts are deliberately not logged — they fire often enough to swamp the
 * console; canon aggregates them, which is follow-up work.
 *
 * Call once from the in-game shell's setup (mounted post-start, so the modules
 * are installed). Subscriptions and watchers tear down on unmount.
 */
export function useLogFeed(): void {
  const { log, clear } = useGameLog();
  const sciences = getSciences();
  const village = getVillage();
  const buildings = getBuildings();
  const resources = getResources();
  const calendar = getCalendar();
  const data = DEFAULT_INTERLOCKER_DATA;

  const seasonName = new Map(data.seasons.map((s) => [s.id, s.name]));

  const buildingName = new Map(data.buildings.map((b) => [b.id, b.name]));
  const scienceName = new Map(data.sciences.map((s) => [s.id, s.name]));

  // Fresh console per game session (the store is a cross-mount singleton).
  clear();
  log('You are a kitten in a catnip forest.');

  const teardown: Array<() => void> = [];

  teardown.push(
    sciences.onScienceCompleted((e) =>
      log(`Researched ${scienceName.get(e.scienceId) ?? e.scienceId}.`, 'good'),
    ),
  );
  teardown.push(village.onKittenDied(() => log('A kitten has starved to death.', 'bad')));

  teardown.push(
    calendar.onSeasonChanged((e) => {
      const name = seasonName.get(e.seasonId) ?? e.seasonId;
      log(e.seasonId === 'spring' ? `Year ${e.year + 1} — ${name} has come.` : `${name} has come.`);
    }),
  );

  teardown.push(
    watch(
      () => data.buildings.map((b) => buildings.buildingCount(b.id)),
      (next, prev) => {
        next.forEach((count, i) => {
          if (prev && count > prev[i]) {
            const def = data.buildings[i];
            log(`${buildingName.get(def.id) ?? def.id} built.`);
          }
        });
      },
    ),
  );

  teardown.push(
    watch(
      () => Number(resources.resources.kittens.value),
      (next, prev) => {
        if (prev != null && next > prev) log('A new kitten has been born.', 'good');
      },
    ),
  );

  onUnmounted(() => teardown.forEach((stop) => stop()));
}
