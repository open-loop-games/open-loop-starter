import {
  Decimal,
  formatSmall,
  type DecimalSource,
  type Modifier,
  type ModifierDescription,
} from '@open-loop/engine';

/** Options for {@link createModifierSection} */
export interface ModifierSectionOptions {
  /** Header title (e.g., "Point Production", "Prestige Gain") */
  title: string;
  /** Optional subtitle shown after the title */
  subtitle?: string;
  /** The modifier (or sequential modifier) to break down. Rows are emitted from `description`; modifiers without one contribute to the total but produce no breakdown line. */
  modifier: Modifier;
  /** Starting value before any modifiers are applied. Default: `1` */
  base?: DecimalSource;
  /** Unit suffix for formatted values (e.g., `"/s"`, `"%"`) */
  unit?: string;
  /** Label for the base row. Default: `"Base"` */
  baseText?: string;
  /** If true, a total > base is flagged as bad (for costs or penalties) */
  smallerIsBetter?: boolean;
}

/** The computed breakdown from {@link createModifierSection}, ready for rendering */
export interface ModifierSectionResult {
  title: string;
  subtitle?: string;
  base: { text: string; value: string };
  modifiers: ModifierDescription[];
  total: { value: string; isBad: boolean };
  unit?: string;
}

/**
 * Create a displayable breakdown of a modifier's effects.
 * Useful for showing tooltips or info panels explaining how a value is calculated.
 *
 * Lives consumer-side (not in `@open-loop/engine`) because its output is
 * UI-row-shaped — engine stays headless.
 */
export function createModifierSection(
  options: ModifierSectionOptions,
): () => ModifierSectionResult {
  const { title, subtitle, modifier, base = 1, unit, baseText = 'Base', smallerIsBetter } = options;

  return () => {
    const total = modifier.apply(base);
    const desc = modifier.description;
    let modifierDescs: ModifierDescription[] = [];
    if (desc) {
      const resolved = typeof desc === 'function' ? desc() : desc;
      modifierDescs = Array.isArray(resolved) ? resolved : [resolved];
    }

    return {
      title,
      subtitle,
      base: {
        text: baseText,
        value: formatSmall(base) + (unit ?? ''),
      },
      modifiers: modifierDescs,
      total: {
        value: formatSmall(total) + (unit ?? ''),
        isBad: smallerIsBetter ? Decimal.gt(total, base) : Decimal.lt(total, base),
      },
      unit,
    };
  };
}
