import { Decimal, addResource, type DecimalSource, type Resource } from '@open-loop/engine';

/**
 * One draw: takes up to `inputAmount` from `input`, partial at whatever it
 * still holds, and credits `output` at `outputPerInput`. Returns what was
 * drawn. A verb's act; a rate that draws every tick is a producer with `inputs`.
 */
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
