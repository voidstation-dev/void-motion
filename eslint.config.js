// @ts-check
import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

// ESLint flat config for Void Motion.
//
// Legacy code under `legacy/` is the frozen behavioral reference and is
// intentionally NOT linted — it is plain JS that must not be reshaped during
// the parity migration. Only `src/` and `tests/` (TypeScript/TSX) are linted.
export default [
  js.configs.recommended,
  {
    files: [
      'src/**/*.ts',
      'src/**/*.tsx',
      'tests/**/*.ts',
      'tests/**/*.tsx',
      'vite-plugins/**/*.ts',
    ],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        crypto: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      // `no-undef` is redundant for TypeScript: the compiler already flags
      // undefined identifiers, and the rule does not understand TS lib type
      // globals (HTMLCanvasElement, etc.). Rely on `tsc --noEmit` instead.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // React JSX in .tsx files uses capitalized component locals that the
      // linter may flag without this context; tsc covers unused JSX anyway.
    },
  },
  {
    ignores: ['legacy/**', 'node_modules/**', 'dist/**', '*.md'],
  },
]
