# Recettes — tâches courantes pas à pas

Checklists ordonnées pour les tâches récurrentes. Chaque recette liste les fichiers de doc à lire d'abord, les étapes dans l'ordre, et se termine par la [`definition-of-done.md`](./definition-of-done.md).

Bootstrap d'un projet neuf (init CLI, socle, configs) → [`new-project.md`](./new-project.md).

---

## Créer une feature

**Lire d'abord :** [`architecture.md`](./architecture.md), [`naming.md`](./naming.md)

1. Créer `features/ma-feature/` (kebab-case) avec uniquement les dossiers nécessaires (pas de dossiers vides)
2. Créer `index.ts` à la racine de la feature — vide au départ, alimenté au fil des besoins cross-feature
3. Chaque élément se place selon [`placement.md`](./placement.md)
4. Aucune autre feature n'importe par chemin interne — vérifier que tout ce qui est consommé dehors est exporté dans `index.ts`

## Ajouter un écran

**Lire d'abord :** [`navigation.md`](./navigation.md), [`hooks.md`](./hooks.md), [`i18n.md`](./i18n.md)

1. Ajouter la clé dans l'enum `SCREEN_NAME` (`~navigators/constants/Screen`)
2. Choisir la stack selon la hiérarchie : écran racine d'onglet → mini-stack de l'onglet ; écran profond → details stack ; écran d'auth → tunnel stack
3. Ajouter l'entrée dans le `XxxParamList` de la stack (params = identifiants primitifs uniquement)
4. Créer `features/X/screens/mon-ecran-screen.tsx` — le screen ne contient **aucune logique** : il appelle `useMonEcranScreenLogic()` et compose des composants
5. Créer le hook de logique dans `features/X/hooks/useMonEcranScreenLogic.ts`
6. Déclarer le `Stack.Screen` avec `ScreenOptions({ title: translate('...') })`
7. Titre + toutes les strings dans **toutes** les locales
8. Prévoir les états : loading (skeleton), erreur (`ErrorState`), vide si liste
9. → [`definition-of-done.md`](./definition-of-done.md)

## Brancher un endpoint API

**Lire d'abord :** [`data-fetching.md`](./data-fetching.md)

1. Types API dans `features/X/services/types.ts` (snake_case, suffixe `Api`)
2. Type App dans `features/X/types/` (camelCase, `null` conservés)
3. Fonction dans `services/api.ts` : fetch via l'instance centralisée + throw, suffixe `Api`
4. Reducer pur dans `services/reducer.ts` (`XxxApi → Xxx`)
5. Hook dans `services/hook.ts` : suffixe `Query`/`Mutation`, reducer dans le `queryFn` avec `try/catch`, retours nommés
6. Clé dans `QUERY_KEY` (`~api/constants/QueryKey`), durées via `CACHE_TIME`
7. Clés d'erreur i18n (`error.[domaine].[clé]`) dans toutes les locales
8. Si consommé hors de la feature : exporter le hook dans `index.ts`
9. → [`definition-of-done.md`](./definition-of-done.md)

## Ajouter un composant

**Lire d'abord :** [`components.md`](./components.md), [`placement.md`](./placement.md)

1. Placement selon [`placement.md`](./placement.md) (feature vs `shared/`, sous-dossier par écran si la feature en a)
2. Fichier PascalCase, un composant public par fichier
3. Structure : imports → `type Props` → composant `memo()` → `StyleSheet.create()` → `export default`
4. Props non déstructurées, sans valeur par défaut, ordre données → état → callbacks
5. Theming via `theme.xxx` (ou `useTheme()` si couleurs dynamiques — jamais les deux)
6. Strings via `translate()` ; si chargement asynchrone visible → créer le `SkeletonXxx` à côté
7. > ~100 lignes → découper (sous-composants, hook)
8. → [`definition-of-done.md`](./definition-of-done.md)

## Créer un context

**Lire d'abord :** [`contexts.md`](./contexts.md), [`placement.md`](./placement.md)

1. Vérifier qu'un context est justifié : état **partagé entre écrans** et éphémère (sinon → `useState` local, MMKV, ou TanStack, cf. [`placement.md`](./placement.md#où-vit-létat))
2. Fichier `XxxContext.tsx` dans `features/X/contexts/` (ou `shared/contexts/` si global)
3. Suivre le pattern canonique : `createContext` de `use-context-selector`, type `XxxContextValue`, guard null + throw, helper `useXxxContextSelector`, Provider `memo()` en export default
4. Monter le Provider au plus près de ses consommateurs ; l'exporter via l'`index.ts` de la feature s'il est monté ailleurs
5. → [`definition-of-done.md`](./definition-of-done.md)

## Ajouter une string visible

**Lire d'abord :** [`i18n.md`](./i18n.md)

1. Choisir le namespace : `common.*` (générique), `error.[domaine].*`, `success.[domaine].*`, ou `[feature].*`
2. Ajouter la clé (camelCase) dans **toutes** les locales, même structure
3. Consommer via `translate('...')` — jamais de littérale dans le JSX, y compris `accessibilityLabel`

## Ajouter un token de theme

**Lire d'abord :** [`theming.md`](./theming.md)

1. Vérifier qu'un token sémantique existant ne couvre pas déjà le besoin
2. Ajouter le token dans le bon fichier de `shared/theme/` — nom **sémantique** (`surface`, pas `lightGray`)
3. Si l'app a plusieurs thèmes : définir la valeur dans **chaque** palette (light/dark)
4. Jamais d'exception locale (valeur en dur « juste ici »)

## Ajouter un asset SVG

**Lire d'abord :** [`assets.md`](./assets.md)

1. Fichier `.svg` dans `features/X/assets/` ou `shared/assets/svg/` selon [`placement.md`](./placement.md)
2. Couleurs en `currentColor` dans le fichier — jamais de hex en dur, jamais de SVG inline en JSX
3. Importer comme composant (svg-transformer) et colorer via la prop `color`/`fill` depuis le theme

## Ajouter une font custom

**Lire d'abord :** [`assets.md`](./assets.md#fonts)

1. Un fichier **par graisse** dans `shared/assets/fonts/`, nommé comme son nom PostScript (`Inter-SemiBold.ttf`) — seulement les graisses que `theme.typography` consomme
2. `npx react-native-asset`, puis **rebuild natif** : un reload Metro ne suffit pas
3. Déclarer les familles dans `shared/theme/fonts.ts`, les câbler dans `theme.typography`
4. Purger tout `fontWeight` de l'app : la graisse vient de la famille, sinon Android retombe en silence sur la police système

## Installer un paquet

**Lire d'abord :** [`best-practices.md`](./best-practices.md), [`build-release.md`](./build-release.md) si natif

1. `yarn add <pkg>` (jamais npm) ; committer `yarn.lock`
2. Si natif : suivre la procédure de [`build-release.md`](./build-release.md#installer-un-paquet-natif--procédure) (pod install, rebuild, QA release)
