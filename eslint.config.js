// Purpose: Configure JavaScript lint rules; owner: Member 4.
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.browser,
        ...globals.node,
        SafeShield: 'writable',
        chrome: 'readonly',
        importScripts: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-control-regex': 'off',
    },
  },
];
