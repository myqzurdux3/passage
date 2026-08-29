import Anthropic from '@anthropic-ai/sdk';

export type AppErrorKind =
  | 'invalid_key'
  | 'rate_limited'
  | 'offline'
  | 'bad_response'
  | 'api_error';

const MESSAGES: Record<AppErrorKind, string> = {
  invalid_key: 'La clé API est refusée. Vérifie-la dans les réglages.',
  rate_limited: 'Trop de requêtes coup sur coup. Réessaie dans un instant.',
  offline: 'Pas de connexion.',
  bad_response: 'Réponse illisible du modèle.',
  api_error: "L'API a renvoyé une erreur.",
};

export class AppError extends Error {
  constructor(
    readonly kind: AppErrorKind,
    message?: string,
    readonly status?: number,
  ) {
    super(message ?? MESSAGES[kind]);
    this.name = 'AppError';
  }
}

/**
 * Convertit tout ce qui remonte du SDK en type fermé.
 * Le message d'origine n'est jamais recopié : il peut contenir la clé API.
 */
export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  if (e instanceof Anthropic.AuthenticationError) return new AppError('invalid_key', undefined, 401);
  if (e instanceof Anthropic.RateLimitError) return new AppError('rate_limited', undefined, 429);
  if (e instanceof Anthropic.APIConnectionError) return new AppError('offline');
  if (e instanceof Anthropic.APIError) {
    return new AppError('api_error', undefined, (e as { status?: number }).status);
  }
  return new AppError('api_error');
}
