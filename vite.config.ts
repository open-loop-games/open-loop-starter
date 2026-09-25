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
