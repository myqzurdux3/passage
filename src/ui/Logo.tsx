import Svg, { Circle, Path } from 'react-native-svg';
import { useThemeContext } from './ThemeProvider';

/**
 * Une arche et, dans son ouverture, un point : une porte qu'on franchit —
 * le nom rendu littéral. Symétrique, donc encore lisible en pastille de 24 px.
 *
 * Le tracé est le même que celui de `tools/logo.mjs`, qui produit les icônes ;
 * un test compare les deux pour qu'ils ne divergent pas.
 */
export function Logo({ size = 64 }: { size?: number }) {
  const theme = useThemeContext();
  const stroke = theme.colors.accent;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Logo de Passage">
      <Path
        d="M16 56 L16 32 A16 16 0 0 1 48 32 L48 56"
        stroke={stroke}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={32} cy={42} r={5} fill={stroke} />
    </Svg>
  );
}
