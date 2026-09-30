# Formulaires & inputs

Saisie utilisateur : état, validation, clavier, soumission.

## Règles en bref

- L'état du formulaire vit dans le **hook de logique** de l'écran, jamais dans le screen
- Formulaire simple (1-3 champs) : inputs contrôlés `useState` ; formulaire riche : `react-hook-form`
- Validation au **blur ou à la soumission**, jamais à chaque frappe ; messages d'erreur traduits
- Soumission = mutation `mutateAsync` (cf. [`data-fetching.md`](./data-fetching.md)) avec état pending sur le bouton
- Le clavier ne doit jamais masquer le champ actif ni le bouton de soumission
- `react-hook-form` : lire un champ dans un composant enfant **toujours** via `useWatch`, jamais `methods.watch()` — sinon la valeur gèle derrière un ancêtre compilé (section dédiée en bas)
- Multi-sélection dont les options viennent de l'API → **un seul champ tableau d'ids** (`Controller` sur `number[]`), jamais un champ booléen par option : les noms de champs deviennent dynamiques, un point ou un espace dans un libellé casse le chemin `react-hook-form`, et la soumission doit reconstruire le tableau

---

## Structure

Le screen compose des champs ; le hook de logique possède les valeurs, erreurs et handlers :

```ts
export const useLoginScreenLogic = () => {
  const { loginMutate, isLoginPending } = useLoginMutation();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    setEmailError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isValidEmail(email)) {
      setEmailError(translate('error.auth.invalidEmail'));

      return;
    }

    await loginMutate({ email });
  }, [email, loginMutate]);

  return {
    email,
    emailError,
    isLoginPending,
    handleEmailChange,
    handleSubmit,
  };
};
```

- La validation pure (`isValidEmail`) est une fonction utilitaire testable, pas du code inline dans le handler
- L'erreur d'un champ se **réinitialise quand l'utilisateur retape** — pas de message d'erreur qui colle
- Pendant `isPending` : bouton désactivé + indicateur, jamais de double soumission possible

## `TextInput` — conventions

- Toujours préciser ce qui aide la saisie : `keyboardType`, `autoCapitalize`, `autoComplete`, `textContentType` (autofill iOS), `returnKeyType`
- `returnKeyType="next"` + `onSubmitEditing` pour chaîner les champs ; le dernier champ soumet
- Un champ custom réutilisable (`AppTextInput`) vit dans `shared/ui/components/` et encapsule le style theme + l'affichage d'erreur

## Clavier

- Écran avec champs : wrapper qui gère l'évitement clavier (`KeyboardAvoidingView` avec `behavior` par plateforme, ou la lib dédiée du projet)
- Contenu scrollable + champs : `keyboardShouldPersistTaps="handled"` sur le scroll (sinon le premier tap ferme juste le clavier)
- Fermer le clavier à la soumission (`Keyboard.dismiss()`) avant navigation ou toast

## Formulaires riches

Au-delà de ~3 champs interdépendants (validation croisée, dirty state, reset), passer à `react-hook-form` : un `useForm` dans le hook de logique, des composants champ branchés via `Controller`. Ne pas réinventer la gestion de dirty/touched à la main.

## `react-hook-form` × React Compiler — `useWatch`, jamais `methods.watch()`

**La règle** : seul le composant qui appelle `useForm()` a le droit d'utiliser `methods.watch()`. Partout ailleurs — enfant, composant de champ, sous-formulaire — on lit via `useWatch({ control, name })`. Dans un callback, on lit via `getValues()` (pas d'abonnement nécessaire, la valeur est toujours fraîche au moment du clic).

```tsx
// ❌ l'enfant lit via la prop methods
const DeliveryFields = (props: Props) => {
  const items = useMemo(
    () => findSlots(props.methods.watch('delivery.dayId')),
    [props.methods, props.methods.watch('delivery.dayId')],
  );

  return <Selector items={items} disabled={!props.methods.watch('delivery.dayId')} />;
};

// ✅ l'enfant s'abonne lui-même
const DeliveryFields = (props: Props) => {
  const dayId = useWatch({ control: props.methods.control, name: 'delivery.dayId' });

  const items = useMemo(() => findSlots(dayId), [dayId]);

  return <Selector items={items} disabled={!dayId} />;
};
```

### Pourquoi — deux pannes distinctes

**1. `watch()` dans un tableau de dépendances fait bail out le compilateur.** React Compiler refuse une deps list qui n'est pas faite d'expressions simples (`x`, `x.y.z`) :

```
CompileError | UseMemo | Expected the dependency list to be an array of
simple expressions (e.g. `x`, `x.y.z`, `x?.y?.z`)
```

Le composant **entier** perd l'auto-mémoïsation, silencieusement. Aucune erreur au runtime, aucun warning : juste un composant non optimisé qu'on croit optimisé.

**2. Le signal de re-render de `watch()` est bloqué par un ancêtre compilé.** C'est la panne vicieuse. `methods.watch(name)` ne re-rend que le composant **propriétaire du `useForm()`**. Si un ancêtre entre le propriétaire et le lecteur est compilé, son JSX est mis en cache avec `props.methods` en dépendance — identité stable, donc jamais invalidée. React bail out sur le sous-arbre, et l'enfant qui lit ne re-rend jamais : sa valeur reste gelée à l'écran.

```
Screen (useForm, re-rend)  →  Parent (compilé, JSX en cache)  →  Enfant (gelé)
                                        ↑
                        props.methods stable → cache jamais invalidé
```

Symptôme typique : un champ reste **désactivé** ou une section n'apparaît pas, jusqu'à ce qu'un événement sans rapport (soumission qui échoue, refetch d'une query, changement d'une autre prop) invalide le cache de l'ancêtre. L'utilisateur décrit ça comme « il faut que j'appuie une première fois sur le bouton pour que ça se débloque ».

`useWatch` abonne **le composant lui-même** : il déclenche son propre re-render via son state interne, indépendamment du JSX mis en cache par le parent. C'est la seule lecture qui traverse une frontière de mémoïsation.

### Diagnostiquer

Un composant qu'on croit réactif mais qui ne l'est pas : vérifier s'il est réellement compilé, et si un ancêtre l'est.

```bash
# Sort le code transformé : un composant compilé contient `useMemoCache`
npx babel <fichier> --plugins babel-plugin-react-compiler
```

Le plugin n'annonce pas ses bail out — il sort du code. Un composant compilé ouvre sur `const $ = _c(n)` (`useMemoCache`) ; un composant qui a bail out ressort **identique à la source**. Pour transformer le silence en erreur de build, passer `panicThreshold: 'all_errors'` dans les options du plugin, le temps du diagnostic.

En cas de doute sur la chaîne de re-render, un test `@testing-library/react-native` (cf. [`testing.md`](./testing.md)) qui `setValue()` puis relit l'état de l'enfant tranche en quelques minutes — le compilateur tourne aussi sous Jest, donc le test reproduit fidèlement le comportement de prod.
