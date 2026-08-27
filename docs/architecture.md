# Architecture & Types

Structure du projet, règles de placement, conventions de typage.

## Règles en bref

- Critère de placement universel : **appartenance au domaine métier**, pas le nombre de consommateurs
- Cross-feature : uniquement via l'`index.ts` de la feature (`~features/X`), jamais par chemin interne
- Tout le global vit dans `shared/` ; tout import via l'alias `~` → `./app/`
- `type` par défaut (pas d'`interface`) ; un fichier = un type principal + ses types liés
- Types API : snake_case + suffixe `Api`, confinés à `services/` ; types App : camelCase ; les reducers font le pont
- Enums (SCREAMING_SNAKE_CASE) plutôt qu'unions de strings ; `null` conservé (pas transformé en `?`)
- Pas de `any` (sauf `catch (error: any)`), pas d'`as` sauf cas justifié documenté
- Fonction/hook : 1 argument positionnel, 2+ → objet `params` typé `XxxParams`

Le détail et les exemples ci-dessous. Pour la table de décision « où mettre ce code ? » → [`placement.md`](./placement.md).

---

## Architecture

### Arborescence racine

```
app/
├── api/          # Client HTTP (instance axios, intercepteurs, config)
├── features/     # Modules métier (voir ci-dessous)
├── navigators/   # Config navigation
├── packs/        # Données de contenu transverses (packs de cartes par langue) + loader
├── shared/       # Tout le global : components, constants, contexts, theme, utils…
└── i18n/         # Traductions
```

> `packs/` est un concern transverse (data + chargement), pas un module métier — il vit à la racine, au même niveau que `features/`, et s'importe via l'alias `~packs`.

### Structure de `shared/`

`shared/` regroupe tout ce qui est **agnostique du domaine métier**, avec la même organisation qu'une feature :

```
shared/
├── assets/       # Assets transverses (svg/, images/, fonts/, sounds/)
├── ui/
│   └── components/     # Primitives UI génériques (Button, Divider, AppBottomSheet, Skeleton*)
├── layout/
│   └── components/     # Échafaudage d'écran (ScreenContainer, top bars, ScreenCTA…)
├── constants/    # Constantes qui n'appartiennent à aucun module (Env…)
├── contexts/     # Contexts globaux (ThemeContext…)
├── hooks/        # Hooks agnostiques (useDebounce, useAppState…)
├── services/     # Services transverses (audio, haptics…) — modules non-React
├── storage/      # Module MMKV : chiffrement, clés (cf. storage.md)
├── theme/        # Design tokens (cf. theming.md)
├── toast/        # Module toast : composant, context, hook, constantes
├── types/        # Types partagés (types/api/ pour les types Api partagés)
└── utils/        # Fonctions pures utilitaires (pas de hook, pas de side effect)
```

### Module transverse dans `shared/`

Un concern transverse qui pèse plus qu'un fichier (toast, storage, tooltip, file d'attente…) est un **module** : il porte lui-même ses composants, contexts, hooks, constantes et types, avec la même organisation qu'une feature.

```
shared/toast/
├── components/   # ErrorToast
├── constants/    # durées et configs d'animation du toast
├── contexts/     # ToastContext (provider + selector)
└── hooks/        # useToastAnimation
```

À l'intérieur du module, imports relatifs ; depuis l'extérieur, chemin complet (`~shared/toast/contexts/ToastContext`).

Corollaire : `shared/constants/`, `shared/hooks/` et `shared/services/` ne sont **pas** des dépôts par type. On n'y met que ce qui n'appartient à aucun module (`Env`, `useDebounce`…). Une constante qui n'a qu'un module consommateur descend dans ce module (cf. [`placement.md`](./placement.md)).

La distinction `ui/` vs `layout/` : une primitive **ui** s'utilise n'importe où dans un écran (bouton, divider, sheet) ; un composant **layout** structure l'écran lui-même (container avec insets, barre de titre, zone CTA). Tout écran se construit sur `ScreenContainer` (ou équivalent) plutôt qu'en regérant les insets à la main.

Pas de dossier « misc » ou « helpers » fourre-tout : si un fichier ne rentre dans aucune de ces cases, sa place est probablement dans une feature.

### Module feature

