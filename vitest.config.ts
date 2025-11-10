import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    alias: {
      'n8n-workflow': path.resolve(__dirname, 'tests/__mocks__/n8n-workflow.ts'),
    },
    // Coverage disabled - requires @vitest/coverage-v8 which has version conflicts
    // To enable coverage, upgrade vitest to v4+ or use compatible coverage package
    // coverage: {
    //   provider: 'v8',
    //   reporter: ['text', 'json', 'html'],
    //   thresholds: {
    //     lines: 90,
    //     functions: 90,
    //     branches: 90,
    //     statements: 90,
    //   },
    // },
  },
});


