import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import openLoopRules from './tools/eslint-rules/index.js';

export default [
  { ignores: ['dist', 'node_modules', 'coverage', 'tools/eslint-rules/**'] },
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
  // _template is excluded from tsconfig.app.json's include set, so the project
  // service can't resolve those files; keep them on the basic-lint pass only.
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'],
    ignores: ['src/archetypes/_template/**'],
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
];
