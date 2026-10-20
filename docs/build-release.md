# Build & release

Config babel, minification Android, installation de paquets natifs, QA release.

## Règles en bref

- `console.*` strippés en release par babel — ne jamais retirer le plugin ni son `exclude: ['error', 'warn']`
- React Compiler = **premier plugin** de `babel.config.js`, ne jamais le déplacer
- R8/ProGuard actif en release Android — crash `ClassNotFoundException` → règle `-keep`, jamais désactiver R8
- Paquet natif ajouté → `pod install` + rebuild + QA sur build **release**
- Après modification de `babel.config.js` → relancer Metro avec `--reset-cache`

---

## `console.*` supprimés en production

Les appels `console.log` / `console.info` / `console.debug` sont **strippés des builds release** par `babel-plugin-transform-remove-console`, activé conditionnellement dans `babel.config.js` (forme fonction) :

```js
module.exports = (api) => {
  const isProduction = api.env('production');
  api.cache.using(() => isProduction);

  return {
    plugins: [
      // ...
      ...(isProduction
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : []),
    ],
  };
};
```

Règles :

- **Ne jamais retirer ce plugin** ni son entrée des dépendances — les `console.log` sont coûteux sur Hermes et ne doivent jamais atteindre la prod
- **`error` et `warn` sont exclus volontairement** : `console.error` fait partie de la convention de gestion d'erreur (`console.error` + `crashlytics.recordError`, cf. [`data-fetching.md`](./data-fetching.md#gestion-derreur)) et alimente les breadcrumbs. Ne pas retirer l'`exclude`
- `console.log` reste OK en debug (trackers de dev, diagnostics), mais **jamais comme logging de prod** : pour remonter une erreur en production, passer par le crash reporter du projet
- **Piège connu** : ne pas déclarer ce plugin dans un bloc `env.production` ni dans un `.babelrc` séparé — avec `@babel/core` 7.29 les options du plugin (`exclude`) sont silencieusement perdues au merge, et `console.error` se fait stripper aussi. Toujours passer par la forme fonction ci-dessus, dans `babel.config.js` uniquement (pas de `.babelrc` dans le projet)
- Après modification de `babel.config.js`, relancer Metro avec `yarn start --reset-cache` (ou le script `yarn clean` du projet)

## React Compiler

Actif via `babel-plugin-react-compiler` (**premier plugin** de `babel.config.js`, option `target: '19'`). Mémoïse automatiquement composants et hooks à la compilation.

- **Ne jamais le déplacer** : il doit rester le premier plugin de la liste
- Il ne remplace pas les règles `memo()`/`useCallback`/`useMemo` de [`performance.md`](./performance.md) : on les garde (le compiler bail out silencieusement sur le code qu'il ne sait pas prouver sûr)
- Une deps list qui n'est pas faite d'expressions simples (`x`, `x.y.z`) fait **bail out le composant entier**, sans erreur ni warning — typiquement un appel de fonction dans le tableau
- Conséquence pour `react-hook-form` : un enfant qui lit via `methods.watch()` gèle derrière un ancêtre compilé, cf. [`forms.md`](./forms.md)
- Appeler `props.onX()` dans un `useCallback` fait dépendre le compiler de **tout** l'objet `props` (appel de méthode) : deps `[props.onX]` incompatibles → bail out « Existing memoization could not be preserved ». Lier d'abord le callback à une constante locale (`const onX = props.onX;`, sans destructuring) et l'utiliser dans le callback et ses deps. Un `useCallback` qui ne fait que relayer `props.onX` se supprime : passer `props.onX` directement
- Écrire une ref pendant le render (`ref.current = props.x`, pattern « latest ref ») ou la lire pour le rendu fait bail out (« Cannot access refs during render ») : faire l'écriture dans un `useLayoutEffect` sans deps
- Le compiler **recalcule les deps** d'un `useMemo`/`useCallback` à partir de son corps : une dep volontairement non lue (clé de « forçage », ex : recréer des gestes après un réordonnancement) est **silencieusement retirée**. Soit la lire réellement dans la factory, soit sortir le hook du compiler avec la directive `'use no memo'` en tête de fonction, commentée
- Reanimated : `sv.get()` / `sv.set(x)` plutôt que `sv.value` (muter `.value` d'une valeur retournée par un hook fait bail out le composant)

Vérifier ce que le compilateur fait réellement d'un fichier :

```bash
npx babel <fichier> --plugins babel-plugin-react-compiler
```

## R8/ProGuard Android

`enableProguardInReleaseBuilds = true` + `shrinkResources` dans `android/app/build.gradle` : bundle minifié et ressources shrinkées en release.

- **Ressources chargées par nom depuis JS** (`res/raw` de `react-native-sound`, etc.) : le shrinker ne les voit pas et les supprime. Avec AGP 9 (shrinker intégré à R8), un `res/raw/keep.xml` (`tools:keep`, même avec noms explicites et `shrinkMode="safe"`) a été **ignoré** — constaté sur La Bombinette. Si l'app a de telles ressources : pas de `shrinkResources`, ou vérifier l'APK (`aapt2 dump resources app-release.apk | grep raw/`) avant de livrer

- Les règles keep spécifiques vivent dans `android/app/proguard-rules.pro` (exigées par les docs des SDKs concernés)
- Si un crash release pointe une classe manquante (`ClassNotFoundException`), ajouter la règle `-keep` du SDK concerné dans ce fichier — **ne jamais désactiver R8 globalement**
- **QA sur build release obligatoire** après tout ajout de SDK natif (les comportements debug ≠ release : minification, console strippée, dev menu absent)

## Installer un paquet natif — procédure

1. Vérifier la **compatibilité** : support de la New Architecture, version RN minimale, maintenance active du paquet
2. `yarn add <pkg>` (jamais npm, cf. [`best-practices.md`](./best-practices.md))
3. iOS : `cd ios && pod install`
4. **Rebuild natif complet** (`yarn ios` / `yarn android`) — un reload Metro ne suffit pas
5. Si le paquet a une étape de config native (Info.plist, AndroidManifest, gradle), la documenter dans le commit
6. QA sur build **release** avant de merger (cf. R8 ci-dessus)
