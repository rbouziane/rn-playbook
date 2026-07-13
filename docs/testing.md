# Testing

Quoi tester, où, comment. Lancer avec `yarn test` (Jest, preset React Native).

## Règles en bref

- Priorité aux **fonctions pures** : reducers et utils sont testés systématiquement
- Hooks métier à logique non triviale : `renderHook` (`@testing-library/react-native`)
- Pas de snapshots massifs de composants — un composant se vérifie par ses règles + l'app qui tourne
- Test colocalisé : `xxx.test.ts` à côté du fichier testé
- Un `it` = un comportement ; libellés en anglais, descriptifs (`it('maps null description to null')`)

---

## Quoi tester — par ordre de priorité

| Cible                                   | Attendu                                                    |
| --------------------------------------- | ---------------------------------------------------------- |
| `services/reducer.ts`                   | **Systématique** — cas nominal, champs `null`, payload malformé (throw) |
| `shared/utils/` et utils de feature     | **Systématique** — fonctions pures, cas limites            |
| Hooks métier à logique (timer, calculs) | Si la logique n'est pas triviale — `renderHook`            |
| Hooks de query/mutation                 | Non testés unitairement (TanStack est déjà testé) — leur logique vit dans le reducer, qui lui est testé |
| Composants                              | Pas de snapshot par défaut. Test de comportement uniquement si logique conditionnelle complexe |
| Écrans / navigation                     | Non testés unitairement — vérification fonctionnelle (app lancée) |

Le ratio visé : beaucoup de tests rapides sur le pur, peu de tests d'intégration lents. Si une logique est difficile à tester, c'est souvent qu'elle est au mauvais endroit (la sortir dans une fonction pure).

## Localisation & naming

- Fichier de test **à côté** du fichier testé : `reducer.ts` → `reducer.test.ts`
- Pas de dossier `__tests__/` global
- `describe` = nom de la fonction/du hook ; `it` = comportement observable

```ts
// features/item/services/reducer.test.ts
describe('itemReducer', () => {
  it('maps API fields to app fields', () => {
    const result = itemReducer(makeItemApi());

    expect(result.priceCents).toBe(1200);
  });

  it('throws on missing id', () => {
    expect(() => itemReducer(makeItemApi({ id: null }))).toThrow();
  });
});
```

## Fixtures & mocks

- **Factories** plutôt que des objets dupliqués : `makeItemApi(overrides?)` dans le fichier de test (ou un `fixtures.ts` local si partagé)
- Modules natifs mockés **une fois** dans `jest.setup.js` (MMKV, keychain, crashlytics, reanimated…) — jamais de mock natif copié-collé par fichier
- Ne pas mocker ce qu'on teste ; mocker uniquement les frontières (natif, réseau, temps)
- Temps : `jest.useFakeTimers()` pour les timers, jamais de `setTimeout` réel dans un test

## Hooks — `renderHook`

```ts
import { renderHook, act } from '@testing-library/react-native';

it('decrements the timer each second', () => {
  jest.useFakeTimers();

  const { result } = renderHook(() => useGameTimer(10));

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  expect(result.current.secondsLeft).toBe(7);
});
```

Si le hook dépend d'un provider (query client, context), créer un `wrapper` de test réutilisable dans `shared/utils/test/` .
