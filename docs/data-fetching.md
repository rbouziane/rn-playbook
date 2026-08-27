# Data fetching & gestion d'erreur

Hooks, services API, reducers, queries, mutations, et gestion d'erreur transverse.

## Règles en bref

- 3 fichiers, 3 rôles : `api.ts` (fetch + throw, types `Api`), `reducer.ts` (pure `Api → App`), `hook.ts` (TanStack Query)
- Le reducer est appelé **dans le `queryFn`**, wrappé d'un `try/catch` obligatoire
- Le hook retourne des **propriétés nommées** (`item`, `isItemPending`, `itemError`), jamais `data` brut
- `staleTime` + `gcTime` obligatoires (constantes `CACHE_TIME`) ; params du hook dans la `queryKey`
- Mutations : `mutateAsync` par défaut, optimistic update dès que possible
- Toute erreur : `console.error` + `crashlytics.recordError`, format `[Error] {context}: {message}` ; message utilisateur toujours `translate()`

Le détail et les exemples ci-dessous.

---

## Client API

Une **instance HTTP unique** vit dans `app/api/` et est la seule porte de sortie réseau :

- Configuration centralisée : base URL, timeout, headers par défaut
- **Intercepteurs** : injection du token d'auth, refresh token, logging dev — jamais gérés dans les fonctions `api.ts` des features
- Les fonctions des features consomment cette instance (`api.get<T>`, `api.post<T>`…) et ne créent **jamais** leur propre client
- Le shape de la réponse (`response.ok`, `response.data`) est celui de l'instance centralisée — si le wrapper change, seul `app/api/` change

---

## Data fetching (hooks & services)

### Séparation des responsabilités

- `api.ts` → fetch + throw, retourne le type **brut** (suffixe `Api`)
- `reducer.ts` → transforme `XxxApi` → type app. **Fonction pure** : pas d'async, pas de side effect, juste du mapping de données
- `hook.ts` → appelle le reducer **dans le `queryFn`** (jamais dans `api.ts`)
- Le hook retourne des **propriétés nommées**, jamais `data` brut

### `api.ts`

Fetch et throw on error. Retourne le type API brut.

```ts
export const getItemApi = async (itemId: number) => {
  const response = await api.get<ItemApi>(`/items/${itemId}`);

  if (!response.ok || !response.data) {
    throw new Error('...');
  }

  return response.data;
};
```

### `reducer.ts`

Pure function `Api → App`. Pas d'async, pas de side effect.

```ts
export const itemReducer = (data: ItemApi): Item => {
  return {
    id: data.id,
    name: data.item_name,
    priceCents: data.price_cents,
  };
};
```

---

### Queries

#### Règles

- Suffixe `Query` sur le hook : `useItemQuery`
- `try/catch` **obligatoire** autour du reducer dans le `queryFn` (sinon crash)
- `staleTime` et `gcTime` **obligatoires** — si la donnée doit toujours être fraîche (jamais de cache), utiliser `staleTime: 0`. Si la donnée est considérée valide indéfiniment (ex : données de config statiques), utiliser `CACHE_TIME.INFINITY`
- Le param du hook se retrouve dans la **`queryKey`** et dans l'appel API
- Retour ordonné : **data → état → error → callbacks**

#### Hook simple (sans param)

```ts
export const useItemsQuery = () => {
  const {
    data: items,
    isPending: isItemsPending,
    error: itemsError,
    refetch: refetchItems,
  } = useQuery({
    queryKey: [QUERY_KEY.ITEMS],
    queryFn: async () => {
      const response = await getItemsApi();

      try {
        return itemsReducer(response);
      } catch (error: any) {
        console.error(`[Error] itemsReducer: ${error.message}`);
        throw new Error('...');
      }
    },
    staleTime: CACHE_TIME.HOUR_1,
    gcTime: CACHE_TIME.HOUR_6,
  });

  return {
    items,
    isItemsPending,
    itemsError,
    refetchItems,
  };
};
```

#### Hook avec param

Le param est passé en argument du hook, ajouté à la `queryKey`, et transmis à la fonction API.

```ts
export const useItemQuery = (itemId: number) => {
  const {
    data: item,
    isPending: isItemPending,
    error: itemError,
  } = useQuery({
    queryKey: [QUERY_KEY.ITEM, itemId],
    queryFn: async () => {
      const response = await getItemApi(itemId);

      try {
        return itemReducer(response);
      } catch (error: any) {
        console.error(`[Error] itemReducer: ${error.message}`);
        throw new Error('...');
      }
    },
    staleTime: CACHE_TIME.HOUR_1,
    gcTime: CACHE_TIME.HOUR_6,
  });

  return {
    item,
    isItemPending,
    itemError,
  };
};
```

#### Queries dépendantes (`enabled`)

