import { URL, fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'

// Deliberately not vite.config.ts: the tanstackStart/nitro plugins pull in a
// second copy of React under Vitest, so any component using hooks renders with
// a null dispatcher ("Cannot read properties of null (reading 'useState')").
// Tests only need JSX + the @ alias.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [viteReact()],
  test: {
    environment: 'jsdom',
    // globals only so @testing-library/react auto-registers its afterEach cleanup;
    // tests still import describe/it/expect/vi explicitly
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
