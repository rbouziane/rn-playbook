# États de chargement

Quoi afficher pendant qu'un écran attend sa donnée : ce qui s'affiche tout de suite, ce qui prend un skeleton, ce qui apparaît en animation. L'écriture des skeletons eux-mêmes (placement, dimensions, couleurs) est dans [`skeletons.md`](./skeletons.md).

## Règles en bref

- Pas de loader plein écran quand la structure de l'écran est connue
- **Statique** (ne dépend pas de la donnée) → affiché tout de suite
- **Certain** (sera forcément affiché) → `SkeletonXxx` à sa place
- **Incertain** (la donnée décide s'il existe) → rien, puis apparition animée (fade + hauteur)
- Skeleton piloté par `isPending`, jamais par un champ absent — tout skeleton se termine en contenu ou en `ErrorState`

---

## Classer chaque élément

Un écran dont la structure est connue ne se cache jamais derrière un loader plein écran : on affiche tout de suite ce qui ne dépend pas de la donnée, et chaque élément qui l'attend se traite selon ce qu'on sait **avant** la réponse.

| Élément | Exemples | Pendant le chargement | À l'arrivée de la donnée |
| --- | --- | --- | --- |
| **Statique** — ne dépend pas de la donnée | titre de section, en-tête de tableau, bouton dont l'action n'attend pas la donnée | affiché | inchangé |
| **Certain** — sera forcément affiché, forme connue | titre et visuel d'un contenu, lignes d'une liste, code à copier | `SkeletonXxx` aux dimensions du composant | remplace le skeleton sans saut de layout |
| **Incertain** — la donnée décide s'il existe | carte de mise en avant conditionnelle, badge optionnel, bannière | **rien** | apparition animée (fade + hauteur) |

Pas de skeleton pour un élément incertain : un skeleton promet un contenu. S'il disparaît sans rien, l'écran saute deux fois et a menti à l'utilisateur. Exemple type : une carte de dashboard qui met en avant une campagne **ou** une offre selon le profil, **ou rien** — elle n'est pas réservée par un skeleton, elle apparaît en fondu quand la donnée confirme qu'elle existe.

## Règles

- **Le skeleton suit l'état de la requête (`isPending`), jamais l'absence d'un champ.** Conditionner un skeleton à `data?.field == null` donne un skeleton infini dès que l'API renvoie la donnée sans ce champ. Le reducer normalise les champs facultatifs à `null` : `undefined` = en chargement (skeleton), `null` = chargé sans valeur (élément masqué)
- **Tout skeleton se termine** : succès → contenu, échec sans donnée → `ErrorState`. Jamais de query `enabled: false` derrière un skeleton : elle reste `isPending` indéfiniment
- **Refetch avec des données en cache** (pull-to-refresh, invalidation) : les données restent affichées, pas de retour au skeleton
- **Variante d'écran inconnue** (contenu ou état vide selon la donnée) : skeleton de la zone commune, puis la variante — pas un spinner seul
- **Apparition d'un élément incertain** : s'il s'insère au-dessus d'autre contenu, animer l'opacité **et** la hauteur, sinon tout ce qui suit saute d'un coup. `entering={FadeIn}` seul ne convient qu'à un élément sans contenu après lui dans le flux (cf. [`animations.md`](./animations.md#entering--exiting)). Une seule primitive partagée dans `shared/` (ex. `AnimatedCollapse`) anime opacité **et** hauteur mesurée, réutilisée partout plutôt que réécrite par écran. Un simple fondu, même avec un léger glissement, ne compte pas : il fait sauter ce qui suit

## Pattern

```tsx
const ItemScreen = memo(() => {
  const logic = useItemScreenLogic();

  if (logic.item == null && logic.itemError) {
    return <ErrorState message={logic.itemError.message} />;
  }

  return (
    <ScreenContainer>
      <Text style={styles.sectionTitle}>{translate('item.historyTitle')}</Text>
      {logic.item ? <ItemHeader item={logic.item} /> : <SkeletonItemHeader />}
      <AnimatedCollapse isVisible={logic.item?.promotion != null}>
        {logic.item?.promotion != null && (
          <ItemPromotionCard promotion={logic.item.promotion} />
        )}
      </AnimatedCollapse>
    </ScreenContainer>
  );
});
```

Le titre de section est statique, l'en-tête est certain (skeleton), la carte promotion est incertaine (apparition animée, fade + hauteur).
