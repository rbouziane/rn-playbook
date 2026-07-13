# Git & livraison

Le projet suit **gitflow**. Conventions de branches, de commits, et ce qui doit être vrai avant de committer.

## Règles en bref

- **Gitflow** : `main` = production uniquement, `develop` = intégration, tout travail passe par une branche `feature/*`
- Messages : `<emoji> [Scope] Message` — anglais, impératif, une seule ligne — `🐛 [Premium] Fix paywall colors`, pas `Some fix`
- Un commit = un changement cohérent ; gros travail → plusieurs commits logiques
- `yarn quality` **vert avant chaque commit**
- Jamais de secret, de fichier généré, ni de code commenté « au cas où » dans un commit
- Ne jamais push/force-push/merger sans demande explicite

---

## Branches (gitflow)

| Branche | Rôle | Part de | Merge vers |
| --- | --- | --- | --- |
| `main` | Production — uniquement des releases taguées | — | — |
| `develop` | Intégration continue du travail terminé | `main` | — |
| `feature/<description>` | Toute tâche : feature, refactor, fix non urgent | `develop` | `develop` |
| `release/<x.y.z>` | Stabilisation avant release (bump version, QA) | `develop` | `main` **et** `develop` |
| `hotfix/<x.y.z>` | Correctif urgent en production | `main` | `main` **et** `develop` |

Naming des branches : kebab-case descriptif — `feature/battle-royale-mode`, `feature/fix-lives-recap`, `hotfix/1.2.1`.

Règles :

- **On ne commite jamais directement sur `main`**, et sur `develop` uniquement pour du trivial (typo, bump de doc) — par défaut, tout passe par une `feature/*`
- Une branche feature vit **court** : une tâche, mergée dès que la [`definition-of-done.md`](./definition-of-done.md) est verte
- Chaque merge sur `main` est **tagué** (`v1.2.0`) ; `release/*` et `hotfix/*` sont re-mergées dans `develop` pour ne rien perdre

## Messages de commit

Format : `<emoji> [Scope] Message` — une ligne impérative en anglais, majuscule initiale, pas de point final.

```
✨ [Game] Add battle royale timer presets
🐛 [Premium] Fix paywall colors in dark mode
♻️ [Settings] Extract sound section logic into hook
⚡ [Game] Reduce card board re-renders

❌ Some design fix            (vague — quoi ? où ?)
❌ fixed the bug              (passé, vague, sans emoji ni scope)
❌ feat(game): add timer      (pas de conventional-commits — l'emoji porte le type)
❌ WIP                        (pas de travail non fini hors de sa branche feature)
```

**Une seule ligne, pas de corps de commit.** Une description n'est ajoutée que dans un cas vraiment spécial (décision non évidente qui doit survivre à l'historique, breaking change, workaround d'un bug externe). Si le commit semble avoir besoin d'une explication, c'est souvent qu'il est mal découpé.

### Emoji — un par type de commit

| Emoji | Type |
| --- | --- |
| ✨ | Nouvelle feature / nouveau comportement |
| 🐛 | Fix de bug |
| ♻️ | Refactor (aucun changement de comportement) |
| 🎨 | UI / style visuel |
| ⚡ | Performance |
| 📝 | Documentation |
| ✅ | Tests |
| 🔧 | Config & tooling (lint, babel, gradle, CI) |
| ⬆️ | Montée de version de dépendances |
| 🚀 | Release (réservé au commit de bump) |

S'en tenir à cette liste — dix emojis suffisent, un emoji exotique fait perdre l'information au lieu d'en ajouter.

### Scope — sur quoi on a travaillé

Entre crochets, PascalCase, dérivé du dossier de feature (ex : `[Game]`, `[Settings]`, `[Home]`). Scopes transverses : `[Shared]` (composants/utils partagés), `[Navigation]`, `[Docs]`, `[Build]`. **La liste des scopes du projet vit dans son `CLAUDE.md`.**

- Un commit qui touche plusieurs features → le scope **dominant**, ou `[Shared]` si c'est vraiment transverse
- Si aucun scope ne s'impose, c'est souvent que le commit mélange deux sujets → le découper

### Commits de release (bump de version)

Le commit qui bump la version (sur `release/*` ou `hotfix/*`) suit ce format exact, sans scope :

```
🚀 Upgrades to v5.48.0 - build 672
```

Version et numéro de build doivent correspondre à ce qui est effectivement dans le projet (iOS + Android).

## Découpage

- Un commit doit pouvoir se décrire en une ligne — s'il faut « and » pour tout couvrir, c'est deux commits
- Séparer : refactor préparatoire / feature / fixes indépendants / doc. Un déplacement de fichiers (`git mv`) se commite seul pour garder un diff lisible
- Un fix découvert en passant sur un autre sujet → commit séparé (voire branche séparée s'il est indépendant)

## Avant de committer

1. `yarn quality` vert (cf. [`definition-of-done.md`](./definition-of-done.md))
2. `git diff` relu : pas de `console.log` oublié, pas de code mort, pas de fichier accidentel
3. `yarn.lock` inclus si les dépendances ont bougé ; assets natifs (`pod install` → `Podfile.lock`) inclus avec le paquet qui les cause
4. Si une convention a été ajoutée ou modifiée en cours de route : `docs/` (et la règle lint si encodable) mis à jour **dans le même commit**
