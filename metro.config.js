const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Le SDK Anthropic importe `node:fs` et `node:path` dans sa chaîne de
 * résolution de credentials (fichier de profil, variables d'environnement).
 * Rien de tout cela n'a de sens sur un téléphone, et ce chemin n'est jamais
 * emprunté ici : on construit toujours le client avec une `apiKey` explicite.
 *
 * Metro résout les imports statiquement, y compris ceux qui vivent dans une
 * branche morte — d'où ces modules vides plutôt qu'un polyfill.
 */
const STUBBED = new Set(['node:fs', 'node:path', 'fs', 'path']);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (STUBBED.has(moduleName)) return { type: 'empty' };
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
