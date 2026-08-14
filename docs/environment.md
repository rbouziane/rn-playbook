# Environnements & configuration

Trois environnements, un fichier `.env` par environnement, une seule porte d'accès typée dans le code.

## Règles en bref

- Trois environnements : **`dev`**, **`preprod`**, **`prod`** — mêmes clés partout, jamais une clé qui n'existe que dans un seul
- Config injectée par **`react-native-config`** : les valeurs sont **compilées dans le binaire**, pas lues au runtime
- **Aucun secret réel dans un `.env`** — tout ce qui est dans le binaire est extractible en quelques minutes (cf. [Secrets](#secrets--ce-qui-na-rien-à-faire-dans-un-env))
- Accès uniquement via **`~shared/constants/Env`**, jamais `Config.XXX` dans un composant ou un service
- `.env.*` **jamais commités** ; un `.env.example` commité liste les clés attendues, sans valeur
- Les 3 environnements s'installent **côte à côte** sur un même device (suffixe d'`applicationId`, nom affiché distinct)
- Ajout d'une clé = les 3 fichiers `.env` + `.env.example` + le type + la CI, dans le même commit

Le détail ci-dessous. Bootstrap initial → [`new-project.md`](./new-project.md).

---

## Installation

```sh
yarn add react-native-config
cd ios && pod install
```

Paquet natif : rebuild complet obligatoire (cf. [`build-release.md`](./build-release.md#installer-un-paquet-natif--procédure)). Un changement de valeur dans un `.env` est **aussi** un changement natif : il faut rebuilder, un reload Metro ne suffit pas.

## Fichiers `.env`

Un fichier par environnement, à la racine :

```
.env.dev
.env.preprod
.env.prod
.env.example      # commité — les clés, sans les valeurs
```

```sh
# .env.preprod
ENV_NAME=preprod
API_URL=https://api.preprod.monprojet.com
SENTRY_DSN=https://xxx@sentry.io/yyy
```

Règles :

- **Mêmes clés dans les trois fichiers.** Une clé absente d'un environnement donne `undefined` au runtime, sans erreur de build — la panne apparaît en prod
- `.gitignore` : `.env*` sauf `.env.example` (`!.env.example`)
- Valeurs en SCREAMING_SNAKE_CASE, pas de quotes, pas d'espace autour du `=`
- Toute nouvelle clé est ajoutée **partout en même temps** : 3 `.env`, `.env.example`, le type, les variables CI

## Branchement natif

### Android

Le mapping flavor → fichier `.env` se déclare dans `android/app/build.gradle`, **avant** l'application du plugin :

```gradle
project.ext.envConfigFiles = [
    dev:     ".env.dev",
    preprod: ".env.preprod",
    prod:    ".env.prod",
]
apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"
```

> Les clés de cette map sont matchées sur le nom du **variant** en minuscules (`devDebug`, `preprodRelease`…) : un flavor sans entrée correspondante tombe silencieusement sur `.env`. Vérifier une valeur à l'écran après le premier build de chaque flavor.

Les `productFlavors` correspondants portent l'identité de l'app par environnement :

```gradle
flavorDimensions "env"
productFlavors {
    dev     { dimension "env"; applicationIdSuffix ".dev";     resValue "string", "app_name", "MonProjet Dev" }
    preprod { dimension "env"; applicationIdSuffix ".preprod"; resValue "string", "app_name", "MonProjet Preprod" }
    prod    { dimension "env" }
}
```

L'`applicationIdSuffix` est ce qui permet d'avoir les trois builds installés simultanément.

### iOS

Une **configuration** Xcode par environnement (Debug/Release dupliquées), et un **scheme** par environnement pointant dessus. Le fichier `.env` est choisi par la variable `ENVFILE` :

```sh
ENVFILE=.env.preprod yarn ios --scheme MonProjetPreprod
```

- Bundle identifier distinct par configuration (`com.monprojet.dev`, `.preprod`)
- `Config` doit être ajouté au build phase du bon target, sinon les valeurs remontent vides **uniquement en build device**
- Les schemes sont **partagés** (`Shared` coché dans Xcode) sinon ils ne sont pas commités et la CI ne les voit pas

### Scripts

```json
"android:preprod": "ENVFILE=.env.preprod react-native run-android --mode=preprodDebug",
"ios:preprod": "ENVFILE=.env.preprod react-native run-ios --scheme MonProjetPreprod"
```

## Accès dans le code

`react-native-config` renvoie des **strings** non typées. On ne le consomme jamais directement : une seule porte, dans `~shared/constants/Env`, qui type, convertit et centralise.

```ts
// app/shared/constants/Env.ts
import Config from 'react-native-config';

export enum ENV_NAME {
  DEV = 'dev',
  PREPROD = 'preprod',
  PROD = 'prod',
}

const requireEnv = (key: string, value?: string): string => {
  if (!value) {
    throw new Error(`[Env] Missing key: ${key}`);
  }

  return value;
};

export const ENV = {
  name: requireEnv('ENV_NAME', Config.ENV_NAME) as ENV_NAME,
  apiUrl: requireEnv('API_URL', Config.API_URL),
  isProd: Config.ENV_NAME === ENV_NAME.PROD,
};
```

```ts
// ✅
import { ENV } from '~shared/constants/Env';

const api = axios.create({ baseURL: ENV.apiUrl });

// ❌ — non typé, non validé, dispersé
import Config from 'react-native-config';
axios.create({ baseURL: Config.API_URL });
```

Règles :

- Le `throw` au chargement est volontaire : une clé manquante casse **au démarrage**, pas au premier appel réseau en prod
- Les booléens et nombres sont convertis ici (`=== 'true'`, `Number(...)`) — jamais une string `'false'` baladée dans le code
- `ENV.isProd` plutôt que `__DEV__` pour une décision **métier** ; `__DEV__` reste pour le débug (un build preprod est un build release avec `__DEV__ === false`)
- Pas de valeur par défaut silencieuse : mieux vaut un crash au boot qu'un build preprod qui tape l'API de prod sans le dire

## Secrets — ce qui n'a rien à faire dans un `.env`

`react-native-config` écrit ses valeurs dans le binaire (`BuildConfig` Android, `Info.plist` iOS). **Un `strings` sur l'APK les affiche.** Ce n'est pas un coffre-fort, c'est de la configuration.

| Type de valeur | Où |
| --- | --- |
| URL d'API, nom d'env, flags de feature, ID publics (Firebase, Sentry DSN) | `.env` ✅ |
| Clé d'API tierce à privilèges, secret d'auth, credentials | **Backend uniquement** — l'app appelle une route qui les utilise |
| Token utilisateur, clé de chiffrement locale | **Keychain / MMKV chiffré** (cf. [`storage.md`](./storage.md)) |

Si une clé tierce doit absolument vivre côté client (SDK qui l'exige), la traiter comme publique : la restreindre côté fournisseur (bundle id, referrer, quotas), et pouvoir la révoquer.

## Firebase & fichiers de config par environnement

Un projet Firebase par environnement → un `google-services.json` / `GoogleService-Info.plist` par environnement, rangés par flavor (`android/app/src/preprod/google-services.json`) ou sélectionnés par une build phase iOS selon la configuration. Ces fichiers ne se committent pas quand ils portent plusieurs environnements : la CI les injecte.

## CI

- Les valeurs vivent dans les **secrets du runner**, pas dans le repo ; le job écrit le `.env` avant le build
- Un job par environnement, avec le scheme / flavor correspondant
- Vérifier au moins une fois par environnement que `ENV.name` affiché dans l'app correspond bien au build livré — l'erreur la plus fréquente est un build preprod pointant l'API de prod

## Checklist — ajout d'une clé

- [ ] Ajoutée dans les 3 `.env` **et** dans `.env.example`
- [ ] Exposée et typée dans `~shared/constants/Env`
- [ ] Ajoutée aux secrets CI des 3 environnements
- [ ] Rebuild natif (pas un simple reload Metro) avant de conclure qu'elle ne marche pas
