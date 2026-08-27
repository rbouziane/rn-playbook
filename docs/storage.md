# Storage

MMKV chiffré, Keychain, persister TanStack Query, versioning du cache.

---

## Storage

### Principes

- **MMKV chiffré** par défaut, jamais AsyncStorage (perfs + sécurité)
- **Clé de chiffrement** stockée dans le **Keychain OS** (jamais en dur, jamais dans MMKV)
- **Pattern fallback → secure** au boot : MMKV non chiffré dispo immédiatement, migration auto vers MMKV chiffré une fois la clé Keychain prête
- **Versioning du cache** (`MODEL_VERSION`) pour invalider l'intégralité du cache lors d'un changement breaking du shape des données stockées
- **Une seule façon d'accéder au storage** : `getMMKV()`. Jamais d'instance MMKV créée ailleurs
- Clés centralisées dans l'enum `STORAGE_KEY` (`~shared/storage/constants/StorageKey`) — dans le module, pas dans `shared/constants/`

### Clé de chiffrement (Keychain)

Génération aléatoire 256 bits (32 bytes hex), stockée dans le Keychain via `react-native-keychain`. Récupérée si déjà existante, sinon générée à la première ouverture.

```ts
// ~shared/storage/encryption.ts
import * as Keychain from 'react-native-keychain';

const SERVICE_KEY = 'mmkv-encryption-key';

const generateRandomKey = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const getEncryptionKey = async (): Promise<string> => {
  const creds = await Keychain.getGenericPassword({ service: SERVICE_KEY });

  if (creds && creds.password) {
    return creds.password;
  }

  const newKey = generateRandomKey();
  await Keychain.setGenericPassword('mmkv', newKey, { service: SERVICE_KEY });

  return newKey;
};
```

### Initialisation MMKV (fallback → secure)

Pattern obligatoire pour ne pas bloquer le boot de l'app : un fallback non chiffré est créé immédiatement, puis remplacé par l'instance chiffrée une fois la clé Keychain récupérée. Les données du fallback sont migrées automatiquement.

```ts
// ~shared/storage/mmkv.ts
import { createMMKV, MMKV } from 'react-native-mmkv';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { getCrashlytics } from '@react-native-firebase/crashlytics';
import { getEncryptionKey } from './encryption';

// ⚠️ Incrémenter MODEL_VERSION à chaque changement breaking du shape
//    des données stockées pour invalider l'intégralité du cache.
const MODEL_VERSION = 1;

type CacheEntry = {
  data: string;
  version: number;
};

const crashlytics = getCrashlytics();

let fallbackMMKV: MMKV | null = createMMKV({ id: 'fallback-mmkv' });
let secureMMKV: MMKV | null = null;

const migrateData = async (from: MMKV, to: MMKV) => {
  const keys = from.getAllKeys();

  for (const key of keys) {
    const value = from.getString(key);

    if (value != null) {
      to.set(key, value);
      from.remove(key);
    }
  }
};

let resolveIsMMKVSecureReady: (() => void) | null = null;

export const isMMKVSecureReadyPromise = new Promise<void>(resolve => {
  resolveIsMMKVSecureReady = resolve;
});

export const initializeSecureMMKV = async () => {
  if (secureMMKV) {
    return;
  }

  try {
    const encryptionKey = await getEncryptionKey();
    secureMMKV = createMMKV({ id: 'secure-mmkv', encryptionKey });

    if (fallbackMMKV) {
      await migrateData(fallbackMMKV, secureMMKV);
      fallbackMMKV = null;
    }

    if (resolveIsMMKVSecureReady) {
      resolveIsMMKVSecureReady();
      resolveIsMMKVSecureReady = null;
    }
  } catch (error: any) {
    console.error(`[Error] initializeSecureMMKV: ${error.message}`);
    crashlytics.recordError(error, '[Error] initializeSecureMMKV');
  }
};

export const getMMKV = (): MMKV => {
  return secureMMKV ?? fallbackMMKV!;
};
```

`initializeSecureMMKV()` est appelée **une fois** au démarrage de l'app (par exemple dans le splash screen, avant tout accès aux données utilisateur).

### Persister TanStack Query

Pour persister le cache des queries entre les sessions, exposer un `clientPersister` wrappé autour de MMKV. Le versioning est appliqué ici : si `MODEL_VERSION` change, les entrées sont invalidées silencieusement.

```ts
const clientStorage = {
  setItem: async (key: string, value: string) => {
    await isMMKVSecureReadyPromise;
    const data = JSON.stringify({ data: value, version: MODEL_VERSION });
    getMMKV().set(key, data);
  },
  getItem: async (key: string) => {
    await isMMKVSecureReadyPromise;
    const entry = getMMKV().getString(key);

    if (entry == null) {
      return null;
    }

    try {
      const value = JSON.parse(entry) as CacheEntry;

      if (value == null || value.version !== MODEL_VERSION) {
        return null;
      }

      return value.data;
    } catch {
      return null;
    }
  },
  removeItem: async (key: string) => {
    await isMMKVSecureReadyPromise;
    getMMKV().remove(key);
  },
};

export const clientPersister = createAsyncStoragePersister({
  storage: clientStorage,
});
```

### Usage côté composant

Lecture et écriture **synchrones**, via `getMMKV()` directement. Pas besoin d'attendre `isMMKVSecureReadyPromise` côté composant : le fallback est dispo immédiatement et la migration est transparente.

```ts
import { getMMKV } from '~shared/storage/mmkv';
import { STORAGE_KEY } from '~shared/storage/constants/StorageKey';

// Read
const token = getMMKV().getString(STORAGE_KEY.AUTH_TOKEN);

// Write
getMMKV().set(STORAGE_KEY.AUTH_TOKEN, 'abc123');

// Remove
getMMKV().remove(STORAGE_KEY.AUTH_TOKEN);
```

### Stocker des objets (sérialisation JSON)

MMKV stocke uniquement `string` / `number` / `boolean`. Pour les objets, sérialiser en JSON manuellement.

```ts
// Write
getMMKV().set(STORAGE_KEY.USER_PREFERENCES, JSON.stringify(preferences));

// Read
const raw = getMMKV().getString(STORAGE_KEY.USER_PREFERENCES);
const preferences = raw ? (JSON.parse(raw) as UserPreferences) : null;
```

### Clés (`STORAGE_KEY`)

Comme toutes les enums : SCREAMING_SNAKE_CASE pour le nom et les clés.

```ts
// ~shared/storage/constants/StorageKey.ts
export enum STORAGE_KEY {
  AUTH_TOKEN = 'AUTH_TOKEN',
  USER_PREFERENCES = 'USER_PREFERENCES',
  ONBOARDING_COMPLETED = 'ONBOARDING_COMPLETED',
}
```
