const baseConfig = require('@backstage/cli/config/eslint-factory')(__dirname);

module.exports = {
  ...baseConfig,
  overrides: [
    ...(baseConfig.overrides || []),
    {
      files: ['src/backend/**/*.ts', 'src/backend/**/*.tsx'],
      rules: {
        'new-cap': ['error', { capIsNew: false }],
        'no-restricted-imports': 'off',
      },
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
