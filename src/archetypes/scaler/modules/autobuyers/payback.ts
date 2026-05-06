import { Decimal, type DecimalSource } from 'open-loop-engine';

// Closed-form optimal-stopping payback for log-prestige conversions, per
// methodology/techniques/closed-form-progression/bifurcations.md § 6.1
// + prestige-compression.md § 4.1. Maps onto BALANCING.md § Theme 3 #5:
//
//   paybackSeconds = cost / (currentRate × (multiplier − 1))
//
// For a prestige conversion where the headline currency zeroes on reset,
// 'cost' folds out: `cost = currentCoin`, `currentRate ≈ currentCoin /
// cycleElapsedSec` (currency accumulated from 0 over this cycle),
// `multiplier = (existingCurrency + currentGain) / max(existingCurrency, 1)`
// (ratio-policy threshold; Synergism resettoggle1 mode 1 + AD X_HIGHEST
// canonical shape — both express the same ratio-policy stopping rule
// against a log-prestige formula). Substituting:
//
//   paybackSeconds ≈ cycleElapsedSec / (gainRatio − 1)
//
// The post-prestige rate ratio's actual realization (Crystal-upgrade
// rebuild trajectory, antimatter rate restart) is folded into the
// gainRatio approximation: each unit of gained currency ultimately scales
// the headline rate via the layered upgrade ladder under the autobuyer's
// fixed strategy ("buy everything affordable"), and over many cycles the
// per-unit scaling factor approaches a constant. The ratio-policy form is
// exact in the asymptotic regime and a closed-form upper bound elsewhere.
//
// Returns `Infinity` when the conversion would not improve the post-reset
// rate (gainRatio ≤ 1) or when cycle timing is degenerate (cycleElapsedSec
// ≤ 0). The autobuyer's threshold knob is finite, so Infinity reads as
// "never fire under this policy."
export function computeRatioPolicyPayback(
  currentGain: DecimalSource,
  existingCurrency: DecimalSource,
  cycleElapsedSec: number,
): number {
  if (cycleElapsedSec <= 0) return Infinity;
  const existing = Decimal.max(existingCurrency, 1);
  const gainRatio = Decimal.add(existing, currentGain).div(existing).toNumber();
  if (gainRatio <= 1) return Infinity;
  return cycleElapsedSec / (gainRatio - 1);
}
