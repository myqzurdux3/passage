const mockUpdateSettings = jest.fn();
const mockSaveApiKey = jest.fn().mockResolvedValue(undefined);
const mockGenerateSeries = jest.fn().mockResolvedValue([]);

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('../../src/ai/claude', () => ({
  makeAiClient: () => ({ generateSeries: mockGenerateSeries, correctSeries: jest.fn() }),
}));
jest.mock('../../src/ui/AppProvider', () => ({
  useApp: () => ({ updateSettings: mockUpdateSettings, saveApiKey: mockSaveApiKey }),
}));

import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../src/ui/__tests__/renderHarness';
import Onboarding from '../onboarding';

/** Traverse les trois étapes jusqu'au champ « heure du rappel ». */
async function reachReminderStep(hour: string) {
  await renderScreen(<Onboarding />);

  await fireEvent.changeText(screen.getByLabelText('Clé API Anthropic'), 'sk-ant-valide');
  await fireEvent.press(screen.getByText('Vérifier et continuer'));
  await screen.findByText('Ton niveau de base');

  await fireEvent.press(screen.getByText('Continuer'));
  await screen.findByText('Le rappel du jour');

  const field = screen.getByLabelText('Heure du rappel');
  await fireEvent.changeText(field, hour);
  await fireEvent.press(screen.getByText('Commencer'));
}

beforeEach(() => {
  mockUpdateSettings.mockClear();
  mockSaveApiKey.mockClear();
  mockGenerateSeries.mockClear().mockResolvedValue([]);
});

describe("Onboarding — vérification de la clé", () => {
  it('éprouve la clé avant de l’enregistrer', async () => {
    await renderScreen(<Onboarding />);

    await fireEvent.changeText(screen.getByLabelText('Clé API Anthropic'), 'sk-ant-valide');
    await fireEvent.press(screen.getByText('Vérifier et continuer'));

    await screen.findByText('Ton niveau de base');
    expect(mockGenerateSeries).toHaveBeenCalledTimes(1);
    expect(mockSaveApiKey).not.toHaveBeenCalled();
  });

  it('reste à l’étape de la clé quand elle est refusée', async () => {
    const { AppError } = jest.requireActual('../../src/ai/errors');
    mockGenerateSeries.mockRejectedValue(new AppError('invalid_key'));
    await renderScreen(<Onboarding />);

    await fireEvent.changeText(screen.getByLabelText('Clé API Anthropic'), 'sk-ant-fausse');
    await fireEvent.press(screen.getByText('Vérifier et continuer'));

    await screen.findByText(/clé API est refusée/i);
    expect(screen.queryByText('Ton niveau de base')).toBeNull();
    expect(mockSaveApiKey).not.toHaveBeenCalled();
  });
});

describe("Onboarding — heure du rappel", () => {
  it('un champ vidé ne programme aucun rappel', async () => {
    // Le piège d'origine : `Number('')` vaut 0, donc un rappel à minuit là où
    // l'écran promet « aucun rappel ».
    await reachReminderStep('');

    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ reminderHour: null }),
    );
  });

  it('une heure valide est enregistrée', async () => {
    await reachReminderStep('7');
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ reminderHour: 7 }),
    );
  });

  it('une heure hors bornes ne programme aucun rappel', async () => {
    await reachReminderStep('99');
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ reminderHour: null }),
    );
  });

  it('la clé n’est enregistrée qu’à la toute fin', async () => {
    await reachReminderStep('7');
    expect(mockSaveApiKey).toHaveBeenCalledTimes(1);
  });
});
