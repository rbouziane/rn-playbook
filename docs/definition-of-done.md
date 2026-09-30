# Definition of Done

Checklist de livraison. Toute tâche (feature, écran, composant, fix) est **auto-vérifiée contre cette liste avant d'être présentée en review**. Le rapport final mentionne explicitement ce qui a été vérifié et ce qui ne s'applique pas.

---

## Qualité — bloquant

- [ ] `yarn quality` est **vert** (lint + typecheck + tests) — le lancer réellement, pas le supposer
- [ ] Aucun `any` (hors `catch`), aucun `as` non justifié, aucun `@ts-ignore` / `eslint-disable` non commenté

## Conventions

- [ ] Placement conforme à [`placement.md`](./placement.md) ; exports cross-feature via `index.ts`
- [ ] Composants : `memo()`, props non déstructurées, pas de valeur par défaut, `StyleSheet` en bas
- [ ] Aucune logique dans les screens — tout dans un hook `useXxxScreenLogic`
- [ ] Fichiers composant ≤ ~100 lignes (sinon découpés)
- [ ] Naming conforme à [`naming.md`](./naming.md) (booléens `is/has`, `onX`/`handleX`, suffixes `Api`/`Query`/`Mutation`…)

## UI & theming

- [ ] Aucune valeur en dur : couleurs/spacing/typo via `theme.xxx` ou `useTheme()`
- [ ] Si des couleurs ont été touchées : rendu vérifié en **light ET dark**
- [ ] États couverts : loading (skeleton pour le certain, apparition animée pour l'incertain — cf. [`loading.md`](./loading.md)), erreur, vide (pour les listes)

## i18n

- [ ] Aucune string littérale visible ; toutes les clés présentes dans **toutes** les locales

## Data & erreurs

- [ ] Toute erreur : `console.error` + `crashlytics.recordError`, message utilisateur traduit
- [ ] Queries : `staleTime`/`gcTime` présents, retours nommés

## Performance

- [ ] Checklist d'optim de [`performance.md`](./performance.md#récap--checklist-doptim) passée si un écran ou une liste a été touché

## Vérification fonctionnelle

- [ ] Le changement a été **exercé réellement** (app lancée ou test qui couvre le flux) — pas seulement compilé
- [ ] Si comportement natif touché : testé sur build release (cf. [`build-release.md`](./build-release.md))

## Doc & livraison

- [ ] Si une convention a été ajoutée/modifiée : mise à jour dans le repo **rn-playbook** (docs + règle lint si encodable) — jamais dans une copie locale ; une règle propre au projet va dans son `CLAUDE.md`
- [ ] Commits conformes à [`git-workflow.md`](./git-workflow.md) (messages impératifs anglais, découpage logique)

---

## Rapport de livraison

Terminer chaque tâche par un résumé court : ce qui a été fait, les fichiers créés/modifiés, ce qui a été vérifié (et comment), les points restants ou décisions prises qui méritent l'attention du reviewer.
