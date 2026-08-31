import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { renderScreen } from '../../__tests__/renderHarness';
import { Screen } from '../Screen';

describe('Screen', () => {
  it('affiche titre, sous-titre, corps et pied de page', async () => {
    await renderScreen(
      <Screen title="Aujourd’hui" subtitle="Cinq phrases" footer={<Text>Corriger</Text>}>
        <Text>Une phrase</Text>
      </Screen>,
    );
    expect(screen.getByText('Aujourd’hui')).toBeOnTheScreen();
    expect(screen.getByText('Cinq phrases')).toBeOnTheScreen();
    expect(screen.getByText('Une phrase')).toBeOnTheScreen();
    expect(screen.getByText('Corriger')).toBeOnTheScreen();
  });
});
