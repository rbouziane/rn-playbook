# rn-playbook

Ce repo **n'est pas une app** : c'est le playbook de conventions React Native + TypeScript, consommé comme package (`rbouziane/rn-playbook`) par les projets. On y édite de la **doc** et de la **config ESLint**, jamais du code applicatif.

## Structure

- **`docs/`** — les conventions, un fichier par domaine. L'index unique et le routage sont dans [`docs/REACT-NATIVE.md`](./docs/REACT-NATIVE.md). Toute doc doit y être référencée.
- **`eslint.js`** — config ESLint partageable : la part **encodable** des conventions. Règle d'or : quand une convention peut devenir une règle lint, elle va ici, pas seulement dans la doc.
- **`CLAUDE.template.md`** — le CLAUDE.md de base copié dans les projets consommateurs. Ne pas confondre avec ce fichier-ci.
- **`README.md`** — installation et flux de mise à jour côté projets.

## Avant d'éditer une doc

Lire le fichier voisin pour **coller au ton** : français, impératif, dense, « Règles en bref » en tête puis le détail. Pas de remplissage. Une convention qui existe déjà ailleurs ne se duplique pas — on cross-référence via un lien relatif.

## Cohérence à préserver

- Toute nouvelle doc dans `docs/` → ajoutée à la table d'index de `docs/REACT-NATIVE.md`
- Les liens entre docs sont **relatifs** (`./naming.md`) et doivent résoudre
- Une règle rendue « non-négociable » dans l'index doit être détaillée dans son fichier de domaine
- Si une convention devient encodable → l'ajouter à `eslint.js` en plus de la doc

## Git — review humaine obligatoire

- **Jamais de commit direct sur `main`** ; branche `feature/<description>`
- Message : `<emoji> [Playbook] Message` — anglais, impératif, **une seule ligne**
  - Emojis : ✨ feat · 🐛 fix · ♻️ refactor · 📝 docs · 🔧 config
- **Je ne push jamais** : c'est Ronan qui review et push. Le commit se fait sur demande explicite.

## Commentaires

En anglais, minimaux — uniquement une contrainte que le code ne montre pas. Jamais narratif.
