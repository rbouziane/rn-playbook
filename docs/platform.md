# Plateforme — safe areas, system bars, permissions, accessibilité

Tout ce qui touche à l'OS : zones sûres, barres système, différences iOS/Android, permissions, a11y.

## Règles en bref

- App **edge-to-edge** : le contenu passe sous les barres système, les insets gèrent le clearance
- Insets via `useSafeAreaInsets()` appliqués en **padding ciblé** — pas de `SafeAreaView` englobant par défaut
- Style des barres système centralisé (un seul endroit décide light/dark) — jamais de `StatusBar` posé au cas par cas dans les écrans
- Différences de plateforme : `Platform.select({ ios, android })` inline pour une valeur, fichier `.ios.tsx`/`.android.tsx` pour un comportement
- Toute demande de permission passe par un hook dédié qui gère les 3 états : non demandée / accordée / refusée (avec chemin vers les réglages)
- Tout élément interactif : `accessibilityLabel` traduit + zone de touche ≥ 44pt

---

## Edge-to-edge & safe areas

L'app est edge-to-edge (`react-native-edge-to-edge`) : le contenu dessine sous la status bar et la navigation bar, et c'est aux écrans de ménager le clearance avec les insets.

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GameScreen = memo(() => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* ... */}
    </View>
  );
});
```

Règles :

- **Padding ciblé par inset** plutôt que `SafeAreaView` : on choisit quels bords respecter (un fond plein écran ignore les insets, son contenu les respecte)
- Les composants réutilisables **ne consomment pas les insets eux-mêmes** — c'est l'écran (ou son layout) qui les applique, sinon ils s'additionnent
- Listes : le clearance bas passe par `contentContainerStyle={{ paddingBottom: insets.bottom }}`, pas par un padding sur la liste (le scroll doit aller sous la barre)
- Écran avec header React Navigation : le header gère déjà le top — ne pas ajouter `insets.top`

## Barres système

- Le style (icônes claires/sombres) suit le **theme**, décidé à un seul endroit (composant racine / layout d'écran standard), jamais écran par écran
- Changement ponctuel justifié (ex : écran photo plein écran) : le composant qui l'impose le **restaure** au démontage

## Différences iOS / Android

| Besoin                                  | Solution                                   |
| --------------------------------------- | ------------------------------------------ |
| Une valeur qui diffère (padding, offset)| `Platform.select({ ios: 8, android: 12 })` |
| Un comportement qui diffère             | Fichiers `MyComponent.ios.tsx` / `MyComponent.android.tsx` |
| Une API absente d'une plateforme        | Guard explicite `if (Platform.OS === 'ios')` avec accolades |

Ne jamais laisser un `Platform.OS === ...` enfoui profondément dans une logique métier : l'extraire dans une constante nommée ou un util.

## Permissions

Chaque permission (notifications, caméra…) est encapsulée dans un **hook dédié** (`useNotificationPermission`) qui expose l'état et les actions :

- 3 états gérés : `notRequested` / `granted` / `denied`
- Demander la permission **au moment de l'usage**, jamais au boot, avec un écran/modal d'explication avant la popup système
- Refus définitif : proposer un lien vers les réglages (`Linking.openSettings()`), ne jamais re-spammer la popup

## Accessibilité

Minimum obligatoire sur tout élément interactif :

- `accessibilityLabel` **traduit** (`translate()`) si le contenu visuel ne se suffit pas (icône seule, image)
- `accessibilityRole` (`button`, `header`, `switch`…)
- Zone de touche ≥ 44×44pt — compléter avec `hitSlop` si le visuel est plus petit
- États exposés : `accessibilityState={{ disabled, selected, checked }}`
- Ne pas bloquer la mise à l'échelle des polices sans raison (`allowFontScaling` reste au défaut ; si un layout casse, le corriger plutôt que figer la police)
