import type { Ref } from 'vue';
import type { DecimalSource } from '@open-loop/engine';

export type ResourceHighlight = 'normal' | 'deficit' | 'surplus';

export interface ResourceReadout {
  id: string;
  label: string;
  value: Ref<DecimalSource>;
  rate?: Ref<DecimalSource>;
  /** Storage cap. When present the readout renders as `value / cap`. */
  cap?: Ref<DecimalSource>;
  hidden?: Ref<boolean>;
  highlight?: Ref<ResourceHighlight>;
}
