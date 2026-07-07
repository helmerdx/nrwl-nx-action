import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import importHelpersPlugin from 'eslint-plugin-import-helpers';
import prettierPlugin from 'eslint-plugin-prettier';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

const files = ['**/*.{js,ts}'];

const nodeGlobals = {
  Buffer: 'readonly',
  console: 'readonly',
  process: 'readonly',
};

export default [
  {
    ignores: ['dist/**', 'lib/**', 'node_modules/**'],
  },
  ...tsPlugin.configs['flat/recommended-type-checked'].map((config) => ({
    ...config,
    files,
  })),
  {
    ...importPlugin.flatConfigs.recommended,
    files,
  },
  {
    ...importPlugin.flatConfigs.typescript,
    files,
  },
  {
    ...sonarjsPlugin.configs.recommended,
    files,
  },
  {
    files,
    languageOptions: {
      ecmaVersion: 'latest',
      globals: nodeGlobals,
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
      sourceType: 'module',
    },
    plugins: {
      'import-helpers': importHelpersPlugin,
      prettier: prettierPlugin,
      'unused-imports': unusedImportsPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      'import-helpers/order-imports': [
        'error',
        {
          newlinesBetween: 'always',
          groups: ['module', ['parent', 'sibling', 'index']],
          alphabetize: {
            order: 'asc',
            ignoreCase: true,
          },
        },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'unused-imports/no-unused-imports': ['error'],
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'prettier/prettier': 'error',
      'arrow-body-style': 'off',
      'prefer-arrow-callback': 'off',
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/require-jsdoc': 'off',
    },
  },
];
