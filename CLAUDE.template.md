# <NomDuProjet>

<!-- Delta projet : stack, particularités. Tout le générique vit dans rn-playbook. -->
<Description en une ligne> en **bare React Native CLI** (pas d'Expo) + TypeScript. Gestionnaire de paquets : **yarn** (jamais npm).

## Documentation — obligation de lire avant de coder

Les conventions vivent dans le package **`rn-playbook`**. L'index unique est
**[`node_modules/rn-playbook/docs/REACT-NATIVE.md`](./node_modules/rn-playbook/docs/REACT-NATIVE.md)** — il route vers le sous-fichier à lire selon la tâche. Ne pas deviner — lire.

Réflexes pour toute tâche :

1. **`node_modules/rn-playbook/docs/recipes.md`** — la tâche demandée a probablement sa checklist pas à pas
2. **`node_modules/rn-playbook/docs/placement.md`** — où mettre le code, où vit l'état
3. **`node_modules/rn-playbook/docs/definition-of-done.md`** — auto-vérification avant de rendre la main (dont `yarn quality`)

Une partie des conventions est **enforced par ESLint** (`rn-playbook/eslint`) : `yarn lint` fait autorité, la doc explique.

**Amélioration continue** : si une session révèle une ambiguïté ou un manque dans les conventions, le fix se fait dans le repo `rn-playbook` (~/Dev/rbouziane/rn-playbook), pas dans une copie locale. Une règle spécifique à CE projet uniquement se documente ici, dans ce fichier.

## Exploration du code — codebase-memory d'abord

Pour explorer le code du projet (localiser une fonction/classe/route, comprendre l'architecture, tracer appelants et dépendances), utiliser **en premier** les outils `mcp__codebase-memory-mcp` : `search_graph`, `get_architecture`, `trace_call_path`, `get_code_snippet`. Ne pas partir sur `grep`/`glob`/lecture de fichiers en aveugle — ça gâche énormément de tokens. `grep`/`Read` ne sont qu'un repli pour du texte que le graphe ne couvre pas. Graphe non indexé → lancer `index_repository` d'abord.

## Git — gitflow strict

Convention complète : `node_modules/rn-playbook/docs/git-workflow.md`. L'essentiel :

- **Jamais de commit direct sur `main`** ; travail sur `feature/<description>` depuis `develop`
- Message : `<emoji> [Scope] Message` — anglais, impératif, **une seule ligne, pas de corps de commit**
  - Emojis : ✨ feat · 🐛 fix · ♻️ refactor · 🎨 UI · ⚡ perf · 📝 docs · ✅ tests · 🔧 config · ⬆️ deps · 🚀 release
- Scopes de ce projet : `[<Feature1>]`, `[<Feature2>]`, … + transverses `[Shared]`, `[Navigation]`, `[Docs]`, `[Build]`
- Bump de version : `🚀 Upgrades to v5.48.0 - build 672` (sans scope)
- `yarn quality` vert avant tout commit ; jamais de push/merge sans demande explicite

## Violations fréquentes à ne pas reproduire

> Résumé toujours en contexte — la **source de vérité** reste les docs du package. Ne figurent ici que les règles que le lint **ne peut pas** attraper.

### Hooks métier dans les screens ❌

La logique (état, effets, callbacks) ne vit **pas dans le screen**. Elle va dans un hook `useXxxScreenLogic` dans `features/X/hooks/` (cf. `docs/hooks.md`). Le screen appelle le hook et compose des composants, rien d'autre.

### SVG inline ou couleurs en dur ❌

Jamais de `<Svg><Path …>` en JSX ni de hex dans un composant : toujours un fichier `.svg` en `currentColor` importé comme composant, coloré via le theme (cf. `docs/assets.md`).

### Fichiers trop longs ❌

Un fichier composant > ~100 lignes doit être découpé : sous-composants dans `components/`, logique dans `hooks/`.

## Commentaires

En anglais, minimaux — uniquement pour une contrainte que le code ne peut pas montrer. Jamais de commentaire narratif ou évident.
