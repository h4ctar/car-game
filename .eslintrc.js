module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  ignorePatterns: ['static/*'],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'max-len': 'off',
    'no-console': 'off',
    'no-mixed-operators': 'off',
    'no-param-reassign': 'off',
    'prefer-destructuring': 'off',
    'no-underscore-dangle': 'off',
    'no-restricted-syntax': 'off',
    'no-plusplus': 'off',
  },
};
