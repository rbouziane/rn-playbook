---
description: Relire le code produit — qualité, perfs, conformité aux conventions du playbook
---

Relire le code produit (le diff courant `git diff`, ou les fichiers indiqués dans **$ARGUMENTS**) et dire honnêtement s'il est bon.

Déléguer à l'agent **rn-reviewer**, qui lit les docs de domaine concernées dans `node_modules/rn-playbook/docs/` et s'appuie sur `yarn lint` pour l'enforçable. Couvrir trois axes :

1. **Correct & robuste** — le code fait ce qu'il doit, gère les cas d'erreur, pas de régression évidente.
2. **Optimisé** — pas de re-render inutile (`memo`, refs stables via `useMemo`/`useCallback`), listes performantes, animations sur le thread UI, pas de travail coûteux dans le render. Cf. `performance.md`.
3. **Conforme aux conventions** — placement, theming, i18n, structure des screens/hooks, nommage. Les points que le lint ne peut pas attraper en priorité.

Restituer un verdict clair : ✅ bon à livrer, ou la liste des écarts groupés par gravité (bloquant / à corriger / suggestion), chacun avec `fichier:ligne` et le lien vers la doc. Ne rien corriger automatiquement sans validation.
