import Anthropic from '@anthropic-ai/sdk';
import { AppError, toAppError } from '../errors';

/** Les erreurs du SDK ne s'instancient pas simplement : on fabrique le prototype. */
const sdkError = (Cls: { prototype: object }, status?: number): unknown =>
  Object.assign(Object.create(Cls.prototype), { status, message: 'boom' });

describe('toAppError', () => {
  it('traduit une clé invalide', () => {
    expect(toAppError(sdkError(Anthropic.AuthenticationError, 401)).kind).toBe('invalid_key');
  });

  it('traduit une limite de débit', () => {
    expect(toAppError(sdkError(Anthropic.RateLimitError, 429)).kind).toBe('rate_limited');
  });

  it('traduit une panne de connexion', () => {
    expect(toAppError(sdkError(Anthropic.APIConnectionError)).kind).toBe('offline');
  });

  it('range les autres erreurs API sous api_error en gardant le code', () => {
    const err = toAppError(sdkError(Anthropic.InternalServerError, 500));
    expect(err.kind).toBe('api_error');
    expect(err.status).toBe(500);
  });

  it('laisse passer une AppError déjà construite', () => {
    const original = new AppError('bad_response');
    expect(toAppError(original)).toBe(original);
  });

  it('ne recopie jamais la clé API dans le message', () => {
    const err = toAppError(new Error('failed with key sk-ant-secret123'));
    expect(err.message).not.toContain('sk-ant-secret123');
  });

  it('donne un message français à chaque genre', () => {
    for (const kind of ['invalid_key', 'rate_limited', 'offline', 'bad_response', 'api_error'] as const) {
      expect(new AppError(kind).message.length).toBeGreaterThan(0);
    }
  });
});
