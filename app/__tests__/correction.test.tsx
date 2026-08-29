const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  useLocalSearchParams: () => ({ day: '2026-08-29' }),
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(cb, [cb]);
  },
}));

let mockDeps: ReturnType<typeof makeScreenDeps>['deps'] | null = null;
jest.mock('../../src/ui/AppProvider', () => ({
  useApp: () => ({ deps: mockDeps }),
  useDeps: () => mockDeps,
}));

import { screen } from '@testing-library/react-native';
import { FIVE, makeScreenDeps, renderScreen } from '../../src/ui/__tests__/renderHarness';
import Correction from '../correction/[day]';

let harness: ReturnType<typeof makeScreenDeps>;

/** Série corrigée du jour, avec une faute sur la première phrase. */
function correctToday(overall = 'Bon ensemble.') {
  const series = harness.deps.series.insert('2026-08-29', 'B1', FIVE);
  harness.deps.series.saveAnswers(
    series.id,
    FIVE.map((_, i) => ({ position: i + 1, user_en: i === 0 ? 'I goes home' : `réponse ${i + 1}` })),
  );
  harness.deps.series.saveCorrections(
    series.id,
    FIVE.map((_, i) => ({
      position: i + 1,
      score: i === 0 ? 4 : 9,
      corrected_en: i === 0 ? 'I go home' : `réponse ${i + 1}`,
      explanation: i === 0 ? 'Le sujet « I » prend « go ».' : '',
      error_tags: i === 0 ? (['agreement'] as const).slice() : [],
    })),
    overall,
  );
}

beforeEach(() => {
  mockReplace.mockClear();
  harness = makeScreenDeps();
  mockDeps = harness.deps;
});

describe('Correction', () => {
  it('affiche la moyenne, la série de jours et le commentaire d’ensemble', async () => {
    // `overall` était produit et payé, puis jeté : il doit rester visible.
    correctToday('Les temps sont à revoir.');
    await renderScreen(<Correction />);

    await screen.findByText(/Moyenne du jour 8/);
    expect(screen.getByText('Les temps sont à revoir.')).toBeOnTheScreen();
    expect(screen.getByText(/1 jour d’affilée/)).toBeOnTheScreen();
  });

  it('affiche le diff, la correction et l’explication d’une phrase fautive', async () => {
    correctToday();
    await renderScreen(<Correction />);

    await screen.findByText('Phrase 1.');
    expect(screen.getByText('4/10')).toBeOnTheScreen();
    expect(screen.getByText('goes')).toBeOnTheScreen();
    expect(screen.getByText('Le sujet « I » prend « go ».')).toBeOnTheScreen();
    expect(screen.getByText('Accord')).toBeOnTheScreen();
  });

  it('signale une journée inconnue plutôt que de planter', async () => {
    await renderScreen(<Correction />);
    await screen.findByText('Aucune série pour ce jour.');
  });
});
