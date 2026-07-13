# Contexts

Pattern d'écriture des contexts avec `use-context-selector`. Le *pourquoi* (splitting, re-renders) est dans [`performance.md`](./performance.md#context--limiter-les-re-renders-globaux) ; ici le *comment*.

## Règles en bref

- Toujours `createContext` de **`use-context-selector`**, jamais celui de React
- Un context = un groupe de valeurs qui changent ensemble ; sinon, splitter
- Valeur typée `XxxContextValue` ; context créé avec `null` par défaut
- Deux exports nommés : `useXxxContextSelector` (lecture fine) et éventuellement un hook global `useXxx`
- Le Provider est un composant `memo()` classique, **export default**
- Les setters exposés sont des `useCallback` ; jamais de `setState` brut dans la value

---

## Pattern canonique

```tsx
// features/game/contexts/GameScoresContext.tsx (ou shared/contexts/ si global)
import { memo, ReactNode, useCallback, useState } from 'react';
import { createContext, useContextSelector } from 'use-context-selector';

type GameScoresContextValue = {
  scores: Record<string, number>;
  addPoint: (playerId: string) => void;
};

const GameScoresContext = createContext<GameScoresContextValue | null>(null);

type Props = {
  children: ReactNode;
};

const GameScoresProvider = memo((props: Props) => {
  const [scores, setScores] = useState<Record<string, number>>({});

  const addPoint = useCallback((playerId: string) => {
    setScores(previous => ({
      ...previous,
      [playerId]: (previous[playerId] ?? 0) + 1,
    }));
  }, []);

  const value: GameScoresContextValue = {
    scores,
    addPoint,
  };

  return (
    <GameScoresContext.Provider value={value}>
      {props.children}
    </GameScoresContext.Provider>
  );
});

export const useGameScoresContextSelector = <T,>(
  selector: (context: GameScoresContextValue) => T,
): T => {
  return useContextSelector(GameScoresContext, ctx => {
    if (ctx == null) {
      throw new Error(
        'useGameScoresContextSelector must be used within GameScoresProvider',
      );
    }

    return selector(ctx);
  });
};

export default GameScoresProvider;
```

Points du pattern :

- **Guard `null` + throw dans le helper** : un consommateur hors Provider crash immédiatement avec un message clair, au lieu d'un `undefined` silencieux
- **Pas de `useMemo` sur `value`** : `useContextSelector` compare les slices sélectionnées, pas l'objet value — la stabilité de l'objet entier n'a pas d'importance
- **Les setters restent `useCallback`** : leur référence est une slice comme une autre ; instable, elle re-rendrait tous ceux qui la sélectionnent

## Consommation

Sélectionner **le minimum** — une slice par appel, jamais tout l'objet par confort :

```ts
// ✅ re-render uniquement quand scores change
const scores = useGameScoresContextSelector(ctx => ctx.scores);
const addPoint = useGameScoresContextSelector(ctx => ctx.addPoint);

// ❌ re-render sur n'importe quel changement du context
const { scores, addPoint } = useGameScoresContextSelector(ctx => ctx);
```

Un hook global (`useTheme()` → `ctx => ctx`) est acceptable uniquement quand le consommateur utilise réellement la majorité des valeurs.

## Placement & découpage

- Context de feature → `features/X/contexts/`, Provider exporté via l'`index.ts` de la feature si monté ailleurs
- Context global → `shared/contexts/`
- Le Provider se monte **au plus près** de ses consommateurs (autour du flow de jeu, pas à la racine de l'app, si seul le jeu l'utilise)
- Si deux groupes de valeurs du même context changent à des rythmes différents → deux contexts (cf. le trio `GamePlayProvider` / `GameScoresProvider` / `GameSetupProvider`)
