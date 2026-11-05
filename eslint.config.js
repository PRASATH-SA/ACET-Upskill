import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '.tmp/**',
      '.cache/**',
      '.data/**',
      'uploads/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // Playwright specs run in Node but pass callbacks to page.evaluate() in the browser.
    files: ['e2e/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // file-type < 22 has an ASF infinite loop; lib/upload.js wraps it with a guard (H1).
    files: ['apps/api/src/**/*.js'],
    ignores: ['apps/api/src/lib/upload.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'file-type', message: 'Use detectFileType() from lib/upload.js instead.' },
          ],
        },
      ],
    },
  },
  {
    // MongoDB init scripts run in mongosh.
    files: ['deploy/mongo/**/*.js'],
    languageOptions: { globals: { db: 'readonly', print: 'readonly' } },
  },
  {
    // k6 scripts run in k6's JavaScript runtime, not Node.
    files: ['loadtest/k6/**/*.js'],
    languageOptions: {
      globals: { open: 'readonly', __VU: 'readonly', __ITER: 'readonly', __ENV: 'readonly' },
    },
  },
  {
    // The service worker is served as-is from public/ and runs in a worker scope.
    files: ['apps/web/public/sw.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.serviceworker } },
  },
  {
    files: ['apps/web/src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: '18.3' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
