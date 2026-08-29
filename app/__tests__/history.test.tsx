const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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
import History from '../history';

let harness: ReturnType<typeof makeScreenDeps>;

function correctDay(day: string, score: number, tag?: 'tense' | 'article') {
  const series = harness.deps.series.insert(day, 'B1', FIVE);
  harness.deps.series.saveAnswers(
    series.id,
    FIVE.map((_, i) => ({ position: i + 1, user_en: 'x' })),
  );
  harness.deps.series.saveCorrections(
    series.id,
    FIVE.map((_, i) => ({
      position: i + 1,
      score,
      corrected_en: 'ok',
      explanation: '',
      error_tags: tag && i === 0 ? [tag] : [],
    })),
  );
}

beforeEach(() => {
  mockPush.mockClear();
  harness = makeScreenDeps();
  mockDeps = harness.deps;
});

describe('Historique', () => {
  it('invite à commencer quand rien n’a été fait', async () => {
    await renderScreen(<History />);
    await screen.findByText('Rien encore. La première série arrive.');
  });

  it('affiche la moyenne générale et le nombre de séries', async () => {
    correctDay('2026-08-27', 10);
    correctDay('2026-08-28', 6);
    await renderScreen(<History />);

    await screen.findByText('8 / 10');
    expect(screen.getByText(/2 séries/)).toBeOnTheScreen();
  });

  it('analyse toute la fenêtre demandée, pas seulement trois séries', async () => {
    // Le bug d'origine : l'écran demandait dix séries, la fonction en gardait
    // trois, et une faiblesse ancienne disparaissait de la synthèse.
    correctDay('2026-08-20', 6, 'tense');
    for (const day of ['2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28']) {
      correctDay(day, 9, 'article');
    }

    await renderScreen(<History />);

    await screen.findByText('Ce qui revient le plus');
    expect(screen.getByText('· Temps')).toBeOnTheScreen();
    expect(screen.getByText('· Article')).toBeOnTheScreen();
  });

  it('ouvre la correction d’un jour depuis la grille', async () => {
    correctDay('2026-08-28', 7);
    await renderScreen(<History />);

    const cell = await screen.findByLabelText(/2026-08-28/);
    const { fireEvent } = jest.requireActual('@testing-library/react-native');
    await fireEvent.press(cell);

    expect(mockPush).toHaveBeenCalledWith('/correction/2026-08-28');
  });
});