```
features/my-feature/
├── index.ts         # API publique de la feature (voir plus bas)
├── assets/          # SVGs et images propres à la feature
├── components/      # Composants de la feature (voir organisation ci-dessous)
├── contexts/        # Context providers scopés à la feature
├── enums/           # Enums propres à la feature
├── hooks/           # Hooks métier (UI, logique)
├── screens/         # Écrans de la feature
├── services/        # Logique métier, types, data
│   ├── api.ts       # Appels HTTP (fonctions pures, pas de hooks)
│   ├── hook.ts      # Hooks TanStack Query / Mutation
│   ├── reducer.ts   # Transformations API → App (XxxApi → Xxx)
│   └── types.ts     # Types API (snake_case, suffixe Api)
└── types/           # Types domaine de la feature (camelCase)
```

### Organisation du dossier `components/`

Quand une feature contient plusieurs écrans avec leurs propres composants, le dossier `components/` se subdivise en sous-dossiers par domaine visuel. Un sous-dossier `shared/` regroupe les primitives partagées entre les écrans de la feature.

```
features/my-feature/
└── components/
    ├── shared/       # Primitives partagées entre écrans (Row, Section, Header…)
    ├── screen-a/     # Composants propres à l'écran A
    └── screen-b/     # Composants propres à l'écran B
```

**Exemple concret — feature `settings` :**

```
features/settings/
└── components/
    ├── shared/          # SettingsRow, SettingsSection, ScreenHeader
    ├── settings/        # AppearanceSection, SoundSection, FeedbackSection…
    ├── help/            # FAQList, ContactCard
    └── about/           # AuthorCard, StoryCard, LinksCard, SupportCard
```

**Quand subdiviser ?** Dès que des groupements naturels apparaissent par écran ou domaine visuel et que la subdivision apporte de la clarté. Un dossier plat suffit tant que la structure reste lisible.

### Règles de placement

Le critère est l'**appartenance au domaine métier**, pas le nombre de features qui consomment le code.

- Composant **propre à un domaine métier** → reste dans `features/X/components/`, **même s'il est consommé par d'autres features**
  - Ex : `ItemCard` reste dans `features/item/`, même si `admin` l'utilise
- Composant **agnostique du domaine** (générique, réutilisable) → `shared/ui/components/`
  - Ex : `Collapse`, `Button`, `Modal`
- Composant **hybride 2 domaines** → vit dans la feature dont c'est la **logique métier principale**, pas l'affichage
  - Ex : `AdminItemCard` (carte item avec logique admin) → `features/admin/`
  - Préférer la composition (children, slots) à un composant hybride quand c'est possible

Mêmes règles pour les **types**, **hooks** et **enums**.

#### Cas spécifique : hooks

- Hook lié à un domaine métier → `features/X/hooks/`
- Hook agnostique réutilisable (ex : `useDebounce`, `useKeyboard`, `useAppState`) → `shared/hooks/`
- Hook de **data fetching** (TanStack Query/Mutation) → toujours dans `features/X/services/hook.ts` (cf. `data-fetching.md`), **jamais** dans `hooks/`

### API publique d'une feature (`index.ts`)

Chaque feature expose un fichier `index.ts` à sa racine qui ré-exporte ce qui est consommable depuis l'extérieur. **Les imports cross-features passent obligatoirement par cet `index.ts`**, jamais par les chemins internes.

Les ré-exports sont **groupés par catégorie**, chaque groupe précédé d'un commentaire de section (`// Components`, `// Hooks`…), dans cet **ordre fixe** :

`Screens` → `Components` → `Contexts` → `Hooks` → `Services` → `Enums` → `Constants` → `Types` → `Trackers` → `Utils` → `Helpers`

La catégorie suit le dossier d'origine du symbole (`components/` → `Components`, `hooks/` → `Hooks`, `enums/` → `Enums`…). Un hook de data-fetching (`services/hook`) va dans `Hooks` ; les autres exports de `services/` (api, reducer) dans `Services`. Un fichier à la racine de la feature (ex : `TrackingHelper`) va dans `Helpers`. On n'écrit que les sections réellement peuplées.

```ts
// features/item/index.ts
// Components
export { default as ItemCard } from './components/ItemCard';

// Hooks
export { useItem } from './services/hook';

// Types
export type { Item } from './types/Item';
```

```ts
// ✅ Depuis features/admin/
import { ItemCard } from '~features/item';

// ❌
import ItemCard from '~features/item/components/ItemCard';
```

Règles :

