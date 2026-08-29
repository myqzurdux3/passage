jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(cb, [cb]);
  },
}));

import { AppState, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { useRefreshOnFocus } from '../useRefreshOnFocus';

type Listener = (state: string) => void;
let listeners: Listener[] = [];

function Probe({ refresh, beforeLeave }: { refresh: () => void; beforeLeave?: () => void }) {
  useRefreshOnFocus(refresh, { beforeLeave });
  return <Text>sonde</Text>;
}

beforeEach(() => {
  listeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: Listener) => {
    listeners.push(cb);
    return { remove: jest.fn() };
  }) as never);
});

afterEach(() => jest.restoreAllMocks());

describe('useRefreshOnFocus', () => {
  it('rafraîchit au montage', async () => {
    const refresh = jest.fn();
    await render(<Probe refresh={refresh} />);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('rafraîchit au retour au premier plan', async () => {
    const refresh = jest.fn();
    await render(<Probe refresh={refresh} />);
    refresh.mockClear();

    listeners.forEach((l) => l('active'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('ne rafraîchit pas au passage en arrière-plan', async () => {
    const refresh = jest.fn();
    await render(<Probe refresh={refresh} />);
    refresh.mockClear();

    listeners.forEach((l) => l('background'));

    expect(refresh).not.toHaveBeenCalled();
  });

  it('vide les écritures en attente avant de relire', async () => {
    // Sans cet ordre, la relecture écraserait une frappe non encore enregistrée.
    const order: string[] = [];
    const refresh = jest.fn(() => order.push('refresh'));
    const beforeLeave = jest.fn(() => order.push('flush'));

    await render(<Probe refresh={refresh} beforeLeave={beforeLeave} />);
    order.length = 0;

    listeners.forEach((l) => l('active'));

    expect(order).toEqual(['flush', 'refresh']);
  });

  it('vide aussi au passage en arrière-plan', async () => {
    const beforeLeave = jest.fn();
    await render(<Probe refresh={jest.fn()} beforeLeave={beforeLeave} />);
    beforeLeave.mockClear();

    listeners.forEach((l) => l('background'));

    expect(beforeLeave).toHaveBeenCalledTimes(1);
  });
});
