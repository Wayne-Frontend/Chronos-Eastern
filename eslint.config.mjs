import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettier from 'eslint-config-prettier'

const miniprogramGlobals = {
  App: 'readonly',
  Component: 'readonly',
  Page: 'readonly',
  getApp: 'readonly',
  getCurrentPages: 'readonly',
  wx: 'readonly',
}

export default [
  {
    ignores: ['node_modules/**', 'miniprogram_npm/**', 'typings/**', 'coverage/**'],
  },
  {
    files: ['miniprogram/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: miniprogramGlobals,
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...prettier.rules,
      'no-console': 'error',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]
