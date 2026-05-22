import { computed, type ComputedRef } from 'vue';
import { Decimal, type DecimalSource } from '@open-loop/engine';
import { getResources, getWorkshop } from '../../modules';
import { DEFAULT_INTERLOCKER_DATA } from '../../data';
import type { CraftId, CraftInput, CraftSpec, ResourceId } from '../../data/types';

export interface CraftInputLine {
  resource: ResourceId;
  resourceName: string;
  amount: DecimalSource;
  have: ComputedRef<DecimalSource>;
  satisfied: ComputedRef<boolean>;
}

export interface CraftOutputLine {
  resource: ResourceId;
  resourceName: string;
  /** Live magnitude — includes workshop's craftOutputChain multiplier. */
  amount: ComputedRef<DecimalSource>;
}

export interface CraftRow {
  id: CraftId;
  name: string;
  def: CraftSpec;
  visible: ComputedRef<boolean>;
  canCraft: ComputedRef<boolean>;
  inputs: CraftInputLine[];
  output: CraftOutputLine;
  craft(): void;
}

export function useCrafts(): CraftRow[] {
  const workshop = getWorkshop();
  const resources = getResources();
  const data = DEFAULT_INTERLOCKER_DATA;
  const nameById = new Map(data.resources.map((r) => [r.id, r.name]));

  return data.crafts.map<CraftRow>((def) => {
    const visible = computed(() => workshop.isVisible(def.id));

    const inputs = def.inputs.map((input) => buildInputLine(input, resources, nameById));

    const canCraft = computed(() => {
      if (!visible.value) return false;
      return inputs.every((line) => line.satisfied.value);
    });

    const output: CraftOutputLine = {
      resource: def.outputResource,
      resourceName: nameById.get(def.outputResource) ?? def.outputResource,
      amount: computed<DecimalSource>(() => workshop.craftOutputChain.apply(def.outputAmount)),
    };

    return {
      id: def.id,
      name: def.name,
      def,
      visible,
      canCraft,
      inputs,
      output,
      craft() {
        if (!canCraft.value) return;
        workshop.triggerCraft(def.id);
      },
    };
  });
}

function buildInputLine(
  input: CraftInput,
  resources: ReturnType<typeof getResources>,
  nameById: Map<string, string>,
): CraftInputLine {
  const have = computed<DecimalSource>(() => resources.resources[input.resource].value);
  const satisfied = computed(() => Decimal.gte(have.value, input.amount));
  return {
    resource: input.resource,
    resourceName: nameById.get(input.resource) ?? input.resource,
    amount: input.amount,
    have,
    satisfied,
  };
}
