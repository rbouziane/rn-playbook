# REACT-NATIVE.md

Règles génériques pour tout projet React Native + TypeScript.
Spécificités projet (stack, versions, palette) → `CLAUDE.md`. Specs produit → `specs/`.

Ce fichier est l'**index unique** de la doc. Lire le sous-fichier correspondant **avant** d'écrire du code dans son domaine. Chaque sous-fichier commence par un bloc « Règles en bref » ; le détail suit.

---

## Démarrage rapide — toute tâche

| Fichier | Rôle |
|---|---|
| [`recipes.md`](./recipes.md) | Checklists pas à pas des tâches courantes (créer une feature, un écran, brancher une API…) |
| [`placement.md`](./placement.md) | Table de décision « où mettre ce code ? » et « où vit l'état ? » |
| [`definition-of-done.md`](./definition-of-done.md) | Checklist d'auto-vérification avant de présenter le travail en review |

## Index par domaine

| Sujet | Fichier | Quand le lire |
|---|---|---|
| Nouveau projet | [`new-project.md`](./new-project.md) | Bootstrap d'un projet from scratch : init CLI, socle de dépendances, configs |
| Arborescence, placement, types | [`architecture.md`](./architecture.md) | Création de feature, nouveau fichier, type ou enum |
| Composants, code style, skeletons | [`components.md`](./components.md) | Création/édition de tout composant `.tsx` |
| Hooks de logique | [`hooks.md`](./hooks.md) | Logique d'écran, hook métier, `useEffect` |
| Contexts | [`contexts.md`](./contexts.md) | Création/édition d'un context, état partagé entre écrans |
| Theming & design tokens | [`theming.md`](./theming.md) | Ajout de couleur, spacing, style de texte, dark mode |
| Data fetching, gestion d'erreur | [`data-fetching.md`](./data-fetching.md) | Création de hook query/mutation, reducer, appel API |
| Navigation | [`navigation.md`](./navigation.md) | Ajout d'écran, stack, tab, modal, navigation programmatique |
| Storage | [`storage.md`](./storage.md) | Lecture/écriture MMKV, persister TanStack |
| Listes, scroll, optimisation | [`performance.md`](./performance.md) | Création de liste, mémoïsation, contexts, perfs |
| Animations & gestes | [`animations.md`](./animations.md) | Toute animation, geste, reanimated, worklet |
| Formulaires & inputs | [`forms.md`](./forms.md) | Champ de saisie, validation, clavier, soumission |
| Assets | [`assets.md`](./assets.md) | Ajout de SVG, image, font, son |
| Plateforme & a11y | [`platform.md`](./platform.md) | Safe areas, barres système, iOS/Android, permissions, accessibilité |
| i18n | [`i18n.md`](./i18n.md) | Ajout de string visible utilisateur |
| Tests | [`testing.md`](./testing.md) | Écriture de tests, mocks, fixtures |
| Environnements & config | [`environment.md`](./environment.md) | Ajout d'une clé de config, `.env`, flavor/scheme, secrets |
| Build & release | [`build-release.md`](./build-release.md) | `babel.config.js`, gradle/ProGuard, paquet natif, QA release |
| Conventions de nommage | [`naming.md`](./naming.md) | Tableau de référence à consulter au moindre doute |
| Outillage & hygiène | [`best-practices.md`](./best-practices.md) | yarn, lint, typecheck, dépendances |
| Git & livraison | [`git-workflow.md`](./git-workflow.md) | Commit, découpage, branches |

---

## Règles non-négociables

À garder en tête en permanence, indépendamment du fichier consulté.

### Composants & écrans

- **Toujours `memo()`** sur tout composant
- **Jamais déstructurer les props** — toujours `props.xxx`
- **Pas de valeurs par défaut** sur les props (utiliser `?` pour optionnel)
- **Pas de styles inline** — `StyleSheet.create()` en bas du fichier
- **`export default` à la toute fin** du fichier
- **Aucune logique dans un screen** — état, effets et callbacks vivent dans un hook `useXxxScreenLogic` (`features/X/hooks/`)

### Code

- **Accolades obligatoires** sur tout `if` / `else` / `for` / `while`
- **Early return** plutôt que `if/else` imbriqués, jamais d'`else` après un `return`
- **Pas de `any`** sauf `catch (error: any)`, **pas d'`as`** sauf cas justifié
- Le code doit **respirer** : lignes vides après imports, entre hooks non liés, avant `return`

### Imports

- Toujours via l'alias `~` (pointe vers `./app/`)
- Imports cross-features uniquement via l'`index.ts` de la feature, jamais par chemins internes

### Architecture

- **Tout le global vit dans `shared/`** (assets, components, constants, contexts, services, types, theme, utils)
- Critère de placement : **appartenance au domaine métier**, pas le nombre d'utilisateurs
- Un fichier = un composant / un type principal

### UI & assets

- Valeurs de style uniquement via le **theme** (`theme.xxx` ou `useTheme()`) — jamais de hex, spacing ou fontSize en dur
- Icônes = **fichiers `.svg` en `currentColor`** importés comme composants — jamais de SVG inline JSX
- Toute string visible utilisateur via `translate()`, dans **toutes** les locales

### Performance

- Tout enfant `memo()` doit recevoir des **props à références stables** (`useMemo`, `useCallback` côté parent)
- **Animations via `react-native-reanimated`** uniquement (worklets UI thread)
- Images distantes via un composant image avec **cache**
- **Mesurer avant d'optimiser** (outil de debug du projet)
- **Pas de `console.*` comme logging de prod** — strippés des builds release (cf. [`build-release.md`](./build-release.md)), erreurs prod via le crash reporter

### Sécurité & qualité

- Storage = **MMKV chiffré** (clé Keychain), jamais AsyncStorage
- Toute erreur : `console.error` + `crashlytics.recordError`, message utilisateur traduit
- Terminer toute tâche par la [`definition-of-done.md`](./definition-of-done.md)
