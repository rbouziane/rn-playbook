# Nouveau projet

Bootstrap d'un projet React Native + TypeScript conforme au playbook, de la génération au premier build vérifié.

## Règles en bref

- **Pas d'Expo** : `npx @react-native-community/cli@latest init MonProjet --version <x.y.z> --pm yarn` — RN nu, config native accessible
- Version de RN dictée par **reanimated**, jamais par `latest` : son `peerDependencies` se vérifie **avant** de générer
- Nom du projet en **PascalCase ASCII** sans tiret ni chiffre initial : il devient le module natif, le scheme Xcode et l'`applicationId`
- Playbook branché **avant la première ligne de code** : `yarn add -D rbouziane/rn-playbook && npx rn-playbook init`
- Tout le code applicatif vit sous **`app/`**, importé via l'alias `~` — jamais de source à la racine
- Socle de dépendances installé **en une passe**, puis `pod install` + rebuild natif complet
- Ordre des plugins babel non négociable : **react-compiler en premier, worklets/reanimated en dernier**
- Bootstrap terminé = `yarn quality` vert + build **release** lancé sur les deux plateformes

Le détail ci-dessous. Chaque étape renvoie au fichier de doc qui fait autorité sur le domaine.

---

## 1. Générer le projet

**Fixer la version de RN avant de générer.** `reanimated` compile contre les internals de RN et pince donc son peer sur quelques mineures ; il sort après RN. La dernière RN stable n'est en général pas encore couverte.

```sh
npm info react-native-reanimated peerDependencies
```

Générer la version la plus haute que ce range couvre, en la passant explicitement :

```sh
npx @react-native-community/cli@latest init MonProjet --version <x.y.z> --pm yarn
cd MonProjet
```

Hors range, `yarn add` sort une erreur de peer sans recouvrement et le build natif casse ensuite sans message exploitable. La montée se fait plus tard, quand reanimated suit : un `yarn up` délibéré, jamais subi.

