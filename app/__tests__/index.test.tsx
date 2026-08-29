const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
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

import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { FIVE, makeScreenDeps, renderScreen } from '../../src/ui/__tests__/renderHarness';
import Today from '../index';

let harness: ReturnType<typeof makeScreenDeps>;

beforeEach(() => {
  jest.useFakeTimers();
  mockReplace.mockClear();
  mockPush.mockClear();
  harness = makeScreenDeps();
  mockDeps = harness.deps;
});

afterEach(() => {
  jest.useRealTimers();
});

const answerAll = async () => {
  for (let position = 1; position <= 5; position++) {
    await fireEvent.changeText(
      screen.getByLabelText(`Traduction de la phrase ${position}`),
      `réponse ${position}`,
    );
  }
};

describe('Aujourd’hui — chargement', () => {
  it('génère la série du jour et affiche les cinq phrases', async () => {
    await renderScreen(<Today />);

    await screen.findByText('Phrase 1.');
    expect(harness.generateSeries).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Phrase 5.')).toBeOnTheScreen();
  });

  it('ne régénère pas une série déjà en base', async () => {
    harness.deps.series.insert('2026-08-29', 'B1', FIVE);
    await renderScreen(<Today />);

    await screen.findByText('Phrase 1.');
    expect(harness.generateSeries).not.toHaveBeenCalled();
  });

  it('affiche l’erreur et propose de réessayer quand la génération échoue', async () => {
    const { AppError } = jest.requireActual('../../src/ai/errors');
    harness.generateSeries.mockRejectedValue(new AppError('offline'));

    await renderScreen(<Today />);

    await screen.findByText('Impossible de charger');
    expect(screen.getByText('Réessayer')).toBeOnTheScreen();
  });

  it('propose d’ouvrir les réglages quand la clé est refusée', async () => {
    const { AppError } = jest.requireActual('../../src/ai/errors');
    harness.generateSeries.mockRejectedValue(new AppError('invalid_key'));

    await renderScreen(<Today />);

    await screen.findByText('Ouvrir les réglages');
  });
});

describe('Aujourd’hui — saisie', () => {
  it('le bouton reste inactif tant que les cinq champs ne sont pas remplis', async () => {
    await renderScreen(<Today />);
    await screen.findByText('Phrase 1.');

    await fireEvent.changeText(screen.getByLabelText('Traduction de la phrase 1'), 'une seule');
    await fireEvent.press(screen.getByText('Corriger'));

    expect(harness.correctSeries).not.toHaveBeenCalled();
  });

  it('enregistre chaque champ indépendamment', async () => {
    // Le bug d'origine : un minuteur unique annulait la sauvegarde du champ
    // précédent dès qu'on passait au suivant.
    await renderScreen(<Today />);
    await screen.findByText('Phrase 1.');

    await fireEvent.changeText(screen.getByLabelText('Traduction de la phrase 1'), 'première');
    await fireEvent.changeText(screen.getByLabelText('Traduction de la phrase 2'), 'deuxième');
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    const stored = harness.deps.series.findByDay('2026-08-29')!;
    expect(stored.sentences[0].user_en).toBe('première');
    expect(stored.sentences[1].user_en).toBe('deuxième');
  });

  it('écrit les saisies en attente au démontage', async () => {
    const view = await renderScreen(<Today />);
    await screen.findByText('Phrase 1.');

    await fireEvent.changeText(screen.getByLabelText('Traduction de la phrase 3'), 'juste avant');
    await act(async () => {
      view.unmount();
    });

    expect(harness.deps.series.findByDay('2026-08-29')!.sentences[2].user_en).toBe('juste avant');
  });
});

describe('Aujourd’hui — correction', () => {
  it('envoie les cinq réponses et navigue vers la correction', async () => {
    await renderScreen(<Today />);
    await screen.findByText('Phrase 1.');

    await answerAll();
    await fireEvent.press(screen.getByText('Corriger'));

    await waitFor(() => expect(harness.correctSeries).toHaveBeenCalledTimes(1));
    expect(harness.correctSeries.mock.calls[0][0].items).toHaveLength(5);
    expect(mockReplace).toHaveBeenCalledWith('/correction/2026-08-29');
  });

  it('garde les réponses et signale la panne quand le réseau tombe', async () => {
    const { AppError } = jest.requireActual('../../src/ai/errors');
    harness.correctSeries.mockRejectedValue(new AppError('offline'));

    await renderScreen(<Today />);
    await screen.findByText('Phrase 1.');
    await answerAll();
    await fireEvent.press(screen.getByText('Corriger'));

    await screen.findByText(/Pas de connexion/);
    expect(harness.deps.series.findByDay('2026-08-29')!.status).toBe('awaiting_correction');
    expect(harness.deps.series.findByDay('2026-08-29')!.sentences[0].user_en).toBe('réponse 1');
  });
});

describe('Aujourd’hui — série déjà corrigée', () => {
  it('affiche « C’est fait » au lieu de rediriger en boucle', async () => {
    // Le bug d'origine : rediriger vers la correction, dont le bouton
    // « Retour » ramenait ici, qui redirigeait de nouveau.
    const series = harness.deps.series.insert('2026-08-29', 'B1', FIVE);
    harness.deps.series.saveAnswers(
      series.id,
      FIVE.map((_, i) => ({ position: i + 1, user_en: `r${i + 1}` })),
    );
    harness.deps.series.saveCorrections(
      series.id,
      FIVE.map((_, i) => ({
        position: i + 1,
        score: 8,
        corrected_en: 'ok',
        explanation: '',
        error_tags: [],
      })),
      'Bien joué.',
    );

    await renderScreen(<Today />);

    await screen.findByText('C’est fait');
    expect(screen.getByText('8 / 10')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
