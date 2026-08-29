import { render, screen } from '@testing-library/react-native';
import { DiffText } from '../DiffText';

describe('DiffText', () => {
  it('affiche les trois types de segments', async () => {
    await render(
      <DiffText
        ops={[
          { op: 'keep', text: 'I' },
          { op: 'del', text: 'goes' },
          { op: 'ins', text: 'go' },
        ]}
      />,
    );
    expect(screen.getByText('I')).toBeOnTheScreen();
    expect(screen.getByText('goes')).toBeOnTheScreen();
    expect(screen.getByText('go')).toBeOnTheScreen();
  });

  it('barre les suppressions et souligne les ajouts', async () => {
    await render(<DiffText ops={[{ op: 'del', text: 'goes' }, { op: 'ins', text: 'go' }]} />);
    expect(screen.getByText('goes')).toHaveStyle({ textDecorationLine: 'line-through' });
    expect(screen.getByText('go')).toHaveStyle({ textDecorationLine: 'underline' });
  });

  it('rend un diff vide sans planter', async () => {
    await render(<DiffText ops={[]} />);
    expect(screen.getByTestId('diff-text')).toBeOnTheScreen();
  });
});
