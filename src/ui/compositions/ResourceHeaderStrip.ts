import type { Ref } from 'vue';
import type { DecimalSource } from '@open-loop/engine';

export type ResourceHighlight = 'normal' | 'deficit' | 'surplus';

export interface ResourceReadout {
  id: string;
  label: string;
  value: Ref<DecimalSource>;
  rate?: Ref<DecimalSource>;
  /** Storage capacity. When present the readout shows `value / capacity`. */
  capacity?: Ref<DecimalSource>;
  /** Default true; a false readout is left out, with no placeholder. */
  visible?: Ref<boolean>;
  highlight?: Ref<ResourceHighlight>;
}
