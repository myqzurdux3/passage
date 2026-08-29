import Svg, { Circle, Path } from 'react-native-svg';
import { useThemeContext } from './ThemeProvider';

/**
 * Une arche, et un point qui la franchit — le nom rendu littéral.
 * Le point est cerné de la couleur du fond : il perce le montant droit
 * plutôt que de se poser dessus.
 */
export function Logo({
  size = 64,
  color,
  background,
}: {
  size?: number;
  color?: string;
  background?: string;
}) {
  const theme = useThemeContext();
  const stroke = color ?? theme.colors.accent;
  const behind = background ?? theme.colors.background;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Logo de Passage">
      <Path
        d="M16 56 L16 32 A16 16 0 0 1 48 32 L48 56"
        stroke={stroke}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={48} cy={44} r={9} fill={behind} />
      <Circle cx={48} cy={44} r={5} fill={stroke} />
    </Svg>
  );
}
