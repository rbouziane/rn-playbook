# Listes, scroll & optimisation

Choix du composant de liste, règles d'optim FlatList/FlashList, mémoïsation, contexts. Animations détaillées → [`animations.md`](./animations.md). Build & release → [`build-release.md`](./build-release.md).

---

## Listes & scroll

### Choix du composant

Le bon choix dépend de la taille de la liste **et** de la complexité des items. Règle de décision :

| Cas | Composant |
|---|---|
| Contenu non-listé / nombre d'items très petit (< ~50, items simples) | `ScrollView` (de `react-native-gesture-handler`) |
| Liste moyenne (~50-500 items, items simples) | `FlatList` |
| Grande liste (500+ items) **OU** items complexes (cards, médias, animations) **OU** cible Android low-end | `FlashList` v2 |

En cas de doute → **FlashList**. C'est un drop-in replacement de FlatList et il maintient 60 FPS même sur du low-end. Pas besoin d'`estimatedItemSize` en v2 (auto-calculé).

### ScrollView

**Toujours `ScrollView` de `react-native-gesture-handler`**, jamais celui de `react-native`. Meilleure compatibilité avec React Navigation et évite les conflits de gestes imbriqués.

```ts
import { ScrollView } from 'react-native-gesture-handler';
```

À réserver aux contenus courts non-virtualisés. Pour toute liste qui scrolle vraiment beaucoup, passer à `FlatList` ou `FlashList`.

### FlatList — règles d'optim

```tsx
<FlatList
  data={items}
  keyExtractor={keyExtractor}
  renderItem={renderItem}
  // Optims obligatoires
  removeClippedSubviews
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={10}
  // Si tous les items ont la même hauteur, énorme gain
  getItemLayout={getItemLayout}
/>
```

- `keyExtractor` et `renderItem` **toujours `useCallback`** (sinon re-render de tous les items à chaque render parent)
- L'item lui-même **toujours `memo()`** (cf. [`components.md`](./components.md))
- `getItemLayout` **dès que possible** (items à hauteur fixe) — supprime le coût de mesure
- `removeClippedSubviews` activé pour libérer la mémoire des items hors écran

### FlashList — règles d'optim

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  keyExtractor={keyExtractor}
  renderItem={renderItem}
  // Pour les listes hétérogènes : recyclage par type
  getItemType={getItemType}
/>
```

Règles strictes pour ne pas casser le recyclage :

- **Pas de `key` prop sur les items ni sur leurs enfants** — ça force React à recréer le composant au lieu de le recycler, ce qui annule l'intérêt de FlashList
- **`renderItem` et `keyExtractor` toujours `useCallback`**
- **L'item est `memo()`** (cf. [`components.md`](./components.md))
- **`getItemType`** dès qu'il y a des types d'items différents (ex : header vs row vs footer) — permet à FlashList d'avoir un pool de recyclage par type, gros gain de fluidité
- Pour mapper sur un tableau dans un item, utiliser **`useMappingHelper`** de FlashList plutôt que `.map()` (gère les keys de manière compatible avec le recyclage)
- Items lourds : éviter tout calcul coûteux dans le render. Mémoïser (`useMemo`) ou pré-calculer dans le reducer

### Règles transverses (FlatList & FlashList)

- **Toujours typer `data`** explicitement (`data: Item[]`)
- **`keyExtractor`** retourne un identifiant **stable et unique** (pas `index`, sauf liste vraiment statique)
- **Images distantes** : utiliser un composant image avec cache (ex : `react-native-fast-image`) plutôt que `Image` standard
- **Animations dans les items** : passer par `react-native-reanimated` (worklets sur le thread UI), jamais `Animated` JS
- **Listes imbriquées** verticales/horizontales : préférer FlashList qui coordonne mieux les layouts parent/enfant

### Pull-to-refresh

```tsx
<FlashList
  refreshControl={
    <RefreshControl
      refreshing={isItemsPending}
      onRefresh={refetchItems}
    />
  }
  // ...
/>
```

`refreshing` et `onRefresh` viennent directement du hook de query (cf. [`data-fetching.md`](./data-fetching.md)).

---

## Optimisation

Règles pour garder un re-render minimal et un thread JS fluide. **Mesurer avant d'optimiser** : utiliser l'outil de debug du projet (Reactotron, React DevTools Profiler…) pour identifier les re-renders inutiles et les calculs coûteux avant d'ajouter des `memo`/`useMemo`/`useCallback` partout.

### `useCallback`

**Obligatoire dans ces cas :**

- La fonction est **prop d'un composant `memo()`** (sans `useCallback`, la référence change à chaque render → le `memo` ne sert à rien)
- La fonction est **dépendance d'un autre hook** (`useEffect`, `useMemo`, autre `useCallback`)
- La fonction est passée à `FlatList` / `FlashList` (`renderItem`, `keyExtractor`)

**Inutile dans ces cas** (overhead du hook supérieur au gain) :

- La fonction n'est consommée que par un composant non-`memo()`
- La fonction est utilisée localement (pas passée comme prop)

```ts
// ✅ obligatoire : props.onPress consomme un Pressable, mais surtout
//    handlePress est utilisé par un enfant memo() un peu plus bas
const handlePress = useCallback(() => {
  props.onPress(props.itemId);
}, [props.onPress, props.itemId]);

