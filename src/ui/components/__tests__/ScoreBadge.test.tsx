import { render, screen } from '@testing-library/react-native';
import { ScoreBadge } from '../ScoreBadge';

describe('ScoreBadge', () => {
  it('affiche la note sur dix', async () => {
    await render(<ScoreBadge score={7} />);
    expect(screen.getByText('7/10')).toBeOnTheScreen();
  });

  it('porte un libellé accessible explicite', async () => {
    await render(<ScoreBadge score={7} />);
    expect(screen.getByLabelText('Note : 7 sur 10')).toBeOnTheScreen();
  });

  it('affiche un tiret quand la note est absente', async () => {
    await render(<ScoreBadge score={null} />);
    expect(screen.getByText('—')).toBeOnTheScreen();
  });
});
