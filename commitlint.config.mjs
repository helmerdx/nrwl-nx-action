export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 85],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'lint',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
  },
};
