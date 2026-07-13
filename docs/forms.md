# Formulaires & inputs

Saisie utilisateur : état, validation, clavier, soumission.

## Règles en bref

- L'état du formulaire vit dans le **hook de logique** de l'écran, jamais dans le screen
- Formulaire simple (1-3 champs) : inputs contrôlés `useState` ; formulaire riche : `react-hook-form`
- Validation au **blur ou à la soumission**, jamais à chaque frappe ; messages d'erreur traduits
- Soumission = mutation `mutateAsync` (cf. [`data-fetching.md`](./data-fetching.md)) avec état pending sur le bouton
- Le clavier ne doit jamais masquer le champ actif ni le bouton de soumission

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
