// Type-aware rule: flags raw `<` / `>` / `<=` / `>=` on Decimal-typed values.
// Past 1e308 both sides saturate to JS Infinity and the comparison silently
// returns false. Use `Decimal.lt/gt/lte/gte` (static) or instance `.lt/.gt/.lte/.gte`.
// See AUDITING § 17 + cookbook G-S15 for the full rule context.

import { ESLintUtils } from '@typescript-eslint/utils';

const RELATIONAL_OPERATORS = new Set(['<', '>', '<=', '>=']);

const createRule = ESLintUtils.RuleCreator.withoutDocs;

function symbolDeclaresClassNamed(symbol, name) {
  if (!symbol) return false;
  if (symbol.valueDeclaration?.name?.escapedText === name) return true;
  if (Array.isArray(symbol.declarations)) {
    for (const decl of symbol.declarations) {
      if (decl?.name?.escapedText === name) return true;
    }
  }
  return false;
}

function isDecimalType(type) {
  if (!type) return false;
  // Type alias — engine's `type Decimal = OrigDecimal` and `type DecimalSource = ...`.
  const aliasName = type.aliasSymbol?.escapedName;
  if (aliasName === 'Decimal' || aliasName === 'DecimalSource') return true;
  // Class symbol — break_eternity exports the class via `export default`,
  // which gives the symbol escapedName === 'default'. Look at the value
  // declaration's class-name identifier instead of the symbol's local name.
  if (symbolDeclaresClassNamed(type.symbol, 'Decimal')) return true;
  if (typeof type.isUnion === 'function' && type.isUnion()) {
    return type.types.some(isDecimalType);
  }
  if (typeof type.isIntersection === 'function' && type.isIntersection()) {
    return type.types.some(isDecimalType);
  }
  return false;
}

export default createRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw relational operators on Decimal-typed values; use Decimal.lt/gt/lte/gte instead',
    },
    schema: [],
    messages: {
      saturationHazard:
        'Raw `{{operator}}` on Decimal-typed value silently returns false past 1e308 (both sides saturate to Infinity). Use `Decimal.{{replacement}}` or `.{{replacement}}()` instead.',
    },
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);

    return {
      BinaryExpression(node) {
        if (!RELATIONAL_OPERATORS.has(node.operator)) return;
        const leftType = services.getTypeAtLocation(node.left);
        const rightType = services.getTypeAtLocation(node.right);
        if (!isDecimalType(leftType) && !isDecimalType(rightType)) return;
        const replacement = { '<': 'lt', '>': 'gt', '<=': 'lte', '>=': 'gte' }[node.operator];
        context.report({
          node,
          messageId: 'saturationHazard',
          data: { operator: node.operator, replacement },
        });
      },
    };
  },
});
