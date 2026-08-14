# rn-playbook

Conventions React Native + TypeScript réutilisables : documentation par domaine, recettes de tâches, definition of done, et config ESLint partageable qui enforce les règles encodables.

L'index de la doc est [`docs/REACT-NATIVE.md`](./docs/REACT-NATIVE.md).

## Installation dans un projet

```sh
yarn add -D rbouziane/rn-playbook
npx rn-playbook init
```

Projet créé from scratch : la séquence complète (init CLI, arborescence, socle de dépendances, babel/metro) est dans [`docs/new-project.md`](./docs/new-project.md).

`init` fait tout le branchement, sans jamais écraser ton existant :

- copie l'agent `rn-reviewer` et la commande `/review` dans `.claude/` ;
- installe les permissions Claude (allowlist RN + `codebase-memory`, `git push` bloqué) dans `.claude/settings.local.json` — **non commité**, ajouté au `.gitignore` ; fusionné sans écraser tes règles perso ;
- crée `CLAUDE.md` depuis le template s'il n'existe pas (jamais écrasé) ;
- ajoute `require.resolve('rn-playbook/eslint')` en fin de `extends` dans `.eslintrc.js`/`.cjs` ;
- ajoute les scripts qualité manquants dans `package.json` (les scripts existants sont conservés).

Cas où `init` s'abstient et affiche une instruction manuelle plutôt que risquer d'abîmer une config : ESLint en config JSON/YAML/flat ou avec un `extends` en string, et `package.json` absent. Les étapes détaillées ci-dessous décrivent ces branchements pour les faire à la main au besoin.

### 1. ESLint

Dans `.eslintrc.js`, étendre la config **après** la base React Native (elle fournit les plugins) :

```js
module.exports = {
  root: true,
  extends: [
    '@react-native',
    'plugin:prettier/recommended',
    require.resolve('rn-playbook/eslint'),
  ],
  rules: {
    // Overrides locaux uniquement, avec justification en commentaire
  },
};
```

### 2. CLAUDE.md

Copier [`CLAUDE.template.md`](./CLAUDE.template.md) à la racine du projet sous le nom `CLAUDE.md`, puis remplir les placeholders `<...>` (nom du projet, scopes de commit, specs éventuelles). Tout le générique reste dans le package — le CLAUDE.md du projet ne contient que le delta.

### 3. Scripts qualité

Le kit suppose ces scripts dans `package.json` :

```json
"lint": "eslint .",
"lint:fix": "eslint . --fix",
"typecheck": "tsc --noEmit",
"test": "jest",
"quality": "yarn lint && yarn typecheck && yarn test"
```

### 4. Review Claude

Le package fournit de quoi relire le code produit contre les conventions :

- l'agent `rn-reviewer` (lecture seule, calé sur les docs de `node_modules/rn-playbook/docs/`, s'appuie sur `yarn lint`) ;
- la commande `/review` qui le déclenche sur le diff courant, en vérifiant qualité, perfs et conformité.

Claude Code ne scanne pas `node_modules` : `npx rn-playbook init` copie l'agent dans `.claude/agents/` et la commande dans `.claude/commands/`. À relancer après chaque `yarn up rn-playbook` — le kit est rafraîchi, tes fichiers perso préservés.

Le reste du pilotage passe par le prompt : le `CLAUDE.md` fait déjà pointer Claude vers les docs, donc « crée-moi tel écran » ou « écris les tests » suivent les conventions sans commande dédiée.

## Mise à jour des conventions

Les conventions évoluent **ici**, jamais dans les projets consommateurs :

1. Modifier la doc (et `eslint.js` si la règle est encodable) dans ce repo
2. Committer, pusher, tagger si le changement est notable
3. Dans chaque projet, monter la version : `yarn up rn-playbook` (commit `⬆️`) — le changement de règle est ainsi un acte délibéré, projet par projet. Un `yarn install` seul ne suffit pas : `yarn.lock` épingle le commit

Pour tester une modif localement avant de la pusher : `yarn link <chemin-vers-rn-playbook>` dans le projet, puis revenir à la version GitHub une fois validée.

Règle d'or : toute nouvelle convention récurrente s'encode en règle ESLint quand c'est possible, plutôt que seulement écrite dans la doc.

## Contenu

| Fichier | Rôle |
|---|---|
| `docs/` | 25 fichiers de conventions — index dans `REACT-NATIVE.md` |
| `eslint.js` | Config ESLint partageable (règles encodables des docs) |
| `CLAUDE.template.md` | CLAUDE.md de base à copier et customiser par projet |
| `templates/agents/` | Agent `rn-reviewer`, installé dans `.claude/agents/` par `rn-playbook init` |
| `templates/commands/` | Commande `/review`, installée dans `.claude/commands/` par `rn-playbook init` |
| `templates/settings.local.json` | Permissions Claude installées (fusionnées) dans `.claude/settings.local.json` par `rn-playbook init` |
| `bin/rn-playbook.js` | CLI `npx rn-playbook init` — installe/rafraîchit les assets + branche eslint & scripts |
