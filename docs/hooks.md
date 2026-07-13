# Hooks de logique

Hooks métier et hooks de logique d'écran : structure, naming, discipline `useEffect`. Les hooks de data-fetching (TanStack) ont leurs propres règles → [`data-fetching.md`](./data-fetching.md).

## Règles en bref

- **Aucune logique dans un screen** : état, effets, callbacks vivent dans un hook dédié `useXxxScreenLogic`
- Retour = objet à **propriétés nommées**, ordonné data → état → callbacks (comme les hooks de query)
- Un hook = une responsabilité ; un gros hook se découpe en hooks composés
- `useEffect` en dernier recours : jamais pour de l'état dérivé, jamais pour réagir à un clic
- Params : 1 argument positionnel, 2+ → objet `XxxParams` (cf. [`architecture.md`](./architecture.md))

---

## Hook de logique d'écran

Chaque écran a **un** hook de logique, nommé `use{NomEcran}ScreenLogic`, dans `features/X/hooks/`. Le screen devient purement déclaratif : il appelle le hook et compose des composants.

```tsx
// features/game/screens/game-screen.tsx
const GameScreen = memo(() => {
  const { round, isRoundPending, handleCardPress, handleQuit } =
    useGameScreenLogic();

  return (
    <Screen>
      <RoundHeader round={round} onQuit={handleQuit} />
      <CardBoard isLoading={isRoundPending} onCardPress={handleCardPress} />
    </Screen>
  );
});
```

```ts
// features/game/hooks/useGameScreenLogic.ts
export const useGameScreenLogic = () => {
  const { round, isRoundPending } = useRoundQuery();

  const [isPaused, setIsPaused] = useState(false);

  const handleCardPress = useCallback((cardId: string) => {
    /* ... */
  }, []);

  const handleQuit = useCallback(() => {
    NavigatorUtils.goBack();
  }, []);

  return {
    round,
    isRoundPending,
    isPaused,
    handleCardPress,
    handleQuit,
  };
};
```

Règles :

- Le hook peut consommer d'autres hooks (queries, contexts, hooks métier) — c'est lui le point d'assemblage
- Le screen ne reçoit **que ce qu'il affiche ou transmet** : pas de setters bruts (`setIsPaused`), exposer des callbacks intentionnels (`handlePause`)
- S'il dépasse ~100 lignes, extraire des hooks métier dédiés (`useGameTimer`, `useGameSound`…) que le hook d'écran compose

## Hooks métier

Un hook métier encapsule **une** préoccupation (timer, permission, son, clavier…) et vit dans `features/X/hooks/` (ou `shared/hooks/` s'il est agnostique — cf. [`placement.md`](./placement.md)).

- Fichier = nom du hook : `useGameTimer.ts`
- Retour typé implicitement par l'objet retourné ; propriétés nommées, jamais de tuple (sauf mimétisme volontaire d'un `useState`)
- Pas de JSX dans un hook

## Ordre interne d'un hook (et d'un composant)

1. Hooks externes (queries, contexts, navigation)
2. `useState` / `useRef` / `useSharedValue`
3. Valeurs dérivées (`useMemo`, calculs)
4. Callbacks (`useCallback`)
5. Effets (`useEffect`) — en dernier, proches du `return`
6. `return`

Regrouper les hooks liés, séparer les groupes par une ligne vide (cf. [`components.md`](./components.md#espacement-vertical)).

## Discipline `useEffect`

`useEffect` est un **dernier recours** : il synchronise le composant avec un système externe (listener natif, timer, subscription). Tout le reste a une meilleure solution.

| Besoin                                        | ❌ Pas un effect                  | ✅ Solution                                  |
| --------------------------------------------- | --------------------------------- | -------------------------------------------- |
| Valeur calculée depuis state/props            | `useEffect` + `setState`          | calcul direct ou `useMemo`                   |
| Réagir à une action utilisateur               | effect qui observe un state       | le faire dans le `handleXxx`                 |
| Fetch de données                              | `useEffect` + fetch               | TanStack Query                               |
| Réinitialiser un state quand une prop change  | effect sur la prop                | prop `key` sur le composant                  |

Quand un effect est justifié :

- **Cleanup obligatoire** dès qu'on souscrit (listener, timer, subscription) : `return () => { ... }`
- **Dépendances exhaustives** — jamais de tableau menteur pour « faire marcher »
- Un effect = une préoccupation ; deux logiques indépendantes = deux effects
- Effect exécuté une fois au mount : `[]` + commentaire disant pourquoi c'est du « une fois »

```ts
// ✅ synchronisation avec un système externe, cleanup
useEffect(() => {
  const subscription = AppState.addEventListener('change', handleAppStateChange);

  return () => subscription.remove();
}, [handleAppStateChange]);
```
