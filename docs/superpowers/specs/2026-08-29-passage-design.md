# Passage — conception

**Date :** 2026-08-29
**Statut :** validé (approches A/B/C présentées, B retenue)

## 1. Objet

Application mobile personnelle d'entraînement quotidien à la traduction
français → anglais. Chaque jour, cinq phrases françaises sont générées par
Claude ; l'utilisateur les traduit ; Claude corrige avec une note, un diff et
une explication. Le niveau s'adapte aux résultats passés.

Nom : **Passage** — un passage de texte, et le passage d'une langue à l'autre.
Le mot est identique en français et en anglais.

## 2. Périmètre

**Dans le périmètre**

- Série quotidienne de cinq phrases, générée par l'IA.
- Correction groupée des cinq réponses : note /10, diff mot à mot, explication.
- Niveau plancher choisi par l'utilisateur, ajusté automatiquement de ±1 cran.
- Ciblage des erreurs récurrentes dans la génération suivante.
- Historique, série de jours consécutifs, statistiques d'erreurs.
- Rappel quotidien par notification locale.
- Fonctionnement hors-ligne pour la phase de traduction.

**Hors périmètre**

- Comptes utilisateurs, synchronisation entre appareils, backend.
- Publication sur les stores.
- Autres paires de langues.
- Audio, prononciation, reconnaissance vocale.

## 3. Contraintes

- **Usage strictement personnel.** La clé API Anthropic est saisie par
  l'utilisateur et conservée dans le stockage sécurisé du téléphone
  (Keychain iOS / Keystore Android) via `expo-secure-store`. Aucune clé n'est
  commitée, aucune n'est embarquée dans le binaire. Si l'application devait un
  jour être distribuée, cette décision devrait être revue : un binaire
  distribué est décompilable, et une clé qu'il contient est extractible.
