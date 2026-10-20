import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Run in the timezone of the people using this, so date bugs that only appear
    // east of UTC (picked day turning into the previous day) fail here, not in production.
    env: { TZ: 'Asia/Kolkata' },
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
})