Quand une query dépend d'une valeur qui peut être absente (param optionnel, résultat d'une autre query), utiliser `enabled` — **jamais** de `queryFn` conditionnel ni de hook appelé conditionnellement.

```ts
export const useItemDetailQuery = (itemId: number | null) => {
  const { data: itemDetail, isPending: isItemDetailPending } = useQuery({
    queryKey: [QUERY_KEY.ITEM_DETAIL, itemId],
    queryFn: async () => {
      /* ... */
    },
    enabled: itemId != null,
    staleTime: CACHE_TIME.HOUR_1,
    gcTime: CACHE_TIME.HOUR_6,
  });

  return { itemDetail, isItemDetailPending };
};
```

#### Listes paginées (`useInfiniteQuery`)

Pour toute liste paginée côté API, `useInfiniteQuery` avec les mêmes conventions (reducer dans le `queryFn`, retours nommés). Le hook expose la liste **aplatie** (`useMemo` sur `data.pages`), jamais la structure `pages` brute.

```ts
export const useItemsInfiniteQuery = () => {
  const { data, fetchNextPage, hasNextPage, isPending } = useInfiniteQuery({
    queryKey: [QUERY_KEY.ITEMS],
    queryFn: ({ pageParam }) => {
      /* getItemsApi(pageParam) + reducer */
    },
    initialPageParam: 1,
    getNextPageParam: lastPage => lastPage.nextPage,
    staleTime: CACHE_TIME.HOUR_1,
    gcTime: CACHE_TIME.HOUR_6,
  });

  const items = useMemo(() => {
    return data?.pages.flatMap(page => page.items) ?? [];
  }, [data]);

  return {
    items,
    isItemsPending: isPending,
    fetchNextItems: fetchNextPage,
    hasNextItems: hasNextPage,
  };
};
```

---

### Mutations

#### Règles

- Suffixe `Mutation` sur le hook : `useUpdateItemMutation`
- **`mutateAsync` par défaut** (permet de `await` pour navigation, toast, etc.). `mutate` uniquement pour fire-and-forget (analytics, log non-bloquant)
- `mutationKey` **uniquement si plusieurs mutations du même type peuvent tourner en parallèle**. Sinon, omettre
- `onSuccess` (invalidation de queries) géré dans le hook par défaut, sauf cas spécifique au composant
- Optimistic updates **à utiliser dès que c'est possible** (UX immédiate)

#### Hook de mutation

```ts
export const useArchiveItemMutation = () => {
  const {
    mutateAsync: archiveItemMutate,
    isPending: isArchiveItemPending,
    error: archiveItemError,
  } = useMutation({
    mutationFn: (tokenValue: string) => archiveItemApi(tokenValue),
  });

  return {
    archiveItemMutate,
    isArchiveItemPending,
    archiveItemError,
  };
};
```

#### Optimistic update

Pattern via `onMutate` : annuler les queries en cours, snapshot la valeur précédente, mettre à jour optimistiquement, retourner le snapshot pour rollback en cas d'erreur.

```ts
export const useUpdateItemMutation = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: updateItemMutate, isPending: isUpdateItemPending } =
    useMutation({
      mutationFn: (params: UpdateItemParams) => updateItemApi(params),

      onMutate: async params => {
        await queryClient.cancelQueries({ queryKey: [QUERY_KEY.ITEM] });

        const previousItem: Item | undefined = queryClient.getQueryData([
          QUERY_KEY.ITEM,
        ]);

        if (!previousItem) {
          console.error('Error: updateItem optimisticData user not found');
          crashlytics.recordError(
            new Error('Error: updateItem optimisticData user not found'),
          );

          throw new Error(translate('error.updateItem'));
        }

        const futureItem = {
          ...previousItem,
          itemFields: {
            ...previousItem.itemFields,
            name: params.fields.name ?? false,
          },
        };

        queryClient.setQueryData([QUERY_KEY.ITEM], futureItem);

        return { previousItem };
      },

      onError: (_error, _params, context) => {
        if (context?.previousItem) {
          queryClient.setQueryData([QUERY_KEY.ITEM], context.previousItem);
        }
      },
    });

  return {
    updateItemMutate,
    isUpdateItemPending,
  };
};
```

---

### Naming des retours de hook

Pattern strict pour rester prévisible :

| Élément          | Pattern             | Exemple               |
| ---------------- | ------------------- | --------------------- |
| Donnée (query)   | `{name}`            | `item`, `items`       |
| État pending     | `is{Name}Pending`   | `isItemPending`       |
| Erreur           | `{name}Error`       | `itemError`           |
| Refetch (query)  | `refetch{Name}`     | `refetchItem`         |
| Mutation fn      | `{action}Mutate`    | `updateItemMutate`    |
| Pending mutation | `is{Action}Pending` | `isUpdateItemPending` |

### Constantes

