# Theming & design tokens

Tokens centralisés (couleurs, spacing, typographie) consommés par tous les composants. **Aucune valeur en dur dans le code** : tout passe par les tokens.

---

## Localisation

Le theme vit dans **`shared/theme/`** et expose un objet `theme` unique.

```
shared/theme/
├── index.ts          # Export agrégé : { colors, spacing, radius, typography, style }
├── colors.ts         # Palette
├── spacing.ts        # Échelle d'espacement + radius
├── typography.ts     # Styles de texte
└── style.ts          # Styles transverses (shadows, presets…)
```

```ts
// shared/theme/index.ts
import { colors } from './colors';
import { spacing, radius } from './spacing';
import { typography } from './typography';
import { style } from './style';

export const theme = { colors, spacing, radius, typography, style } as const;
// Rien n'est réexporté directement — toujours via `theme.xxx`
```

---

## Règles d'usage

- **Toujours via `theme.xxx`**, jamais de valeur en dur (`#FFF`, `16`, `'700'`)
- Importer `theme` depuis `~shared/theme` — **ne pas importer les tokens directement** (`colors`, `spacing`, `typography`…)
- Si un token manque, **l'ajouter au theme**, pas faire d'exception locale
- Les noms de tokens sont **sémantiques**, pas descriptifs : `colors.primary` plutôt que `colors.purple`

---

## Dark mode & couleurs dynamiques

Si l'app supporte plusieurs thèmes (light/dark), certaines couleurs varient selon le thème (`textPrimary`, `surface`, `border`…), d'autres sont identiques (`primary`, `textOnPrimary`).

### Deux sources de couleurs — règle stricte

| Situation                                                    | Source          | Syntaxe                              |
| ------------------------------------------------------------ | --------------- | ------------------------------------ |
| Composant **avec** hook de thème                             | Hook dynamique  | `const { colors } = useTheme()`      |
| Composant **sans** hook de thème (couleurs toutes statiques) | Import statique | `theme.colors.xxx` dans `StyleSheet` |

`useTheme()` est exposé par le `ThemeContext` (`~shared/contexts`).

**Ne jamais mélanger les deux dans le même fichier.** Si un composant a déjà le hook de thème, toutes ses couleurs viennent du hook.

```ts
// ✅
const MyCard = memo(() => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Titre</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: theme.radius.lg, borderWidth: 1 },
  title: { ...theme.typography.body },
});

// ❌ import direct + hook de thème dans le même fichier
import { colors } from '~shared/theme';
const { colors } = useTheme(); // conflit de nom
```

Pour savoir si une couleur est statique : vérifier dans `colors.ts` si la valeur est identique dans tous les thèmes.

---

## Spacing

Échelle multiplicateur basée sur **4** (multiples de 4 uniquement). Permet une grille cohérente sur toute l'app.

```ts
// shared/theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  pill: 999,
} as const;
```

---

## Typography

Styles de texte **complets** (taille, poids, line-height, letter-spacing) regroupés par rôle sémantique. Le composant `Text` consomme un style entier, jamais des valeurs séparées.

```ts
// shared/theme/typography.ts
import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 42 },
  h2: { fontSize: 22, fontWeight: '600', lineHeight: 30 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 26 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 20 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.5,
  },
};
```

```ts
// ✅ Style entier
<Text style={theme.typography.h1}>Titre</Text>

// ❌ Valeurs éclatées
<Text style={{ fontSize: 32, fontWeight: '700' }}>Titre</Text>
```

---

## Colors

Tokens **sémantiques**, pas descriptifs. Permet de changer la palette sans casser le code.

```ts
// ✅
export const colors = {
  background: '#FFFFFF',
  surface: '#F5F5F7',
  primary: '#7B50B8',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  border: '#E5E5E5',
  error: '#D93025',
} as const;

// ❌
export const colors = {
  white: '#FFFFFF',
  lightGray: '#F5F5F7',
  purple: '#7B50B8',
};
```

Si plusieurs nuances d'une même couleur sont nécessaires, suffixer numériquement (`gray100`, `gray200`, `gray500`).