- `npx react-native init` est **mort** : le template est passé au CLI communautaire, seule commande valable aujourd'hui
- `--pm yarn` évite le `package-lock.json` que le playbook interdit (cf. [`best-practices.md`](./best-practices.md#gestionnaire-de-paquets--yarn-jamais-npm))
- Vérifier que la **New Architecture** est active (`newArchEnabled=true` dans `android/gradle.properties`) — elle l'est par défaut, ne pas la désactiver pour faire passer un paquet non compatible : c'est le paquet qu'on remplace
- Premier commit du template **tel quel**, avant toute modification : le diff du bootstrap reste lisible

Yarn 4 (Berry) : imposer `nodeLinker: node-modules` dans `.yarnrc.yml`. Metro et CocoaPods ne savent pas résoudre PnP — sans ça, le build natif casse sans message exploitable.

Puis créer la branche d'intégration attendue par gitflow (cf. [`git-workflow.md`](./git-workflow.md)) :

```sh
git checkout -b develop
```

**Identité native, tout de suite** — la reprendre plus tard, une fois des services natifs déclarés dessus (Firebase, deep links, provisioning), coûte dix fois plus cher :

- `applicationId` (`android/app/build.gradle`) et `PRODUCT_BUNDLE_IDENTIFIER` (Xcode) en reverse-DNS
- Nom affiché : `android/app/src/main/res/values/strings.xml` et `Info.plist` (`CFBundleDisplayName`)
- Icônes et splash sur les deux plateformes

## 2. Brancher le playbook

```sh
yarn add -D rbouziane/rn-playbook
npx rn-playbook init
```

`init` installe la config ESLint, le `CLAUDE.md`, les assets Claude et les scripts qualité — détail et branchements manuels dans le [README](../README.md#installation-dans-un-projet). Remplir les placeholders `<...>` du `CLAUDE.md` généré dans la foulée : stack réelle, scopes de commit, specs.

## 3. Poser l'arborescence et l'alias `~`

Créer `app/` et y déplacer `App.tsx`. La structure cible (features, shared, navigators, api, i18n) est décrite dans [`architecture.md`](./architecture.md#arborescence-racine) — **ne créer que les dossiers réellement utilisés**, pas de squelette vide.

Supprimer le `__tests__/` du template dans la foulée : les tests sont colocalisés, il n'y a pas de dossier de tests global (cf. [`testing.md`](./testing.md#localisation--naming)).

L'alias se déclare à deux endroits, sous peine d'un typecheck vert et d'un runtime cassé :

```json
// tsconfig.json — résolution TypeScript
{
  "extends": "@react-native/typescript-config",
  "compilerOptions": {
    "paths": { "~*": ["./app/*"] }
  }
}
```

Pas de `baseUrl` : il est déprécié et sort en **erreur**. `paths` seul suffit, il se résout relativement au `tsconfig.json`.

```js
// babel.config.js — résolution Metro à l'exécution
['module-resolver', { root: ['./app'], alias: { '^~(.+)': './app/\\1' } }],
```

L'alias est une **regex**, pas la clé simple `'~'` : une clé simple ne matche que l'import `~` ou `~/quelque-chose`, alors que la convention écrit `~shared/theme`, sans slash après le `~`. Avec la clé simple, le typecheck passe (c'est `paths` qui le résout) et Metro échoue à l'exécution sur `Cannot find module '~shared/theme'` — exactement le double branchement que cette section impose.

Mettre à jour l'`index.js` racine pour pointer sur `./app/App`.

## 4. Installer le socle

Une seule passe, puis `cd ios && pod install`. Chaque ligne est imposée par une convention — pas de substitution sans mise à jour de la doc correspondante.

| Domaine | Paquets | Doc |
| --- | --- | --- |
| Navigation | `@react-navigation/native` `@react-navigation/native-stack` `react-native-screens` `react-native-safe-area-context` | [`navigation.md`](./navigation.md) |
| Animations & gestes | `react-native-reanimated` `react-native-gesture-handler` | [`animations.md`](./animations.md) |
| Data | `@tanstack/react-query` `axios` | [`data-fetching.md`](./data-fetching.md) |
| Storage | `react-native-mmkv` `react-native-keychain` | [`storage.md`](./storage.md) |
| Listes & UI | `@shopify/flash-list` `react-native-edge-to-edge` `react-native-skeleton-placeholder` | [`performance.md`](./performance.md), [`platform.md`](./platform.md) |
| Assets | `react-native-svg` `@d11/react-native-fast-image` + `-D react-native-svg-transformer` `react-native-asset` | [`assets.md`](./assets.md) |
| i18n | `i18n-js` + `react-native-localize` (locale device) | [`i18n.md`](./i18n.md) |
| Formulaires | `react-hook-form` (dès ~3 champs interdépendants) | [`forms.md`](./forms.md) |
| Crash reporting | `@react-native-firebase/app` `@react-native-firebase/crashlytics` | [`data-fetching.md`](./data-fetching.md#gestion-derreur) |
| Environnements | `react-native-config` | [`environment.md`](./environment.md) |
| Build | `-D babel-plugin-react-compiler` `babel-plugin-transform-remove-console` `babel-plugin-module-resolver` | [`build-release.md`](./build-release.md) |
| Tests | `-D @testing-library/react-native` `test-renderer` | [`testing.md`](./testing.md) |

Tout paquet natif ajouté ensuite suit la [procédure d'installation](./build-release.md#installer-un-paquet-natif--procédure) : compatibilité New Architecture, `pod install`, rebuild complet, QA release.

## 5. Configurer la toolchain

### `babel.config.js`

L'ordre des plugins est une contrainte dure : **react-compiler premier** (cf. [`build-release.md`](./build-release.md#react-compiler)), **worklets dernier**.

```js
module.exports = api => {
  const isProduction = api.env('production');
  api.cache.using(() => isProduction);

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      ['babel-plugin-react-compiler', { target: '19' }],
      ['module-resolver', { root: ['./app'], alias: { '^~(.+)': './app/\\1' } }],
      ...(isProduction
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : []),
      'react-native-worklets/plugin',
    ],
  };
};
```

`target` de react-compiler = le **major de React installé**, pas une valeur figée : il se met à jour avec React.

Reanimated ≥ 4 : le plugin s'appelle `react-native-worklets/plugin` (paquet `react-native-worklets`). En ≤ 3, c'est `react-native-reanimated/plugin`. Dans les deux cas il reste **le dernier de la liste**, et toute modif du fichier impose `yarn start --reset-cache`.

### `metro.config.js`

Brancher le transformer SVG, sans quoi un `import BombSvg from '...svg'` renvoie une string ([`assets.md`](./assets.md#svg)) :

```js
const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
  },
};
```

Déclarer aussi le module `*.svg` dans un `app/types/svg.d.ts` pour que TypeScript suive.

### `react-native.config.js`

```js
module.exports = { assets: ['./app/shared/assets/fonts'] };
```

Puis `npx react-native-asset` après chaque ajout de font.

### Environnements

Poser les trois environnements **avant la première feature** : rétro-ajouter des flavors Android et des schemes Xcode sur un projet vivant est un chantier natif. Fichiers `.env`, flavors, schemes et accès typé → [`environment.md`](./environment.md).

### Firebase

Les paquets seuls ne suffisent pas — sans les fichiers de config, l'app crashe au boot :

- `google-services.json` → `android/app/`, + plugin `com.google.gms.google-services` déclaré dans les `build.gradle` (racine et app)
- `GoogleService-Info.plist` → **ajouté au target via Xcode**, pas juste déposé dans le dossier `ios/` (sinon absent du bundle, crash uniquement en build device)
- Un projet Firebase par environnement : ces fichiers se rangent par flavor et s'injectent en CI (cf. [`environment.md`](./environment.md#firebase--fichiers-de-config-par-environnement))

### `jest.setup.js`

Mocker **une fois** les modules natifs (MMKV, keychain, crashlytics, reanimated, gesture-handler) et les déclarer dans `setupFiles` — jamais de mock natif recopié par fichier de test (cf. [`testing.md`](./testing.md#fixtures--mocks)).

### Android release

Activer `enableProguardInReleaseBuilds` et `shrinkResources` dans `android/app/build.gradle`, et créer `proguard-rules.pro` — détail et pièges dans [`build-release.md`](./build-release.md#r8proguard-android).

## 6. Vérifier avant d'écrire la première feature

```sh
yarn ios && yarn android     # build debug sur les deux plateformes
yarn quality                 # lint + typecheck + test
```

Checklist de sortie de bootstrap :

- [ ] Un import `~shared/...` résout au **typecheck et au runtime**
- [ ] Un `.svg` importé rend bien un composant
- [ ] `console.log` absent d'un build release, `console.error` toujours présent
- [ ] Un composant compilé par React Compiler (`useMemoCache` dans la sortie babel, cf. [`forms.md`](./forms.md#diagnostiquer))
- [ ] Les 3 environnements buildent et s'installent **côte à côte** sur un même device
- [ ] Build **release** lancé et navigué sur les deux plateformes — pas seulement debug
- [ ] `yarn quality` vert, `yarn.lock` commité

Ensuite seulement : première feature, en suivant [`recipes.md`](./recipes.md#créer-une-feature).