// ❌ inutile : utilisé localement, jamais passé en prop
const handleLog = useCallback(() => {
  console.log('clicked');
}, []);
```

### `useMemo`

**Obligatoire dans ces cas :**

- **Calcul lourd** (filtrage, tri, transformation d'une liste, regex, parsing)
- **Objet ou tableau passé en prop d'un `memo()`** (sinon nouvelle référence à chaque render → le `memo` est cassé)
- **Dépendance d'un autre hook**

**Inutile dans ces cas :**

- Calcul trivial (`a + b`, concaténation simple, `props.x.toUpperCase()`)
- Valeur primitive (string, number, boolean) — la comparaison par valeur est gratuite

```ts
// ✅ obligatoire : tri d'une liste
const sortedItems = useMemo(() => {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}, [items]);

// ✅ obligatoire : objet passé en prop d'un enfant memo()
const config = useMemo(() => ({
  showHeader: true,
  showFooter: false,
}), []);

// ❌ inutile
const fullName = useMemo(() => `${first} ${last}`, [first, last]);
```

### Stabilité des références (règle d'or)

Quand un objet, un tableau ou une fonction est passé à un composant `memo()`, sa **référence doit être stable**. Sinon, `memo()` ne sert strictement à rien.

```tsx
const Parent = memo((props: Props) => {
  // ❌ Nouveau tableau à chaque render → ChildList re-render à chaque fois,
  //    même si props.items n'a pas changé
  return <ChildList data={props.items.filter((i) => i.isActive)} />;
});

// ✅
const Parent = memo((props: Props) => {
  const activeItems = useMemo(() => {
    return props.items.filter((i) => i.isActive);
  }, [props.items]);

  return <ChildList data={activeItems} />;
});
```

### State : pas de valeurs dérivées

Si une valeur peut être **calculée à partir d'autres valeurs** (props, autre state), **ne pas la stocker dans un `useState`**. Calculer à la volée (ou avec `useMemo` si lourd).

```ts
// ❌ État dérivé
const [items, setItems] = useState<Item[]>([]);
const [count, setCount] = useState(0);

useEffect(() => {
  setCount(items.length);
}, [items]);

// ✅ Calculé directement
const [items, setItems] = useState<Item[]>([]);
const count = items.length;
```

### Context : limiter les re-renders globaux

Tout consommateur d'un Context se re-render dès que **n'importe quelle** valeur du Context change, même celles qu'il ne lit pas.

**Règles :**

- **Splitter les Contexts par préoccupation** : un Context = un groupe de valeurs qui changent ensemble. Mieux vaut 3 Contexts dédiés qu'un seul Context fourre-tout
- **`useContextSelector`** (lib `use-context-selector`) pour ne re-render que sur la portion lue. À utiliser dès qu'un Context expose plusieurs valeurs indépendantes

```ts
// ❌ Tout consommateur de InitContext re-render quand n'importe quelle valeur change
const { isInitialized, theme, locale } = useInitContext();

// ✅ Re-render uniquement quand isInitialized change
const isInitialized = useInitContextSelector((context) => context.isInitialized);
```

### Différer les calculs lourds après animations

Pour ne pas freezer une transition d'écran ou une animation, **différer les calculs lourds** après le frame en cours.

```ts
import { InteractionManager } from 'react-native';

useEffect(() => {
  const handle = InteractionManager.runAfterInteractions(() => {
    // calcul lourd, fetch, parsing…
  });

  return () => handle.cancel();
}, []);
```

À utiliser pour : data lourde au mount d'un écran, parsing au reveal d'un modal, etc.

### Animations sur le thread UI

**Toutes les animations passent par `react-native-reanimated`** (worklets exécutés sur le thread UI, jamais bloqué par JS). **Jamais `Animated` natif RN** (driver JS, sujet aux drops de frame).

```ts
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
```

## Build & production

Déplacé dans [`build-release.md`](./build-release.md) : strip des `console.*`, React Compiler, R8/ProGuard, installation de paquets natifs, QA release.

---

### Récap : checklist d'optim

Avant de livrer un écran, vérifier :

- [ ] Tous les composants sont `memo()`
- [ ] Toutes les fonctions passées à un enfant `memo()` sont `useCallback`
- [ ] Tous les objets/tableaux passés à un enfant `memo()` sont `useMemo`
- [ ] Aucun calcul coûteux n'est fait inline dans le JSX
- [ ] Aucune valeur dérivée n'est stockée dans un `useState`
- [ ] Les listes utilisent le bon composant (cf. « Listes & scroll » ci-dessus)
- [ ] Les images distantes utilisent le composant image avec cache
- [ ] Les animations passent par `react-native-reanimated`
- [ ] Les Contexts sont splittés ou consommés via `useContextSelector`
