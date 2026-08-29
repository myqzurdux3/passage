# Passage

Cinq phrases françaises à traduire en anglais chaque jour, corrigées par Claude
avec une note, un diff et une explication. Le niveau s'adapte à ce qu'on rate.

Application Expo / React Native, à usage strictement personnel : aucun serveur,
aucun compte, toutes les données restent sur le téléphone.

## Lancer

```bash
npm install
npx expo start
```

Au premier lancement, l'application demande une clé API Anthropic, un niveau de
base (A2 → C1) et une heure de rappel.

## La clé API

Elle est saisie dans l'application et rangée dans le stockage sécurisé du
téléphone (Keychain sur iOS, Keystore sur Android) via `expo-secure-store`.
Elle n'est jamais écrite en base, jamais journalisée, jamais recopiée dans un
message d'erreur, et rien de tel n'est commité.

**Cette application n'est pas distribuable en l'état.** Un binaire distribué se
décompile, et n'importe qui pourrait en extraire la clé. Pour la partager, il
faudrait un proxy côté serveur qui garde la clé et expose les deux appels.

## Comment ça marche

Cinq couches, dépendances descendantes :

| Couche | Rôle |
|---|---|
| `app/` | routes `expo-router` : les cinq écrans |
| `src/ui/` | thème, composants partagés, fournisseur applicatif |
| `src/usecases/` | cas d'usage : série du jour, correction, prefetch, reprise |
| `src/ai/` | client Claude, prompts, schémas, type d'erreur fermé |
| `src/data/` | SQLite : schéma, migrations, dépôts |
| `src/core/` | logique pure : niveaux, diff, étiquettes, série de jours |

Les cas d'usage vivent dans `src/usecases/` et non `src/app/` : `src/app` est une
racine de routes réservée par `expo-router`, qui la préfère silencieusement au
`app/` de la racine et n'aurait chargé aucun écran.

Deux appels par jour : un pour générer les cinq phrases, un pour corriger les
cinq réponses d'un coup. La série du lendemain est pré-générée dès qu'une
correction aboutit, ce qui rend la phase de traduction utilisable sans réseau.
Si le réseau manque au moment de valider, les réponses sont conservées et la
correction reprend au lancement suivant.

Le diff mot à mot est calculé localement, pas demandé au modèle : déterministe,
testable, gratuit en tokens.

Modèle : `claude-opus-5`, pensée adaptative, effort `low` pour la génération et
`high` pour la correction.

## Sous Expo Go

Deux contraintes de l'environnement Expo Go, toutes deux traitées dans le code :

- `expo-notifications` n'a plus de module natif depuis le SDK 53 et lève dès
  l'import. `src/usecases/reminders.ts` le charge à la demande et s'abstient
  quand `Constants.executionEnvironment === 'storeClient'` : pas de rappel sous
  Expo Go, mais rien ne casse.
- Le SDK Anthropic importe `node:fs` et `node:path` dans sa chaîne de
  résolution de credentials. `metro.config.js` les remplace par des modules
  vides — ce chemin n'est jamais emprunté, le client est toujours construit
  avec une `apiKey` explicite.

Pour un rappel qui fonctionne vraiment, il faut un *development build*.

## Installer sur un téléphone

Expo Go ne suffit pas pour le rappel quotidien. Pour une vraie app installée :

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64   # Gradle refuse le JDK 25
npx expo run:android --variant release
```

`expo prebuild` génère `android/` (ignoré par git, régénérable). Le premier
build prend une vingtaine de minutes ; il compile par défaut les quatre
architectures alors qu'un téléphone récent n'en utilise qu'une. Pour diviser le
temps par quatre, après le premier prebuild :

```
# android/gradle.properties
reactNativeArchitectures=arm64-v8a
```

Le paquet installé est `com.passage.app`.

## Tests

```bash
npm test              # les deux projets
npm run test:node     # logique, persistance, IA, cas d'usage
npm run typecheck
```

Aucun test n'appelle l'API. Pour éprouver les prompts pour de vrai — cela coûte
de l'argent :

```bash
ANTHROPIC_API_KEY=sk-ant-… node tools/smoke-api.mjs
```

## Icônes

Le logo est une arche avec un point dans son ouverture, défini une fois dans
`assets/logo.svg` et dans `src/ui/Logo.tsx`. Après retouche :

```bash
npm run icons
```

## Documents

- Conception : `docs/superpowers/specs/2026-08-29-passage-design.md`
- Plan de mise en œuvre : `docs/superpowers/plans/2026-08-29-passage.md`
