# Grands écrans — tablette, pliable, fenêtre redimensionnée

Tout écran est conçu pour trois formats dès sa première version : téléphone, tablette, pliable déplié (iPhone Duo, Galaxy Fold). Insets et barres système : [`platform.md`](./platform.md).

## Règles en bref

- **Décider sur la largeur disponible, jamais sur le type d'appareil** : `isTablet()` est interdit (lint) — un pliable déplié se déclare téléphone, une tablette en split view n'a qu'une demi-largeur
- La fenêtre **change de taille à chaud** (pliage, split view, rotation) : aucune dimension figée au chargement — `Dimensions.get()` au niveau module est interdit (lint), tout passe par un hook
- Dimensionner le contenu sur la **largeur de layout** (frame safe-area moins insets latéraux, hook partagé du projet) — jamais `useWindowDimensions().width`, qui inclut les barres latérales
- Un **seuil grand écran unique** (600 pt de largeur de layout), centralisé dans le module layout du projet — pas de seuil local
- Grilles : nombre de colonnes **dérivé de la largeur** (hook partagé), jamais une constante
- Carrousels : **n + 1 cartes visibles** sur grand écran ; quand toutes les cartes tiennent, elles **remplissent la ligne** et rien ne défile, sinon la suivante dépasse dans la marge de fin ; calage à gauche via un calcul d'offsets partagé
- Images pleine largeur : hauteur **bornée** (part de la hauteur de fenêtre) + `cover` — jamais rétrécies et centrées
- Barres système sur le côté (insets gauche/droite non nuls, plus d'inset en haut) : le **layout d'écran standard** les consomme une fois ; le header remplace l'espace de la status bar absente — jamais une bande fixe
- Vérifier téléphone **et** tablette **et** pliable déplié, plus un redimensionnement à chaud

---

## Le module layout partagé

Tout ce qui calcule une taille selon l'écran vit dans **un seul module** de `shared/` (le projet en documente le chemin et les noms dans son `CLAUDE.md`). Il expose au minimum :

| Besoin | Hook / util (noms indicatifs) |
|---|---|
| Largeur où le contenu se pose | `useLayoutWidth()` |
| Grand écran ? | `useIsLargeScreen()` — sur la largeur de layout |
| Colonnes d'une grille | `useGridColumnsCount()` |
| Cartes visibles d'un carrousel | `useCarouselVisibleCards(phoneCount)` → `phoneCount + 1` sur grand écran |
| Largeur de carte d'un carrousel | `getCarouselCardWidth({ layoutWidth, count, visibleCards, gap, padding })` |
| Offsets de calage d'un carrousel | `getCarouselSnapOffsets({ count, cardWidth, gap, padding })` — porté par le composant de rangée horizontale (cf. [`performance.md`](./performance.md#rangées-horizontales)) |
| Hauteur d'une image pleine largeur | `useBoundedImageHeight(ratio, margins)` |
| Espace en haut sans status bar | `useTopEdgePadding(base)` |

Un écran ou un composant ne refait **jamais** ces calculs à la main : il appelle le hook. Une formule qui manque s'ajoute au module.

## Pourquoi pas `isTablet()` ni `Dimensions`

- `isTablet()` répond sur l'idiome de l'appareil, pas sur la place disponible : faux sur un pliable déplié (« téléphone » à 800 pt de large) et sur une tablette en split view
- `Dimensions.get()` lu au chargement du module reste figé : après un pliage, tout ce qui en dépend est faux jusqu'au redémarrage
- `useWindowDimensions().width` suit la fenêtre mais compte les barres système latérales : un carrousel calé dessus déborde sous la barre

`useWindowDimensions().height` reste légitime pour une part de hauteur d'écran (sheet, image bornée).

## Barres système latérales

Sur un pliable déplié, la status bar peut devenir une colonne sur le côté (inset droit ou gauche) et l'inset du haut tombe à 0.

- Le **layout d'écran standard** (le composant `Screen` du projet) consomme les insets latéraux une fois et réduit le frame pour son sous-arbre : `useLayoutWidth()` y renvoie la largeur utile, les composants partagés n'ont rien à savoir
- La colonne libérée se peint dans la **couleur de fond de l'écran** courant, au-dessus des headers natifs
- Exceptions **bord à bord** (splash, hero plein écran, carte) : opt-in explicite sur le layout d'écran ; le contenu se garde lui-même des insets via un padding latéral
- Un **portal** (bottom sheet, modal) lit le contexte safe-area là où il est **déclaré** : il prend les insets de la fenêtre, pas ceux de l'écran déjà consommés
- Barre d'onglets : sur un écran avec colonne latérale, elle peut passer en rail dans cette colonne — les écrans d'onglet n'ont alors plus de barre en bas et paddent eux-mêmes la fin de leur scroll
- Haut : le **header de l'écran** ajoute l'espace de la status bar absente (`useTopEdgePadding`), il reste solidaire du scroll — jamais une bande fixe en haut de l'écran

## Grilles et carrousels

```ts
// Snaps each card one gap from the leading edge: the previous card is fully out
export const getCarouselSnapOffsets = (params: CarouselSnapParams) =>
  Array.from({ length: params.count }, (_, index) =>
    index === 0
      ? 0
      : params.padding - params.gap + index * (params.cardWidth + params.gap),
  );
```

- Largeur de carte via `getCarouselCardWidth` ; `visibleCards` vient du hook, la valeur téléphone reste celle du design :

```ts
// Cards fill the row when they all fit; otherwise the next one peeks into the trailing padding
export const getCarouselCardWidth = (params: CarouselCardWidthParams) => {
  const hasOverflow = params.count > params.visibleCards;

  return (
    (params.layoutWidth -
      params.padding * 2 -
      params.gap * (hasOverflow ? params.visibleCards : params.visibleCards - 1)) /
    params.visibleCards
  );
};
```

- Pas de carte coupée qui « donne envie » de faire défiler une rangée qui tient : 2 cartes sur 2 places remplissent la ligne. Sur grand écran, moins de cartes que de places laisse la fin de ligne vide, c'est assumé
- Design à cartes fractionnaires (« 1,5 carte visible », bannière + bout de la suivante) : formule directe `(layoutWidth - paddings - gaps) / visibleCards`, la coupe est voulue
- Calage à gauche (`snapToOffsets` + `decelerationRate="fast"`), jamais centré : la carte précédente ne doit pas dépasser
- Bannières pleine largeur : une carte + un bout de la suivante, même sur grand écran
- Skeleton d'une grille ou d'un carrousel : même nombre de colonnes / cartes que le contenu (cf. [`skeletons.md`](./skeletons.md))

## Images

- Image pleine largeur : `height = min(largeur / ratio, hauteurFenêtre × part)` + `resizeMode="cover"` — elle reste pleine largeur et se recadre
- Ne jamais la rétrécir et la centrer : fonds de carte visibles, badges décalés
- Illustration dont le dessin déborde volontairement d'un bord : la laisser pleine largeur (rétrécie, ses coupes apparaissent au milieu de l'écran)
- Asset avec coins arrondis **dessinés dans le fichier** : il ne supporte pas le recadrage — demander un export rectangulaire et arrondir en code (`borderRadius` sur l'image)

## Bottom sheets

- Hauteur max calculée depuis la fenêtre et les insets (jusque sous la status bar, ou sous l'espace qui la remplace), pas un pourcentage par appel
- Pleine largeur à côté des barres latérales, jamais centrée en largeur max

## Vérifier

- Simulateurs : un téléphone, une tablette, un pliable déplié
- Plier/déplier (ou redimensionner en split view) **sur l'écran ouvert** : grilles et carrousels se recalculent sans relancer
- Rien ne passe sous une barre latérale ; aucune bande vide en haut sur le pliable
