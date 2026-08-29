const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  {
    ignores: ['node_modules/**', 'android/**', 'ios/**', '.expo/**', 'dist/**', 'coverage/**'],
  },
  {
    rules: {
      // Le projet est écrit en français : les apostrophes typographiques abondent.
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    // `jest.mock` est remonté au-dessus des imports par Babel : ces fichiers
    // doivent déclarer leurs doublures avant d'importer le module testé.
    files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx'],
    rules: { 'import/first': 'off' },
  },
  {
    files: ['tools/**/*.mjs'],
    languageOptions: { globals: { Buffer: 'readonly', console: 'readonly', process: 'readonly' } },
  },
];
