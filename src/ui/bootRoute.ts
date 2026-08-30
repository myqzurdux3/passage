/**
 * Décide où l'application doit se trouver au démarrage.
 *
 * Extrait du composant de garde pour être éprouvable : c'est cette décision
 * qui fait voir l'amorçage ou les phrases du jour, et une erreur ici enferme
 * l'utilisateur sur un écran ou le fait boucler entre les deux.
 *
 * Rend `null` quand il n'y a rien à faire — le cas courant.
 */
export function resolveBootRoute(state: {
  ready: boolean;
  hasApiKey: boolean;
  onOnboarding: boolean;
}): '/onboarding' | '/' | null {
  // Tant que la clé n'a pas été lue, rediriger enverrait vers l'amorçage
  // quelqu'un qui en a déjà une.
  if (!state.ready) return null;

  if (!state.hasApiKey) return state.onOnboarding ? null : '/onboarding';
  return state.onOnboarding ? '/' : null;
}
