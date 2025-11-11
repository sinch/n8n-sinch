import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    alias: {
      'n8n-workflow': path.resolve(__dirname, 'tests/__mocks__/n8n-workflow.ts'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        'src/index.ts', // Just exports, no logic to test
        'src/**/types.ts', // Type definitions only
        'src/credentials/**', // Credentials are mostly configuration, need integration tests
        'src/nodes/**/Sinch.node.ts', // Main node file needs integration tests
        'test-auth.js', // Standalone script, not part of source
        'vitest.config.ts', // Config file
      ],
      thresholds: {
        // 80% coverage threshold for testable source files
        // All metrics are now above 80% threshold
        lines: 80,
        functions: 80,
        branches: 80, // Increased to 80% - now achieved!
        statements: 80,
      },
    },
  },
});


