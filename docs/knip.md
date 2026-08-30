# Pourquoi ces exceptions dans `knip.json`

Trois signalements de l'outil ont été vérifiés un par un et écartés. Sans ces
exceptions, `npm run deadcode` crie au loup à chaque exécution — et un outil
qu'on ignore ne sert plus à rien.

**`expo-font`** — jamais importé directement par le code de l'application.
Mais `@expo-google-fonts/fraunces` en dépend sans le déclarer
(`node_modules/@expo-google-fonts/fraunces/useFonts.js` fait
`import { loadAsync } from 'expo-font'`). Le retirer des dépendances casserait
le chargement des polices au premier lancement.

**`babel-jest`** — référencé par `jest.config.js`, résolu par la hiérarchie de
`node_modules` via `jest`. Le déclarer en dépendance directe n'apporterait rien
et ajouterait une version à tenir à jour.

**`expo-updates`** — signalé comme dépendance non déclarée « depuis
`app.json` », alors que le fichier ne contient aucune clé `updates` :
`grep -c updates app.json` rend `0`. Le greffon Expo de l'outil le suppose
présent pour tout projet Expo. Faux positif, mis en exception faute de pouvoir
le corriger en amont.
