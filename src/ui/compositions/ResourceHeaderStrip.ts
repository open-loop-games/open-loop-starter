import type { Ref } from 'vue';
import type { DecimalSource } from '@open-loop/engine';

export type ResourceHighlight = 'normal' | 'deficit' | 'surplus';

export interface ResourceReadout {
  id: string;
  label: string;
  /** An engine `Resource` is a ref: pass it as it is. */
  value: Ref<DecimalSource>;
  rate?: Ref<DecimalSource>;
  /** Storage capacity. When present the readout shows `value / capacity`. */
  capacity?: Ref<DecimalSource>;
  /** Default true; a false readout is left out, with no placeholder. */
  visible?: Ref<boolean>;
  highlight?: Ref<ResourceHighlight>;
  /** Writes the value and the capacity. Default: whole numbers in the engine notation. */
  format?: (value: DecimalSource) => string;
}
