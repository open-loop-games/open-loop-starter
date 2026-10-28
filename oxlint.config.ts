import { defineConfig } from 'oxlint';

/* eject:strip-start — renderer ban for the scaffold; removed by `pnpm eject` */
// A renderer is a story's choice: eject drops the ones a fork's game does not
// import, so a renderer the scaffold imported would reach every fork.
const RENDERERS = ['pixi.js', 'pixi.js/*', 'three', 'three/*'];
const RENDERER_MESSAGE =
  'The scaffold stays renderer-free. A story imports its renderer in its own field component.';
/* eject:strip-end */
// The rule set is the one the studio's engine consumers share. A fork inherits
// it, so it stays generic; game-specific rules belong in the fork's own config.
export default defineConfig({
  plugins: ['typescript', 'vue'],
  categories: {
    correctness: 'off',
  },
  env: { builtin: true, browser: true, node: true },
  ignorePatterns: ['dist/**', 'node_modules/**', 'coverage/**'],
  rules: {
    'constructor-super': 'error',
    'for-direction': 'error',
    'getter-return': 'error',
    'no-async-promise-executor': 'error',
    'no-case-declarations': 'error',
    'no-class-assign': 'error',
    'no-compare-neg-zero': 'error',
    'no-cond-assign': 'error',
    'no-const-assign': 'error',
    'no-constant-binary-expression': 'error',
    'no-constant-condition': 'error',
    'no-control-regex': 'error',
    'no-debugger': 'error',
    'no-delete-var': 'error',
    'no-dupe-class-members': 'error',
    'no-dupe-else-if': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-empty': 'error',
    'no-empty-character-class': 'error',
    'no-empty-pattern': 'error',
    'no-empty-static-block': 'error',
    'no-ex-assign': 'error',
    'no-extra-boolean-cast': 'error',
    'no-fallthrough': 'error',
    'no-func-assign': 'error',
    'no-global-assign': 'error',
    'no-import-assign': 'error',
    'no-invalid-regexp': 'error',
    'no-irregular-whitespace': 'error',
    'no-loss-of-precision': 'error',
    'no-misleading-character-class': 'error',
    'no-new-native-nonconstructor': 'error',
    'no-nonoctal-decimal-escape': 'error',
    'no-obj-calls': 'error',
    'no-prototype-builtins': 'error',
    'no-redeclare': 'error',
    'no-regex-spaces': 'error',
    'no-self-assign': 'error',
    'no-setter-return': 'error',
    'no-shadow-restricted-names': 'error',
    'no-sparse-arrays': 'error',
    'no-this-before-super': 'error',
    'no-unassigned-vars': 'error',
    'no-unexpected-multiline': 'error',
    'no-unreachable': 'error',
    'no-unsafe-finally': 'error',
    'no-unsafe-negation': 'error',
    'no-unsafe-optional-chaining': 'error',
    'no-unused-labels': 'error',
    'no-unused-private-class-members': 'error',
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
      },
    ],
    'no-useless-backreference': 'error',
    'no-useless-catch': 'error',
    'no-useless-escape': 'error',
    'no-with': 'error',
    'preserve-caught-error': 'error',
    'require-yield': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',
    'no-array-constructor': 'error',
    'no-unused-expressions': 'error',
    'vue/no-arrow-functions-in-watch': 'error',
    'vue/no-async-in-computed-properties': 'error',
    'vue/no-computed-properties-in-data': 'error',
    'vue/no-deprecated-data-object-declaration': 'error',
    'vue/no-deprecated-delete-set': 'error',
    'vue/no-deprecated-destroyed-lifecycle': 'error',
    'vue/no-deprecated-events-api': 'error',
    'vue/no-deprecated-model-definition': 'error',
    'vue/no-deprecated-props-default-this': 'error',
    'vue/no-deprecated-vue-config-keycodes': 'error',
    'vue/no-dupe-keys': 'error',
    'vue/no-export-in-script-setup': 'error',
    'vue/no-expose-after-await': 'error',
    'vue/no-lifecycle-after-await': 'error',
    'vue/no-reserved-component-names': 'error',
    'vue/no-reserved-keys': 'error',
    'vue/no-reserved-props': 'error',
    'vue/no-shared-component-data': 'error',
    'vue/no-side-effects-in-computed-properties': 'error',
    'vue/no-watch-after-await': 'error',
    'vue/prefer-import-from-vue': 'error',
    'vue/require-prop-type-constructor': 'error',
    'vue/require-render-return': 'error',
    'vue/require-slots-as-functions': 'error',
    'vue/return-in-computed-property': 'error',
    'vue/return-in-emits-validator': 'error',
    'vue/valid-define-emits': 'error',
    'vue/valid-define-options': 'error',
    'vue/valid-define-props': 'error',
    'vue/valid-next-tick': 'error',
    'vue/component-definition-name-casing': 'warn',
    'vue/prop-name-casing': 'warn',
    'vue/require-default-prop': 'warn',
    'vue/require-prop-types': 'warn',
    'vue/no-multiple-slot-args': 'warn',
    'vue/no-required-prop-with-default': 'warn',
    'typescript/ban-ts-comment': 'error',
    'typescript/no-duplicate-enum-values': 'error',
    'typescript/no-empty-object-type': 'error',
    'typescript/no-explicit-any': 'warn',
    'typescript/no-extra-non-null-assertion': 'error',
    'typescript/no-misused-new': 'error',
    'typescript/no-namespace': 'error',
    'typescript/no-non-null-asserted-optional-chain': 'error',
    'typescript/no-require-imports': 'error',
    'typescript/no-this-alias': 'error',
    'typescript/no-unnecessary-type-constraint': 'error',
    'typescript/no-unsafe-declaration-merging': 'error',
    'typescript/no-unsafe-function-type': 'error',
    'typescript/no-wrapper-object-types': 'error',
    'typescript/prefer-as-const': 'error',
    'typescript/prefer-namespace-keyword': 'error',
    'typescript/triple-slash-reference': 'error',
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
      rules: {
        'constructor-super': 'off',
        'getter-return': 'off',
        'no-class-assign': 'off',
        'no-const-assign': 'off',
        'no-dupe-class-members': 'off',
        'no-dupe-keys': 'off',
        'no-func-assign': 'off',
        'no-import-assign': 'off',
        'no-new-native-nonconstructor': 'off',
        'no-obj-calls': 'off',
        'no-redeclare': 'off',
        'no-setter-return': 'off',
        'no-this-before-super': 'off',
        'no-unreachable': 'off',
        'no-unsafe-negation': 'off',
        'no-var': 'error',
        'no-with': 'off',
        'prefer-const': 'error',
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
      },
    },
    // Layering: `src/lib/` is the presentational layout/theme layer and never
    // imports the engine — `src/ui/` owns engine bridging. Keeps the scaffold's
    // shells/frame/modal reusable by a fork that swaps or drops the engine.
    //
    // Keep every import ban for a path in one block: a later override REPLACES
    // `no-restricted-imports` for the files it matches, so bans split across
    // two blocks silently disable whichever loses.
    {
      files: ['src/lib/**/*.{ts,vue}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@open-loop/engine', '@open-loop/engine/*'],
                message:
                  'src/lib/ is presentational — no engine imports. Engine-aware code belongs in src/ui/.',
              },
              /* eject:strip-start */
              {
                group: ['@/showcase', '@/showcase/*', '@/showcase/**'],
                message:
                  'Scaffold must not import the showcase (demo) surface — it is deleted on `pnpm eject`.',
              },
              {
                group: RENDERERS,
                message: RENDERER_MESSAGE,
              },
              /* eject:strip-end */
            ],
          },
        ],
      },
    },
    /* eject:strip-start — showcase-boundary guard; the boundary is gone post-eject, removed by `pnpm eject` */
    // Layering: the scaffold never imports the demo/showcase surface. The cut is
    // one-way — `pnpm eject` deletes `src/showcase/`, so any scaffold-side import
    // reaching into it would break the ejected game. Shared code belongs in the
    // scaffold (src/ui, src/composables, …), not behind the strip boundary.
    // main.ts (the entry, rewritten on eject) and tests are intentionally exempt.
    {
      files: [
        // src/lib/** is covered by its own block above (which carries this same
        // showcase ban alongside its engine ban).
        'src/ui/**/*.{ts,vue}',
        'src/composables/**/*.{ts,vue}',
        'src/modules/**/*.{ts,vue}',
        'src/balance/**/*.{ts,vue}',
        'src/boot.ts',
        'src/types.ts',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/showcase', '@/showcase/*', '@/showcase/**'],
                message:
                  'Scaffold must not import the showcase (demo) surface — it is deleted on `pnpm eject`. Put shared code in the scaffold (src/ui, src/composables, …) instead.',
              },
              {
                group: RENDERERS,
                message: RENDERER_MESSAGE,
              },
            ],
          },
        ],
      },
    },
    /* eject:strip-end */
  ],
});
