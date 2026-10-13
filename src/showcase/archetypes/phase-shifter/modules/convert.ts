import { Decimal, addResource, type DecimalSource, type Resource } from '@open-loop/engine';

/**
 * Continuous conversion: draws up to `inputAmount` from `input` this tick,
 * partial-filled at whatever it still holds, and credits `output` at
 * `outputPerInput`. Returns what was drawn.
 */
// TODO(expansion): continuous converter producer — a ProducerMapping with an input draw
// (rate × count from `input`, partial fill at what it holds). createProducerCategory takes
// one output and no input; createConversion is a discrete atomic call, not a rate.
export function drawConvert(
  input: Resource,
  output: Resource,
  inputAmount: DecimalSource,
  outputPerInput: DecimalSource,
): Decimal {
  const drawn = Decimal.min(input.value, inputAmount);
  if (!drawn.gt(0)) return Decimal.dZero;
  input.value = Decimal.sub(input.value, drawn);
  addResource(output, drawn.mul(outputPerInput));
  return drawn;
}