- Re-export simple, **pas de renommage** à l'export (le nom externe = le nom interne)
- Un export default se ré-exporte en nommé : `export { default as ItemCard }` — côté consommateur, il devient donc un import nommé (`import { ItemCard } from '~features/item'`)
- Ré-exports **groupés par section commentée**, dans l'ordre fixe ci-dessus
- Tout ce qui n'est pas dans `index.ts` est considéré comme **privé** à la feature
- À l'intérieur d'une feature, on importe par chemins relatifs ou alias internes — pas par `~features/X` (pas d'auto-référence)

### Règles de fichier

- **Un fichier = un composant** (pas de regroupement de plusieurs composants dans un même fichier)
- **Ordre dans un fichier composant** :
  1. Imports
  2. `type Props`
  3. Composant
  4. `StyleSheet.create()`
  5. `export default`

### Alias d'import

Tous les imports passent par `~` → `./app/` :

```ts
import { translate } from '~i18n/translate';
import { theme } from '~shared/theme';
import api from '~api/api';
import { ItemCard } from '~features/item';
```

---

## Types

### Localisation

Le critère est l'**appartenance au domaine métier**, comme pour les composants.

| Type                   | Localisation                   | Convention                       |
| ---------------------- | ------------------------------ | -------------------------------- |
| App (métier) — feature | `features/X/types/Item.ts`     | camelCase fields                 |
| App (métier) — partagé | `app/shared/types/Item.ts`     | camelCase fields                 |
| API — feature          | `features/X/services/types.ts` | snake_case fields, suffixe `Api` |
| API — partagé          | `app/shared/types/api/Item.ts` | snake_case fields, suffixe `Api` |

Les **reducers font le pont** entre les deux mondes (`XxxApi` → `Xxx`). Un type API ne doit **jamais** sortir de la couche `services/`. Un composant ne manipule que des types App.

### `type` vs `interface`

**`type` par défaut**, partout. Pas d'`interface` sauf cas justifié (ex : extension de classe, ce qui ne devrait pas arriver).

```ts
// ✅
type Item = {
  id: number;
  name: string;
};

// ❌
interface Item {
  id: number;
  name: string;
}
```

### Un fichier = un type principal

Un fichier contient **un type principal** + ses types **liés** (sous-structures qui ne sont jamais utilisées sans le type principal). Si un type est utilisé indépendamment ailleurs, il a son propre fichier.

```ts
// ✅ Item.ts — Item + ses sous-types liés
export type Item = {
  id: number;
  name: string;
  variants: ItemVariant[];
};

export type ItemVariant = {
  sku: string;
  price: number;
};
```

### Naming des sous-types de domaine

Préfixer les sous-types avec le nom du type parent pour grouper visuellement.

```ts
// ✅
type Item = {
  /* ... */
};
type ItemVariant = {
  /* ... */
};
type ItemOption = {
  /* ... */
};
type ItemCategory = {
  /* ... */
};

// ❌
type Item = {
  /* ... */
};
type Variant = {
  /* ... */
};
type Option = {
  /* ... */
};
```

### Enums plutôt qu'union de strings

Pour un ensemble de valeurs possibles, **toujours une enum**, jamais une union de strings.

```ts
// ✅
export enum ITEM_STATUS {
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
}

type Item = {
  status: ITEM_STATUS;
};

// ❌
type Item = {
  status: 'pending' | 'shipped' | 'delivered';
};
```

### Champs nullables

Les valeurs absentes côté API arrivent en `null`. **Les conserver en `null` côté App**, ne pas les transformer en optionnel (`?: string`).

```ts
// API
type ItemApi = {
  description: string | null;
};

// ✅ App — on garde null
type Item = {
  description: string | null;
};

// ❌ App — pas de transformation en optionnel
type Item = {
  description?: string;
};
```

### Pas de `any`, pas d'`as`

- **`any` interdit** sauf le cas spécifique `catch (error: any)`
- Pour les valeurs non-typées (data brute avant validation), utiliser **`unknown`** et faire un type guard
- **`as` (type assertion) interdit** sauf cas justifié — préférer un type guard

```ts
// ❌
const data = response as Item;

// ✅
if (isItem(response)) {
  const data = response;
}
```

### Params de fonction / hook

- **1 argument** → positionnel
- **2+ arguments** → objet `params` typé avec un type dédié à suffixe `Params`

```ts
// ✅ 1 arg
export const useItemQuery = (itemId: number) => {
  /* ... */
};

// ✅ 2+ args
type UpdateItemParams = {
  itemId: number;
  fields: ItemFields;
};

export const useUpdateItemMutation = () => {
  return useMutation({
    mutationFn: (params: UpdateItemParams) => updateItemApi(params),
  });
};
```
