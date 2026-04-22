const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.commonjs,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    },
  },
  {
    ignores: ['node_modules/', 'archive/', 'legacy/', 'dev/', 'dist/', 'build/'],
  },
];