- Clés de query/mutation centralisées dans `~api/constants/QueryKey` (enum `QUERY_KEY`)
- Durées de cache centralisées dans `~api/constants/CacheTime` (`CACHE_TIME.HOUR_1`, `CACHE_TIME.HOUR_6`, `CACHE_TIME.INFINITY`…) — les deux appartiennent à la couche réseau, pas à `shared/constants/`

---

## Gestion d'erreur

### Principes

- **Toute erreur loggée** : `console.error` (lisible en dev) **+** `crashlytics.recordError` (suivi en prod)
- **Format de log strict** : `[Error] {context}: {message}` — facile à grep dans Crashlytics
- **Message utilisateur toujours traduit** via `translate()` (cf. [`i18n.md`](./i18n.md)) — la couche affichage peut rendre l'erreur directement sans traitement
- **Erreurs réseau gérées par TanStack Query** (retry, cache) — ne pas les catcher manuellement dans `api.ts`
- **`error: any` autorisé uniquement** dans les `catch` (cf. [`architecture.md`](./architecture.md#pas-de-any-pas-das))

### Trois couches, trois responsabilités

| Couche                | Rôle                                             | Action                                                                  |
| --------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `api.ts`              | Détecter l'échec HTTP / payload invalide         | `throw new Error(...)` brut, pas de log (TanStack Query catch en amont) |
| `reducer.ts`          | Détecter une donnée malformée pendant le mapping | log + `crashlytics.recordError` + `throw` message utilisateur traduit   |
| `hook.ts` (`queryFn`) | Wrapper le reducer, re-throw pour TanStack       | log + re-throw                                                          |
| Composant             | Afficher l'erreur                                | utilise `xxxError` du hook, affiche un toast / banner / `ErrorState`    |

### `api.ts`

Pas de log ici, juste throw. Les erreurs réseau remontent naturellement à TanStack Query qui gère le retry.

```ts
export const getItemApi = async (itemId: number) => {
  const response = await api.get<ItemApi>(`/items/${itemId}`);

  if (!response.ok || !response.data) {
    throw new Error('Failed to fetch item');
  }

  return response.data;
};
```

### `reducer.ts`

Le reducer ne devrait pas throw en théorie (data déjà reçue), mais s'il throw, c'est qu'il y a une malformation côté API → erreur critique à logger.

```ts
export const itemReducer = (data: ItemApi): Item => {
  if (data.id == null || data.product_name == null) {
    throw new Error('Invalid item payload');
  }

  return {
    id: data.id,
    name: data.product_name,
    priceCents: data.price_cents,
  };
};
```

### `hook.ts` — try/catch obligatoire

```ts
queryFn: async () => {
  const response = await getItemApi(itemId);

  try {
    return itemReducer(response);
  } catch (error: any) {
    console.error(`[Error] itemReducer: ${error.message}`);
    crashlytics.recordError(error, '[Error] itemReducer');
    throw new Error(translate('error.item.notFound'));
  }
};
```

### Mutations — pareil

Pour les mutations, mêmes principes dans `onMutate`/`onError`/`mutationFn` :

```ts
onMutate: async params => {
  const previousItem = queryClient.getQueryData([QUERY_KEY.ITEM]);

  if (!previousItem) {
    console.error('[Error] updateItem: previousItem not found');
    crashlytics.recordError(
      new Error('previousItem not found'),
      '[Error] updateItem',
    );
    throw new Error(translate('error.item.update'));
  }

  // ...
};
```

### Affichage côté composant

Le composant lit l'erreur directement depuis le hook (cf. les patterns de queries ci-dessus). Le message est déjà traduit, prêt à afficher.

```tsx
const { item, isItemPending, itemError } = useItemQuery(itemId);

if (itemError) {
  return <ErrorState message={itemError.message} />;
}
```

### ErrorBoundary

Un `ErrorBoundary` global au niveau racine (autour de `AppNavigator`) attrape les crashs React non capturés et :

- Log dans Crashlytics
- Affiche un fallback `ErrorState` plein écran avec un bouton retry

```tsx
<ErrorBoundary>
  <AppNavigator />
</ErrorBoundary>
```

Pas besoin d'`ErrorBoundary` par écran — la majorité des erreurs sont déjà gérées via les hooks de query/mutation.

### Logs en dev uniquement

`console.error` peut bruiter en prod. Wrapper dans un helper conditionné par `__DEV__` :

```ts
// ~shared/utils/logger.ts
export const logError = (message: string, error?: Error) => {
  if (__DEV__) {
    console.error(message, error);
  }
};
```

Crashlytics, lui, est appelé dans tous les environnements (mais filtré côté Firebase si besoin).

```ts
try {
  return itemReducer(response);
} catch (error: any) {
  logError(`[Error] itemReducer: ${error.message}`, error);
  crashlytics.recordError(error, '[Error] itemReducer');
  throw new Error(translate('error.item.notFound'));
}
```
