import { computed, type ComputedRef } from 'vue';
import { Decimal, type DecimalSource, type Producer } from '@open-loop/engine';
import type { ProducerRowData } from '@/ui/compositions';
import type { ProbeClassDef } from '../data/types';
import { getClasses, getHeadlineRate } from '../modules';

/**
 * The ladder, adapted to the `ProducerRowData` contract.
 *
 * Per-row payload rides `ProducerRowData.extra` — the composition's first
 * extension seam (`.claude/CLAUDE.md` § src/ui/compositions). The flat
 * contract deliberately holds no engine handles, so the `#row` slot reads them
 * back from here typed, rather than the contract growing a `rateChain` field
 * that every other consumer would then inherit.
 */
export interface ClassRowExtra {
  def: ProbeClassDef;
  producer: Producer;
  /** 1-based position on the ladder. The drawing's item number. */
  tier: number;
}

export type ClassRow = ProducerRowData<ClassRowExtra>;

export interface ClassLadderView {
  rows: ComputedRef<ClassRow[]>;
  /** Units owned across every class — the reveal gate and the log's index. */
  fleetSize: ComputedRef<DecimalSource>;
  headlineRate: ComputedRef<DecimalSource>;
}

export function useClassRows(): ClassLadderView {
  const classes = getClasses();
  const entries = classes.getAll();

  const fleetSize = computed<DecimalSource>(() =>
    entries.reduce<DecimalSource>(
      (total, entry) => Decimal.add(total, entry.producer.ownedCount.value),
      0,
    ),
  );

  const headlineRate = computed(() => getHeadlineRate());

  const rows = computed<ClassRow[]>(() =>
    entries.map((entry, index) => {
      const producer = entry.producer;
      const repeatable = producer.repeatable!;

      // `countToPurchase` floors at 1 even when nothing is affordable, so the
      // zero case has to come from `canPurchase`. Reading the engine's own
      // bulk math rather than re-inverting the cost curve here is what keeps
      // `maxAffordable` honest when a tunable moves a base cost.
      const maxAffordable = computed<DecimalSource>(() =>
        repeatable.canPurchase.value ? repeatable.countToPurchase.value : 0,
      );

      return {
        id: entry.def.id,
        displayName: entry.def.name,
        count: producer.ownedCount,
        displayRate: computed(() =>
          Decimal.mul(producer.computedRate.value, producer.ownedCount.value),
        ),
        cost: (count) => repeatable.getCost(count),
        canBuy: (count) => repeatable.canPurchase.value && Decimal.gte(maxAffordable.value, count),
        maxAffordable,
        buy: (count) => {
          repeatable.purchase(count);
        },
        // Reveal is one-way: a class stays listed once owned, even if the
        // fleet later dips below its threshold. Nothing removes probes today,
        // but a fork that adds attrition should not have rows vanish out from
        // under the player.
        unlocked: computed(
          () =>
            entry.def.revealAtFleetSize === undefined ||
            Decimal.gte(fleetSize.value, entry.def.revealAtFleetSize) ||
            Decimal.gte(producer.ownedCount.value, 1),
        ),
        extra: { def: entry.def, producer, tier: index + 1 },
      };
    }),
  );

  return { rows, fleetSize, headlineRate };
}
