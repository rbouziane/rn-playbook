/**
 * rn-playbook — shareable ESLint rules.
 *
 * Encodes the enforceable conventions from docs/ as lint errors.
 * Must be extended AFTER a base config that loads the react and
 * @typescript-eslint plugins (e.g. '@react-native'):
 *
 *   extends: [
 *     '@react-native',
 *     'plugin:prettier/recommended',
 *     require.resolve('rn-playbook/eslint'),
 *   ],
 */
module.exports = {
  rules: {
    // Our codebase forbids destructuring props (always props.xxx), which
    // conflicts with exhaustive-deps expecting 'props' or destructured names.
    // Member expression deps like [props.onChange, props.value] are correct.
    'react-hooks/exhaustive-deps': 'off',
    // React Native requires dynamic inline styles for runtime values (colors,
    // conditional dimensions, etc.). StyleSheet.create() is used for statics.
    'react-native/no-inline-styles': 'off',

    // docs/components.md — code style
    curly: ['error', 'all'],
    'no-else-return': ['error', { allowElseIf: false }],
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-var': 'error',
    'prefer-const': 'error',

    // docs/components.md — props are never destructured (props.xxx)
    'react/destructuring-assignment': ['error', 'never'],

    // docs/data-fetching.md — prod logging goes through the crash reporter
    'no-console': ['warn', { allow: ['error', 'warn'] }],

    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'react-native',
            importNames: ['ScrollView', 'Animated'],
            message:
              'ScrollView -> react-native-gesture-handler (docs/performance.md). Animated -> react-native-reanimated (docs/animations.md).',
          },
          {
            name: '@react-native-async-storage/async-storage',
            message:
              'AsyncStorage interdit — MMKV via getMMKV() (docs/storage.md).',
          },
        ],
        patterns: [
          {
            group: ['~features/*/*'],
            message:
              "Import cross-feature uniquement via l'index : ~features/X. En interne, chemins relatifs (docs/architecture.md).",
          },
          {
            group: [
              '~shared/theme/spacing',
              '~shared/theme/typography',
              '~shared/theme/fonts',
              '~shared/theme/style',
            ],
            message:
              'Tokens via theme.xxx — import { theme } from ~shared/theme (docs/theming.md).',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        // docs/architecture.md — type by default, never interface
        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      },
    },
  ],
};
