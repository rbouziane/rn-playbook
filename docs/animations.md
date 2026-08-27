# Animations & gestes

`react-native-reanimated` (worklets UI thread) pour toute animation, `react-native-gesture-handler` pour tout geste. **Jamais l'API `Animated` de React Native** (driver JS, drops de frame).

## Règles en bref

- Valeurs animées : `useSharedValue` — jamais un `useState` qui change à chaque frame
- Styles animés : `useAnimatedStyle`, appliqués sur un composant `Animated.xxx`
- Physique **centralisée** : durées et configs spring dans des constantes partagées, pas de valeurs magiques par composant
- Mount/unmount : animations `entering`/`exiting` plutôt qu'orchestration manuelle
- Gestes : API `Gesture.*` de gesture-handler, callbacks en worklets
- Un worklet n'appelle pas de fonction JS directement → `runOnJS`

---

## Pattern de base

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const Card = memo((props: Props) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, SPRING_CONFIG.PRESS);
  }, [scale]);

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      {/* ... */}
    </Animated.View>
  );
});
```

- Naming : la shared value porte ce qu'elle représente (`scale`, `translateY`, `progress`), pas `animValue`
- La base statique du style reste dans `StyleSheet`, seul l'animé vient de `useAnimatedStyle`

## Physique centralisée

Les durées et configs spring sont des **constantes**, pas des valeurs magiques éparpillées, et elles vivent dans le module qu'elles animent : `~shared/ui/constants/Animation` pour les primitives UI, `~shared/toast/constants/Animation` pour le toast. Deux animations du même type (deux bottom sheets, deux press feedbacks) partagent la même constante, donc la même physique.

```ts
export const SPRING_CONFIG = {
  PRESS: { damping: 20, stiffness: 300 },
  SHEET: { damping: 28, stiffness: 260 },
} as const;

export const ANIMATION_DURATION = {
  FAST: 150,
  BASE: 250,
  SLOW: 400,
} as const;
```

## Entering / exiting

Pour les apparitions/disparitions, utiliser les layout animations de reanimated plutôt qu'un state + orchestration manuelle :

```tsx
import Animated, { FadeIn, FadeOutDown } from 'react-native-reanimated';

<Animated.View entering={FadeIn.duration(ANIMATION_DURATION.BASE)} exiting={FadeOutDown}>
```

## Gestes

API moderne `Gesture.*` + `GestureDetector`. Les callbacks de geste sont des worklets : pour toucher du state React ou naviguer, passer par `runOnJS`.

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const pan = Gesture.Pan()
  .onUpdate(event => {
    translateY.value = event.translationY;
  })
  .onEnd(() => {
    translateY.value = withSpring(0, SPRING_CONFIG.SHEET);
    runOnJS(props.onDismiss)();
  });

return <GestureDetector gesture={pan}>{/* ... */}</GestureDetector>;
```

## Pièges worklets

- **Pas d'appel JS direct dans un worklet** (handler de geste, `useAnimatedStyle`, callback de `withTiming`) → `runOnJS(fn)(args)`
- Ne pas lire `sharedValue.value` pendant le render JSX — uniquement dans des worklets (`useAnimatedStyle`, `useDerivedValue`)
- Un objet/fonction capturé par un worklet est **copié** : les mutations côté JS après coup ne sont pas vues
- Pour dériver une valeur animée d'une autre : `useDerivedValue`, pas un `useAnimatedStyle` intermédiaire

## Quand ce n'est PAS une animation reanimated

- Transition d'écran → React Navigation la gère (options de stack)
- Skeleton/shimmer de chargement → composants Skeleton (cf. [`components.md`](./components.md#skeletons))
- Calcul lourd déclenché après une animation → `InteractionManager.runAfterInteractions` (cf. [`performance.md`](./performance.md))
