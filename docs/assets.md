# Assets — SVG, images, fonts, sons

Conventions pour tous les assets. Placement : `features/X/assets/` si propre à une feature, `shared/assets/` sinon (cf. [`placement.md`](./placement.md)).

## Règles en bref

- Icône/illustration vectorielle = **fichier `.svg`** importé comme composant — **jamais de SVG inline en JSX** (`<Svg><Path …>`)
- Couleurs des SVG en **`currentColor`** dans le fichier ; la couleur vient du composant via la prop `color`, tirée du theme — jamais de hex en dur
- Nom d'import suffixé `Svg` : `import BombSvg from '~shared/assets/svg/bomb.svg'`
- Images bitmap : PNG avec variantes `@2x`/`@3x`, consommées via le composant image du projet (caching)
- Fichiers en kebab-case : `bomb-glow.svg`, `card-back.png`

---

## SVG

Le projet utilise `react-native-svg` + `react-native-svg-transformer` : un fichier `.svg` s'importe directement comme composant React.

### Le fichier `.svg`

- Nettoyé (pas de metadata d'export Figma/Illustrator, pas de `width`/`height` figés inutiles — garder le `viewBox`)
- **Toutes les couleurs monochromes en `currentColor`** — c'est ce qui permet de théming l'icône depuis le code
- Les SVG multicolores (illustrations) gardent leurs couleurs internes, mais toute couleur devant suivre le theme passe en `currentColor`

```xml
<!-- ✅ bomb.svg -->
<svg viewBox="0 0 24 24" fill="none">
  <path d="..." fill="currentColor" />
</svg>
```

### Usage

```tsx
import BombSvg from '~shared/assets/svg/bomb.svg';

<BombSvg width={84} height={84} color={colors.textPrimary} />
```

- `width` / `height` explicites (le viewBox gère le ratio)
- `color` depuis le theme (`useTheme()` ou `theme.colors.xxx`) — **jamais** un hex dans le composant

### Anti-patterns

```tsx
// ❌ SVG inline en JSX
<Svg viewBox="0 0 24 24"><Path d="..." fill="#7B50B8" /></Svg>

// ❌ Hex en dur sur un SVG importé
<BombSvg color="#1A1A1A" />

// ✅
<BombSvg color={colors.textPrimary} />
```

---

## Images bitmap

- PNG/WebP dans `assets/images/`, avec `@2x` / `@3x` (`card-back.png`, `card-back@2x.png`, `card-back@3x.png`)
- `require()` statique (jamais de chemin dynamique construit à la volée — Metro ne peut pas les résoudre)
- Images distantes : **`@d11/react-native-fast-image`** pour le cache (`import FastImage from '@d11/react-native-fast-image'`) — dimensions explicites pour éviter les layout shifts (cf. [`performance.md`](./performance.md))

## Fonts

- Fichiers dans `shared/assets/fonts/`, déclarés côté natif (`react-native.config.js` + `npx react-native-asset` ou link manuel)
- Jamais consommées directement : les `fontFamily` vivent dans `shared/theme/fonts.ts` et sont exposées via les styles de `theme.typography`

## Sons

- Fichiers dans `shared/assets/sounds/` (ou `features/X/assets/` si propres à une feature)
- Chargement/lecture encapsulés dans un service ou hook dédié — jamais d'instance de player créée dans un composant
