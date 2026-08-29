import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { useThemeContext } from '../ThemeProvider';

/**
 * Champ de saisie de l'application. Existe pour que les trois écrans qui en
 * posent un n'aient pas chacun leur propre feuille de style : ils avaient déjà
 * divergé sur la couleur de bordure.
 */
export function TextField({ multiline, style, ...props }: TextInputProps) {
  const theme = useThemeContext();

  return (
    <TextInput
      placeholderTextColor={theme.colors.textMuted}
      multiline={multiline}
      style={[
        styles.field,
        multiline ? styles.multiline : styles.single,
        {
          color: theme.colors.text,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.background,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  single: { minHeight: 48 },
  multiline: { minHeight: 76, paddingVertical: 10, lineHeight: 22, textAlignVertical: 'top' },
});
