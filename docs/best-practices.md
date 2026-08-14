# Bonnes pratiques projet

Règles transverses pour garder un projet React Native sain : outillage, langage, qualité.
Spécificités de _ce_ projet (stack, versions) → `CLAUDE.md`.

---

## Gestionnaire de paquets : `yarn`, jamais `npm`

Le projet est verrouillé sur **Yarn** (voir `packageManager` dans `package.json` + le `yarn.lock`).

- **Jamais** `npm install` / `npm run` → génère un `package-lock.json` qui entre en conflit avec `yarn.lock`.
- Installer : `yarn` ou `yarn add <pkg>` (`yarn add -D <pkg>` en dev).
- Lancer un script : `yarn <script>`.
- Seule exception tolérée : `npx` pour un bootstrap CLI ponctuel (ex. `npx @react-native-community/cli@latest init`, cf. [`new-project.md`](./new-project.md)).

```sh
# ❌                          # ✅
npm install                   yarn
npm install lodash            yarn add lodash
npm run ios                   yarn ios
```

---

## Langage : TypeScript, jamais JavaScript

Tout fichier de code est en **`.ts` / `.tsx`**. Aucun nouveau `.js` (hors config générée type `metro.config.js`, `babel.config.js`).

- Pas de `any` (sauf `catch (error: any)`), pas de `as` sauf cas justifié.
- Typer les props, les retours de hooks, les payloads API.
- `tsc --noEmit` doit passer sans erreur avant tout commit.

---

## Outillage qualité

Trois outils, trois rôles distincts. Ils ne se remplacent pas.

| Outil          | Rôle                                  | Commande          |
| -------------- | ------------------------------------- | ----------------- |
| **Prettier**   | Formatage (indentation, quotes, `;`)  | intégré à ESLint  |
| **ESLint**     | Qualité & erreurs de code             | `yarn lint`       |
| **TypeScript** | Vérification de types                 | `yarn typecheck`  |
| **Jest**       | Tests                                 | `yarn test`       |

### Prettier

Le formatage n'est **pas** une opinion : Prettier tranche. Il tourne via `eslint-plugin-prettier`, donc un souci de format remonte comme une erreur de lint.

- Configurer le format-on-save de l'éditeur sur Prettier.
- Ne jamais discuter d'indentation en review : `yarn lint:fix` règle le débat.

### ESLint

```sh
yarn lint        # rapporte les problèmes
yarn lint:fix    # corrige ce qui est auto-corrigeable (format inclus)
```

Ne pas désactiver une règle à la légère. Si une règle gêne réellement, la désactiver **localement** avec un commentaire justifiant pourquoi (`// eslint-disable-next-line <rule> -- raison`), jamais globalement.

#### Conventions encodées dans la config

Une partie des conventions de `docs/` est **enforced en erreur de lint** via la config partagée `rn-playbook/eslint` (étendue par le `.eslintrc.js` de chaque projet) — le lint est la source d'autorité, la doc l'explication :

| Règle lint | Convention |
| --- | --- |
| `curly`, `no-else-return`, `eqeqeq` (sauf `== null`) | Code style ([`components.md`](./components.md)) |
| `react/destructuring-assignment: never` | Props jamais déstructurées |
| `@typescript-eslint/consistent-type-definitions: type` | `type` par défaut, pas d'`interface` |
| `no-restricted-imports` → `~features/*/*` | Cross-feature via l'index uniquement |
| `no-restricted-imports` → tokens theme | `theme.xxx`, pas d'import direct des fichiers de tokens |
| `no-restricted-imports` → `ScrollView`/`Animated` de `react-native` | gesture-handler / reanimated |
| `no-restricted-imports` → AsyncStorage | MMKV uniquement |
| `no-console` (warn, sauf `error`/`warn`) | Logging prod via le crash reporter |

Toute nouvelle convention récurrente doit être encodée en règle lint quand c'est possible, plutôt que seulement écrite dans la doc.

### TypeScript

```sh
yarn typecheck   # tsc --noEmit, aucune émission de fichier
```

### Tests

```sh
yarn test        # jest
```

---

## La commande `yarn quality`

Une seule commande enchaîne les trois portes de qualité, dans l'ordre du moins au plus coûteux :

```sh
yarn quality
```

```json
"quality": "yarn lint && yarn typecheck && yarn test"
```

Le `&&` fait échouer la commande dès la première étape en erreur : inutile de lancer les tests si le lint casse.

**Quand la lancer :**

- Avant chaque commit / push.
- En pré-requis de merge (idéalement branchée en CI).
- Après un gros refactor ou une montée de version de dépendance.

> Règle d'or : une branche ne se merge pas si `yarn quality` n'est pas vert.

---

## Hygiène de dépendances

- Committer `yarn.lock` à chaque changement de dépendance.
- Épingler les versions sensibles (natif, RN, navigation) ; laisser `^` sur le reste.
- Après un `yarn add` touchant du natif iOS : `cd ios && pod install` — procédure complète dans [`build-release.md`](./build-release.md#installer-un-paquet-natif--procédure).
- Nettoyer les dépendances mortes plutôt que les laisser traîner.
