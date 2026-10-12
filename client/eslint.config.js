import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist-ssr', 'dist-dev', 'dist-dev-ssr', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{js,jsx}'],
    plugins: { react },
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Count JSX usage (<m.div>, <Icon>, <Tag>) as a use of the variable.
      'react/jsx-uses-vars': 'error',
      // Motion: keep the first-screen bundle small. `m` + <LazyMotion strict>
      // (Root.jsx) loads animation features asynchronously; the full `motion`
      // component and the legacy package would pull everything in eagerly.
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'framer-motion', message: "Import from 'motion/react' (m, AnimatePresence, ...)." },
          { name: 'motion/react', importNames: ['motion'], message: 'Use `m` with <LazyMotion strict> instead of `motion`.' },
        ],
      }],
    },
  },
  // The end-to-end suite runs in Node, with callbacks evaluated in the page.
  {
    files: ['e2e/**/*.js', 'playwright.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
])
