# Où mettre ce code ?

Table de décision unique pour le placement de tout nouveau code. Le critère universel : **appartenance au domaine métier**, jamais le nombre de consommateurs.

Ce critère vaut aussi pour ce qui n'est pas un composant : les constantes, enums, hooks et types **d'un module** vivent dans le dossier de ce module (`shared/toast/constants/`, `shared/storage/constants/`), pas dans un dossier global rangé par type. `shared/constants/` et `shared/hooks/` n'accueillent que ce qui n'appartient à aucun module — c'est le dernier recours, pas le réflexe.

---

## Placement du code

| J'ai un…                                        | Il va dans…                                  | Référence                                    |
| ----------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Composant lié à un domaine métier               | `features/X/components/`                     | [`architecture.md`](./architecture.md)       |
| Composant générique (Button, Modal, Collapse)   | `shared/ui/components/`                         | [`architecture.md`](./architecture.md)       |
| Composant hybride 2 domaines                    | la feature de sa **logique** principale      | [`architecture.md`](./architecture.md)       |
| Écran                                           | `features/X/screens/xxx-screen.tsx`          | [`navigation.md`](./navigation.md)           |
| Navigator / stack                               | `app/navigators/`                            | [`navigation.md`](./navigation.md)           |
| Hook de logique d'écran (`useXxxScreenLogic`)   | `features/X/hooks/`                          | [`hooks.md`](./hooks.md)                     |
| Hook métier réutilisable dans la feature        | `features/X/hooks/`                          | [`hooks.md`](./hooks.md)                     |
| Hook agnostique (useDebounce, useAppState)      | `shared/hooks/`                              | [`hooks.md`](./hooks.md)                     |
| Hook TanStack Query/Mutation                    | `features/X/services/hook.ts` — **jamais** `hooks/` | [`data-fetching.md`](./data-fetching.md) |
| Appel HTTP                                      | `features/X/services/api.ts`                 | [`data-fetching.md`](./data-fetching.md)     |
| Transformation Api → App                        | `features/X/services/reducer.ts`             | [`data-fetching.md`](./data-fetching.md)     |
| Type API (snake_case, suffixe `Api`)            | `features/X/services/types.ts`               | [`architecture.md`](./architecture.md)       |
| Type App (métier) d'une feature                 | `features/X/types/`                          | [`architecture.md`](./architecture.md)       |
| Type App partagé                                | `shared/types/`                              | [`architecture.md`](./architecture.md)       |
| Enum d'une feature                              | `features/X/enums/`                          | [`architecture.md`](./architecture.md)       |
| Enum / constante d'un module (STORAGE_KEY, SCREEN_NAME, QUERY_KEY…) | `<module>/constants/` — `shared/storage/constants/`, `navigators/constants/`, `api/constants/` | [`naming.md`](./naming.md) |
| Enum / constante qui n'appartient à aucun module (ENV…) | `shared/constants/` — dernier recours        | [`naming.md`](./naming.md)                   |
| Context scopé à une feature                     | `features/X/contexts/`                       | [`contexts.md`](./contexts.md)               |
| Context global (theme, init…)                   | `shared/contexts/`                           | [`contexts.md`](./contexts.md)               |
| Fonction pure utilitaire                        | `shared/utils/` (ou `features/X/` si métier) | [`architecture.md`](./architecture.md)       |
| Skeleton d'un composant de feature              | à côté de son composant, préfixe `Skeleton`  | [`components.md`](./components.md#skeletons) |
| Skeleton générique (SkeletonText…)              | `shared/ui/components/`                         | [`components.md`](./components.md#skeletons) |
| Asset (SVG, image, son) propre à une feature    | `features/X/assets/`                         | [`assets.md`](./assets.md)                   |
| Asset transverse                                | `shared/assets/svg|images|fonts|sounds/`     | [`assets.md`](./assets.md)                   |
| Design token (couleur, spacing, texte)          | `shared/theme/`                              | [`theming.md`](./theming.md)                 |
| String visible utilisateur                      | `app/i18n/*.json` (toutes les locales)       | [`i18n.md`](./i18n.md)                       |

Rappels :

- Ce qui sort d'une feature passe par son `index.ts` — tout le reste est privé
- Un composant métier **reste dans sa feature** même si 3 autres features le consomment
- Un module transverse (`shared/toast/`, `shared/storage/`) est autonome : ce qu'il possède vit chez lui, constantes comprises (cf. [`architecture.md`](./architecture.md#module-transverse-dans-shared))
- En cas de doute composant hybride : préférer la composition (children, slots) à un composant à double casquette

---

## Où vit l'état ?

| Nature de l'état                                           | Solution                                   | Référence                                    |
| ---------------------------------------------------------- | ------------------------------------------ | -------------------------------------------- |
| Donnée serveur (fetch, cache, refetch)                     | TanStack Query — jamais copiée dans un state | [`data-fetching.md`](./data-fetching.md)   |
| Donnée locale **persistante** (préférences, token, flags)  | MMKV (`getMMKV()` + `STORAGE_KEY`)          | [`storage.md`](./storage.md)                 |
| État partagé entre écrans, **éphémère** (session de jeu…)  | Context splitté + `useContextSelector`      | [`contexts.md`](./contexts.md)               |
| État local d'un composant/écran                            | `useState` dans le hook de logique          | [`hooks.md`](./hooks.md)                     |
| Valeur **calculable** depuis un autre état ou des props    | pas un state — calcul direct ou `useMemo`   | [`performance.md`](./performance.md#state--pas-de-valeurs-dérivées) |
| Valeur qui change à chaque frame (animation)               | `useSharedValue` (reanimated)               | [`animations.md`](./animations.md)           |

Anti-patterns :

- ❌ Copier le résultat d'une query dans un `useState` — consommer la query directement
- ❌ Un Context pour un état que seul un écran utilise — `useState` local suffit
- ❌ MMKV comme state manager réactif — MMKV persiste, le Context/state fait la réactivité
