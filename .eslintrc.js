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
  ignorePatterns: ['static/main.js'],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'max-len': 'off',
    'no-console': 'off',
    'no-mixed-operators': 'off',
    'prefer-destructuring': 'off',
  },
};
