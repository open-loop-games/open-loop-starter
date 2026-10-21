import { fileURLToPath, URL } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';

export default defineConfig({
  plugins: [
    vue(),
    Components({
      dirs: ['src/ui/components'],
      dts: 'src/components.d.ts',
      extensions: ['vue'],
    }),
  ],
  // Inline the engine under vite-node too. Externalized, Node loads its
  // break_eternity.js through the UMD `main`, while consumer code gets the ESM
  // `module`: two Decimal classes, and the engine reads the consumer's as 0.
  ssr: { noExternal: ['@open-loop/engine'] },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Agent worktrees carry a full copy of src/ — without this, vitest
    // runs every suite twice whenever one exists.
    exclude: [...configDefaults.exclude, '**/.claude/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
