import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'packages/core/src/**/*.test.js',
      'apps/signaling-cf/src/**/*.test.js',
    ],
  },
})
