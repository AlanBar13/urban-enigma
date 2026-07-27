//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  {
    ignores: [
      '.output/**',
      '.vercel/**',
      'dist/**',
      'dist-ssr/**',
      'src/database.types.ts',
      // Service worker: plain JS shipped as-is, outside the TS project
      'public/**',
    ],
  },
  ...tanstackConfig,
]
