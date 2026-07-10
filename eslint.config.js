import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import openLoopRules from './tools/eslint-rules/index.js';

export default [
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'tools/eslint-rules/**',
      /* eject:strip-start — Synergism scaler-snapshot ignores; demo-only, removed by `pnpm eject` */
      // Canonical Synergism snapshot files — kept verbatim as port reference;
      // not on the build path. tsconfig.app.json excludes the same set.
      'src/showcase/archetypes/scaler/achievements.ts',
      'src/showcase/archetypes/scaler/buy.ts',
      'src/showcase/archetypes/scaler/challenges.ts',
      'src/showcase/archetypes/scaler/reset.ts',
      'src/showcase/archetypes/scaler/runes.ts',
      'src/showcase/archetypes/scaler/synergism.ts',
      'src/showcase/archetypes/scaler/upgrades.ts',
      'src/showcase/archetypes/scaler/variables.ts',
      /* eject:strip-end */
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
    },
  },
  // Typed-lint block — gated to TS + Vue under src/. Engages the TS program via
  // projectService so type-aware rules can resolve operand types. Kept narrow
  // so untyped rules don't pay the program-resolution cost on every file.
  /* eject:strip-start — _template exclusion note; authoring-only, removed by `pnpm eject` */
  // _template is excluded from tsconfig.app.json's include set, so the project
  // service can't resolve those files; keep them on the basic-lint pass only.
  /* eject:strip-end */
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'],
    /* eject:strip-start */
    ignores: ['src/showcase/archetypes/_template/**'],
    /* eject:strip-end */
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      'open-loop': openLoopRules,
    },
    rules: {
      'open-loop/no-decimal-relational-operator': 'error',
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
      'src/lib/**/*.{ts,vue}',
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
          ],
        },
      ],
    },
  },
  /* eject:strip-end */
];
