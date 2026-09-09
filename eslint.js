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

    // docs/forms.md — react-hook-form x React Compiler
    'no-restricted-syntax': [
      'error',
      {
        // A child reading through a `methods` prop: watch() only re-renders the
        // useForm() owner, and a compiled ancestor caches the subtree away.
        selector:
          "CallExpression[callee.property.name='watch'][callee.object.object.name='props']",
        message:
          "Lecture d'un champ dans un enfant : useWatch({ control, name }) — methods.watch() gèle derrière un ancêtre compilé (docs/forms.md). Dans un callback : getValues().",
      },
      {
        // A call expression in a deps list makes React Compiler bail out on the
        // whole component, silently.
        selector:
          "CallExpression[callee.name=/^use(Memo|Callback|Effect|LayoutEffect)$/] > ArrayExpression CallExpression[callee.property.name='watch']",
        message:
          'watch() dans un tableau de dépendances fait bail out React Compiler sur tout le composant — extraire la valeur via useWatch (docs/forms.md).',
      },
      {
        // A custom family resolves by name on both platforms. Asking it for a
        // weight >= 700 makes Android look for `<family>_bold.ttf` alone and
        // fall back to the *system* face — silently, and iOS-clean.
        // `:has()` matches descendants, so the child combinator is what keeps
        // the report on the offending style and off its StyleSheet wrapper.
        selector:
          'ObjectExpression:has(> Property[key.name="fontFamily"]):has(> Property[key.name="fontWeight"])',
        message:
          'fontWeight à côté d\'une fontFamily custom : la graisse est portée par la famille, une par graisse (docs/assets.md#fonts).',
      },
    ],

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
          {
            name: 'react-native-fast-image',
            message:
              'react-native-fast-image (non maintenu) interdit — utiliser @d11/react-native-fast-image (docs/assets.md).',
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