- Aucun serveur : toute la persistance est locale (SQLite sur l'appareil).
- Deux appels API par jour en régime normal.

## 4. Stack

| Élément | Choix | Raison |
|---|---|---|
| Framework | Expo (React Native), TypeScript | iOS + Android, itération rapide, builds cloud |
| Navigation | `expo-router` | routage par fichiers, conventionnel sur Expo |
| Base locale | `expo-sqlite` | relationnel, requêtes d'historique simples |
| Secrets | `expo-secure-store` | Keychain / Keystore |
| Notifications | `expo-notifications` | rappel local quotidien |
| IA | `@anthropic-ai/sdk` + `zod` | sorties structurées via `messages.parse()` |
| Dessin | `react-native-svg` | logo et icônes vectoriels |
| Tests | `jest-expo`, `@testing-library/react-native`, `better-sqlite3` | logique pure, dépôts, composants |

Modèle : `claude-opus-5`, pensée adaptative.
`effort: "low"` pour la génération (tâche simple), `effort: "high"` pour la
correction (c'est là que se joue la qualité).
Appels non-streamés, `max_tokens: 16000`.

## 5. Architecture

Quatre couches, dépendances dirigées vers le bas. Chaque couche est testable
sans celle du dessus.

```
src/
  ui/          écrans, composants, thème         (React)
  usecases/    orchestration : cas d'usage       (pur + async)
  ai/          client Claude, prompts, schémas   (bordure réseau)
  data/        SQLite, dépôts, migrations        (bordure disque)
  core/        logique pure : niveau, diff, tags (aucune dépendance)
```

`core/` ne connaît rien. `data/` et `ai/` sont des bordures, chacune derrière
une interface que `usecases/` consomme. `ui/` ne parle jamais directement à `ai/`
ou `data/` : il passe par `usecases/`.

### 5.1 `core/` — logique pure

Quatre modules, aucun effet de bord, testés en priorité.

**`level.ts`** — calcul du niveau effectif.

```
niveaux : A2 < B1 < B2 < C1 < C2
effectif(base, séries) :
  moyenne = note moyenne des 5 dernières séries corrigées
  si moins de 3 séries corrigées      → base
  si moyenne >= 8.5                   → base + 1
  si moyenne <= 5.5                   → base - 1
  sinon                               → base
  borné à [A2, C2]
```

Le décalage ne dépasse jamais un cran : le niveau choisi reste le plancher de
référence, l'app ne dérive pas.

**`diff.ts`** — diff mot à mot entre la réponse et la correction.
Plus longue sous-séquence commune sur les tokens, restituée en
`[{ op: 'keep' | 'del' | 'ins', text }]`. Calculé localement : déterministe,
testable, gratuit en tokens.

**`errorTags.ts`** — agrégation des étiquettes d'erreur.
Ensemble fermé : `tense`, `preposition`, `article`, `word_order`,
`vocabulary`, `false_friend`, `agreement`, `register`, `spelling`, `idiom`.
Rend le classement des trois étiquettes les plus fréquentes sur les trois
dernières séries, injecté dans le prompt de génération.

**`streak.ts`** — jours consécutifs avec une série corrigée, horloge injectée.

### 5.2 `data/` — persistance

```sql
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE series (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  day          TEXT NOT NULL UNIQUE,      -- 'AAAA-MM-JJ', heure locale
  level        TEXT NOT NULL,             -- niveau effectif au moment de la génération
  status       TEXT NOT NULL
               CHECK (status IN ('pending','in_progress','awaiting_correction','corrected')),
  created_at   TEXT NOT NULL,
  corrected_at TEXT
);

CREATE TABLE sentence (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id    INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,          -- 1..5
  source_fr    TEXT NOT NULL,
  reference_en TEXT NOT NULL,
  targets_tag  TEXT,                      -- étiquette ciblée, ou NULL
  UNIQUE (series_id, position)
);

CREATE TABLE answer (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sentence_id  INTEGER NOT NULL UNIQUE REFERENCES sentence(id) ON DELETE CASCADE,
  user_en      TEXT NOT NULL,
  score        INTEGER,                   -- 0..10, NULL tant que non corrigé
  corrected_en TEXT,
  explanation  TEXT,
  error_tags   TEXT                       -- tableau JSON
);
```

Cycle de vie d'une série :

```
pending ──(l'utilisateur ouvre la série du jour)──> in_progress
in_progress ──(validation, réseau absent)──> awaiting_correction
in_progress ──(validation, correction reçue)──> corrected
awaiting_correction ──(retour du réseau)──> corrected
```

Trois dépôts : `SettingsRepository`, `SeriesRepository`, `StatsRepository`.
Chacun derrière une interface ; l'implémentation SQLite est partagée entre
`expo-sqlite` (appareil) et `better-sqlite3` (tests Node) via une fine couche
d'adaptation qui n'expose que `execute`, `query` et `transaction`.

### 5.3 `ai/` — bordure Claude

Deux fonctions, chacune un appel, chacune une sortie structurée Zod.

**`generateSeries(level, weakTags, recentSources)`**

Le prompt système est stable et marqué `cache_control: { type: 'ephemeral' }` :
rôle, règles de rédaction, définition des niveaux, liste fermée des étiquettes.
Le message utilisateur porte le volatile : niveau effectif, trois étiquettes
faibles, phrases des sept derniers jours (pour éviter les redites).

```ts
const SeriesSchema = z.object({
  sentences: z.array(z.object({
    source_fr:    z.string(),
    reference_en: z.string(),
    targets_tag:  z.enum(ERROR_TAGS).nullable(),
  })).length(5),
});
```

Deux des cinq phrases ciblent les faiblesses relevées ; les trois autres
balaient large pour ne pas enfermer la révision.

**`correctSeries(items)`** — un seul appel pour les cinq phrases.

```ts
const CorrectionSchema = z.object({
  items: z.array(z.object({
    position:     z.number().int().min(1).max(5),
    score:        z.number().int().min(0).max(10),
    corrected_en: z.string(),
    explanation:  z.string(),
    error_tags:   z.array(z.enum(ERROR_TAGS)),
  })).length(5),
  overall: z.string(),
});
```

Le prompt insiste sur deux points : accepter toute traduction correcte même
éloignée de la référence, et n'expliquer que ce qui est réellement fautif.
Le diff n'est pas demandé au modèle — il est calculé par `core/diff.ts`.

Les erreurs sont converties en un type fermé avant de remonter :

| Origine | Type rendu | Traitement dans l'interface |
|---|---|---|
| `AuthenticationError` | `invalid_key` | message + lien vers les réglages |
| `RateLimitError` | `rate_limited` | trois tentatives, recul exponentiel |
| `APIConnectionError` | `offline` | bascule sur le chemin hors-ligne |
| `parsed_output` nul | `bad_response` | une nouvelle tentative, puis échec explicite |
| autre `APIError` | `api_error` | message avec le code d'état |

### 5.4 `usecases/` — orchestration

**`getTodaySeries()`**
1. Une série existe pour aujourd'hui → la rendre.
2. Sinon, générer, écrire en base avec `status = 'pending'`, la rendre.
3. Réseau absent et rien en base → erreur `offline`.

**`submitAnswers(seriesId, answers)`**
1. Écrire les réponses, passer la série à `in_progress`.
2. Appeler `correctSeries`. Succès → écrire les corrections, `corrected`.
3. Échec réseau → `awaiting_correction`, les réponses sont conservées.
4. Après un succès, déclencher `prefetchTomorrow()` sans attendre.

**`prefetchTomorrow()`** — si aucune série n'existe pour J+1, en générer une en
`pending`. Appelée après une correction réussie et au lancement de
l'application. Pas de tâche de fond : pour un rituel quotidien, ces deux
déclencheurs suffisent, et l'exécution en arrière-plan est trop peu fiable sur
mobile pour valoir sa complexité.

**`retryPendingCorrection()`** — au lancement, si une série est
`awaiting_correction`, retenter la correction.

## 6. Écrans

**Démarrage** — trois étapes : clé API, niveau de base (A2 → C1), heure du
rappel. La clé est validée par un appel minimal avant d'être enregistrée.

**Aujourd'hui** — l'écran principal. Les cinq phrases françaises en pile, une
carte par phrase avec sa zone de saisie ; progression « 3 / 5 » en tête ;
bouton « Corriger » actif quand les cinq champs sont remplis. Les réponses sont
sauvegardées à chaque frappe (avec temporisation) pour survivre à une
fermeture.

**Correction** — une carte par phrase : note /10 en pastille, la phrase source,
le diff coloré (suppressions barrées en rouge sourd, ajouts soulignés en vert),
la correction propre, puis l'explication. En pied de page, la note moyenne du
jour et la série de jours consécutifs.

**Historique** — grille des jours façon calendrier, teinte selon la note ;
au-dessous, la note moyenne mobile et les trois erreurs les plus fréquentes.
Toucher un jour ouvre sa correction.

**Réglages** — clé API, niveau de base, heure du rappel, thème
(clair / sombre / système), effacement des données.

## 7. Identité visuelle

**Logo.** Une arche : deux montants verticaux, un arc, et un point qui la
franchit — le mot rendu littéral. Tracé en SVG, décliné en icône
d'application (PNG 1024×1024) et en écran de lancement.

**Palette.**

| Rôle | Clair | Sombre |
|---|---|---|
| Fond | `#FBF9F4` | `#121110` |
| Texte | `#1A1815` | `#F0EBE3` |
| Texte secondaire | `#6B6459` | `#9A9186` |
| Accent | `#C2703D` | `#D98A56` |
| Réussite | `#4A7C59` | `#6FA37D` |
| Erreur | `#B4544A` | `#D2766B` |
| Bordure | `#E5DFD4` | `#2A2724` |

Papier chaud plutôt que blanc clinique, ambre plutôt que bleu applicatif : la
lecture est l'activité centrale, la teinte doit rester reposante.

**Typographie.** Une serif (Fraunces, via `expo-google-fonts`) pour les phrases
françaises et anglaises — c'est le texte qu'on lit et relit. La police système
pour l'interface. Les corrections en `ui-monospace` pour aligner le diff.

## 8. Tests

L'ordre suit la structure : la logique pure d'abord, l'interface en dernier.

| Cible | Approche |
|---|---|
| `core/level.ts` | tables de cas : trop peu de données, montée, descente, bornes |
| `core/diff.ts` | insertion, suppression, remplacement, réordonnancement, égalité |
| `core/errorTags.ts` | classement, égalités, fenêtre de trois séries |
| `core/streak.ts` | horloge injectée : jours consécutifs, rupture, jour même |
| `data/*` | `better-sqlite3` en mémoire : migrations, transitions d'état, cascades |
| `ai/*` | SDK simulé : assemblage du prompt, correspondance des schémas, table des erreurs |
| `usecases/*` | dépôts et client simulés : les quatre cas d'usage, chemins hors-ligne |
| `ui/*` | `@testing-library/react-native` : saisie, activation du bouton, rendu du diff |

Aucun test ne touche l'API réelle. Un script séparé, lancé à la main, fait un
appel de bout en bout pour vérifier que les prompts tiennent la route.

## 9. Découpage de la mise en œuvre

1. **Fondations** — squelette Expo, TypeScript, lint, tests qui passent à vide.
2. **Noyau** — les quatre modules purs, en test d'abord.
3. **Persistance** — schéma, migrations, dépôts.
4. **Bordure IA** — client, prompts, schémas, table des erreurs.
5. **Orchestration** — les quatre cas d'usage, prefetch, chemins hors-ligne.
6. **Interface** — thème, composants, les cinq écrans.
7. **Identité** — logo SVG, icône, écran de lancement, polices.
8. **Finition** — notification quotidienne, historique, réglages, revue.

Chaque étape est utilisable seule et testée avant la suivante.

## 10. Points tranchés

- **Diff calculé localement, pas demandé au modèle.** Déterministe, testable,
  sans coût en tokens.
- **Correction groupée, pas phrase par phrase.** Voir la correction de la
  première phrase donnerait du vocabulaire pour les suivantes et fausserait
  l'évaluation adaptative.
- **Pas de tâche de fond pour le prefetch.** Les deux déclencheurs au premier
  plan couvrent l'usage réel ; l'exécution en arrière-plan sur mobile est peu
  fiable pour ce que ça apporterait.
- **Le niveau de base est un plancher, pas une suggestion.** L'adaptatif ne
  dévie que d'un cran, dans les deux sens.
- **Ensemble fermé d'étiquettes d'erreur.** Sans quoi les statistiques
  d'historique ne s'agrègent pas.
