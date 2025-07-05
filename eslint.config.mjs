import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
        ClipboardJS: 'readonly',
      },
    },
    settings: {
      env: {
        browser: true,
        es2021: true,
        jquery: true,
        webextensions: true,
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
]
