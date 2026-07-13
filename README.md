# rn-playbook

Conventions React Native + TypeScript réutilisables : documentation par domaine, recettes de tâches, definition of done, et config ESLint partageable qui enforce les règles encodables.

L'index de la doc est [`docs/REACT-NATIVE.md`](./docs/REACT-NATIVE.md).

## Installation dans un projet

```sh
yarn add -D rbouziane/rn-playbook
```

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
| `docs/` | 23 fichiers de conventions — index dans `REACT-NATIVE.md` |
| `eslint.js` | Config ESLint partageable (règles encodables des docs) |
| `CLAUDE.template.md` | CLAUDE.md de base à copier et customiser par projet |
