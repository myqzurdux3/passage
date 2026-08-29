const mockReadApiKey = jest.fn();
const mockWriteApiKey = jest.fn().mockResolvedValue(undefined);
const mockClearApiKey = jest.fn().mockResolvedValue(undefined);
const mockWipeLocalData = jest.fn();
const mockRetry = jest.fn().mockResolvedValue(null);
const mockSchedule = jest.fn().mockResolvedValue(true);
const mockCancel = jest.fn().mockResolvedValue(undefined);

// Les fabriques sont remontées au-dessus des imports : elles doivent appeler
// les doublures au moment de l'appel, pas les lire à la construction — sans
// quoi elles capturent des constantes encore non initialisées.
jest.mock('../../usecases/container', () => ({
  readApiKey: (...a: unknown[]) => mockReadApiKey(...a),
  writeApiKey: (...a: unknown[]) => mockWriteApiKey(...a),
  clearApiKey: (...a: unknown[]) => mockClearApiKey(...a),
  wipeLocalData: (...a: unknown[]) => mockWipeLocalData(...a),
  getDb: () => mockDb,
  makeDepsWithKey: () => ({ marker: 'deps' }),
}));
jest.mock('../../usecases/retryPendingCorrection', () => ({
  retryPendingCorrection: (...a: unknown[]) => mockRetry(...a),
}));
jest.mock('../../usecases/reminders', () => ({
  scheduleDailyReminder: (...a: unknown[]) => mockSchedule(...a),
  cancelDailyReminder: (...a: unknown[]) => mockCancel(...a),
}));

import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import type { Db } from '../../data/db';
import { migrate } from '../../data/migrations';
import { AppProvider, useApp } from '../AppProvider';

let mockDb: Db;

function makeDb(): Db {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  return {
    exec: (sql) => raw.exec(sql),
    all: <T,>(sql: string, params: unknown[] = []) =>
      raw.prepare(sql).all(...(params as never[])) as T[],
    run: (sql, params = []) => {
      raw.prepare(sql).run(...(params as never[]));
    },
    transaction: <T,>(fn: () => T): T => fn(),
  };
}

function Probe() {
  const { ready, bootError, deps, settings } = useApp();
  return (
    <Text>
      {`ready=${ready} error=${bootError ?? 'aucune'} deps=${deps ? 'oui' : 'non'} niveau=${settings.baseLevel}`}
    </Text>
  );
}

const renderProvider = () =>
  render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  );

beforeEach(() => {
  mockDb = makeDb();
  migrate(mockDb);
  mockReadApiKey.mockReset().mockResolvedValue(null);
  mockRetry.mockClear();
  mockSchedule.mockClear();
  mockCancel.mockClear();
});

describe('AppProvider — amorçage', () => {
  it('devient prêt sans clé enregistrée', async () => {
    await renderProvider();
    await waitFor(() => expect(screen.getByText(/ready=true/)).toBeOnTheScreen());
    expect(screen.getByText(/deps=non/)).toBeOnTheScreen();
  });

  it('construit les dépendances quand une clé existe', async () => {
    mockReadApiKey.mockResolvedValue('sk-ant-x');
    await renderProvider();
    await waitFor(() => expect(screen.getByText(/deps=oui/)).toBeOnTheScreen());
  });

  it('devient prêt et signale l’erreur au lieu de rester figé', async () => {
    // Le bug d'origine : une exception ici laissait `ready` à false pour
    // toujours, donc un écran de démarrage sans issue.
    mockReadApiKey.mockRejectedValue(new Error('coffre-fort verrouillé'));

    await renderProvider();

    await waitFor(() => expect(screen.getByText(/ready=true/)).toBeOnTheScreen());
    expect(screen.getByText(/coffre-fort verrouillé/)).toBeOnTheScreen();
  });

  it('relit les réglages enregistrés', async () => {
    mockDb.run("INSERT INTO settings (key, value) VALUES ('base_level', 'C1')");
    await renderProvider();
    await waitFor(() => expect(screen.getByText(/niveau=C1/)).toBeOnTheScreen());
  });
});

describe('AppProvider — reprise et rappel', () => {
  it('reprend les corrections en plan dès que les dépendances existent', async () => {
    mockReadApiKey.mockResolvedValue('sk-ant-x');
    await renderProvider();
    await waitFor(() => expect(mockRetry).toHaveBeenCalledTimes(1));
  });

  it('ne tente aucune reprise sans clé', async () => {
    await renderProvider();
    await waitFor(() => expect(screen.getByText(/ready=true/)).toBeOnTheScreen());
    expect(mockRetry).not.toHaveBeenCalled();
  });

  it('annule le rappel quand aucune heure n’est réglée', async () => {
    await renderProvider();
    await waitFor(() => expect(mockCancel).toHaveBeenCalled());
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('planifie le rappel à l’heure enregistrée', async () => {
    mockDb.run("INSERT INTO settings (key, value) VALUES ('reminder_hour', '7')");
    await renderProvider();
    await waitFor(() => expect(mockSchedule).toHaveBeenCalledWith(7, 0));
  });
});
