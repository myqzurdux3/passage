import { fireEvent, render, screen } from '@testing-library/react-native';
import { SentenceInput } from '../SentenceInput';

describe('SentenceInput', () => {
  it('affiche la phrase source et la position', async () => {
    await render(
      <SentenceInput position={3} total={5} sourceFr="Il pleut." value="" onChange={jest.fn()} />,
    );
    expect(screen.getByText('Il pleut.')).toBeOnTheScreen();
    expect(screen.getByText('3 / 5')).toBeOnTheScreen();
  });

  it('remonte la saisie', async () => {
    const onChange = jest.fn();
    await render(
      <SentenceInput position={1} total={5} sourceFr="Il pleut." value="" onChange={onChange} />,
    );
    await fireEvent.changeText(screen.getByLabelText('Traduction de la phrase 1'), "It's raining.");
    expect(onChange).toHaveBeenCalledWith("It's raining.");
  });
});
