const mockUpdateSettings = jest.fn();
const mockSaveApiKey = jest.fn().mockResolvedValue(undefined);
const mockEraseEverything = jest.fn().mockResolvedValue(undefined);
const mockGenerateSeries = jest.fn().mockResolvedValue([]);
const mockAlert = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
jest.mock('../../src/ai/claude', () => ({
  makeAiClient: () => ({ generateSeries: mockGenerateSeries, correctSeries: jest.fn() }),
}));
jest.mock('../../src/ui/AppProvider', () => ({
  useApp: () => ({
    settings: { baseLevel: 'B1', theme: 'system', reminderHour: 19, reminderMinute: 0 },
    updateSettings: mockUpdateSettings,
    saveApiKey: mockSaveApiKey,
    eraseEverything: mockEraseEverything,
  }),
}));

import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../src/ui/__tests__/renderHarness';
import SettingsScreen from '../settings';

beforeEach(() => {
  mockUpdateSettings.mockClear();
  mockSaveApiKey.mockClear();
  mockEraseEverything.mockClear();
  mockGenerateSeries.mockClear().mockResolvedValue([]);
  mockAlert.mockClear();
  jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);
});

describe('Réglages — clé API', () => {
  it('éprouve la clé avant de l’enregistrer', async () => {
    // Le défaut d'origine : la clé était enregistrée sans vérification, et
    // l'erreur ne se découvrait que le lendemain.
    await renderScreen(<SettingsScreen />);

    await fireEvent.changeText(screen.getByLabelText('Nouvelle clé API'), 'sk-ant-neuve');
    await fireEvent.press(screen.getByText('Vérifier et remplacer la clé'));

    await waitFor(() => expect(mockGenerateSeries).toHaveBeenCalledTimes(1));
    expect(mockSaveApiKey).toHaveBeenCalledWith('sk-ant-neuve');
  });

  it('n’enregistre pas une clé refusée', async () => {
    const { AppError } = jest.requireActual('../../src/ai/errors');
    mockGenerateSeries.mockRejectedValue(new AppError('invalid_key'));
    await renderScreen(<SettingsScreen />);

    await fireEvent.changeText(screen.getByLabelText('Nouvelle clé API'), 'sk-ant-fausse');
    await fireEvent.press(screen.getByText('Vérifier et remplacer la clé'));

    await waitFor(() => expect(mockAlert).toHaveBeenCalled());
    expect(mockSaveApiKey).not.toHaveBeenCalled();
    expect(mockAlert.mock.calls[0][0]).toBe('Clé refusée');
  });
});

describe('Réglages — rappel', () => {
  it('un champ vidé supprime le rappel', async () => {
    await renderScreen(<SettingsScreen />);

    await fireEvent.changeText(screen.getByLabelText('Heure du rappel'), '');

    expect(mockUpdateSettings).toHaveBeenCalledWith({ reminderHour: null });
  });

  it('une heure valide est enregistrée à la frappe', async () => {
    await renderScreen(<SettingsScreen />);

    await fireEvent.changeText(screen.getByLabelText('Heure du rappel'), '8');

    expect(mockUpdateSettings).toHaveBeenCalledWith({ reminderHour: 8 });
  });
});

describe('Réglages — niveau et thème', () => {
  it('enregistre le niveau choisi', async () => {
    await renderScreen(<SettingsScreen />);
    await fireEvent.press(screen.getByText('C1 — autonome'));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ baseLevel: 'C1' });
  });

  it('enregistre le thème choisi', async () => {
    await renderScreen(<SettingsScreen />);
    await fireEvent.press(screen.getByText('Sombre'));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ theme: 'dark' });
  });
});

describe('Réglages — effacement', () => {
  it('demande confirmation avant d’effacer', async () => {
    await renderScreen(<SettingsScreen />);

    await fireEvent.press(screen.getByText('Tout effacer'));

    expect(mockAlert).toHaveBeenCalled();
    expect(mockEraseEverything).not.toHaveBeenCalled();
  });

  it('efface seulement quand la confirmation est acceptée', async () => {
    await renderScreen(<SettingsScreen />);
    await fireEvent.press(screen.getByText('Tout effacer'));

    const buttons = mockAlert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === 'Tout effacer')?.onPress?.();

    expect(mockEraseEverything).toHaveBeenCalledTimes(1);
  });
});
