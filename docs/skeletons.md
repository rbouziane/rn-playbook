# Skeletons

Comment écrire un skeleton de chargement : où le placer, avec quelles dimensions et quelles couleurs. **Quand** en mettre un (et quand préférer une apparition animée) : [`loading.md`](./loading.md).

## Règles en bref

- Préfixe `Skeleton` sur le fichier et le composant
- Skeleton métier à côté du composant qu'il mime ; skeleton générique dans `shared/ui/components/`
- `width` / `height` explicites, jamais `flex: 1` seul
- Couleurs via les tokens sémantiques du theme
- Règles composants habituelles (`memo()`, props non déstructurées, `StyleSheet` en bas)

---

## Localisation

Même règle que pour les composants (cf. [`architecture.md`](./architecture.md#règles-de-placement)) : le critère est l'**appartenance au domaine métier**.

- **Skeleton métier** (mirror d'un composant de feature) → vit **à côté de son composant** dans la feature
  - `features/item/components/ItemCard.tsx`
  - `features/item/components/SkeletonItemCard.tsx`
- **Skeleton générique** (primitive réutilisable) → `shared/ui/components/`
  - `shared/ui/components/SkeletonText.tsx`
  - `shared/ui/components/SkeletonAvatar.tsx`
  - `shared/ui/components/SkeletonCircle.tsx`

Avantage : un skeleton de feature reste collé à son composant — si on modifie la card, on voit immédiatement le skeleton juste à côté.

## Règles

- Préfixe **`Skeleton`** sur le fichier et le composant
- `SkeletonPlaceholder` avec `width` / `height` **explicites** (jamais `flex: 1` seul)
- Couleurs via des tokens sémantiques du theme (`theme.colors.skeletonBase`, `theme.colors.skeletonHighlight`)
- Suit toutes les règles composants ci-dessus : `memo()`, pas de déstructuration, `StyleSheet` en bas, `export default` à la fin

## Pattern

```ts
import { memo } from 'react';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { theme } from '~shared/theme';

const SkeletonItemCard = memo(() => {
  return (
    <SkeletonPlaceholder
      borderRadius={4}
      speed={2000}
      backgroundColor={theme.colors.skeletonBase}
      highlightColor={theme.colors.skeletonHighlight}
    >
      <SkeletonPlaceholder.Item width={120} height={16} borderRadius={2} />
    </SkeletonPlaceholder>
  );
});

export default SkeletonItemCard;
```
