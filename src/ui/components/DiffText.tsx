import { StyleSheet, Text, View } from 'react-native';
import type { DiffOp } from '../../core/diff';
import { useThemeContext } from '../ThemeProvider';

/**
 * Le diff est mot à mot : suppressions barrées, ajouts soulignés, le reste
 * inchangé. La ponctuation colle au mot qui la précède.
 */
export function DiffText({ ops }: { ops: DiffOp[] }) {
  const theme = useThemeContext();

  return (
    <View testID="diff-text" style={styles.row}>
      <Text style={[styles.line, { color: theme.colors.textMuted }]}>
        {ops.map((op, i) => (
          <Text key={i} style={styleFor(op.op, theme.colors)}>
            {i > 0 && !isPunctuation(op.text) ? ' ' : ''}
            {op.text}
          </Text>
        ))}
      </Text>
    </View>
  );
}

const isPunctuation = (text: string): boolean => /^[^\p{L}\p{N}]$/u.test(text);

function styleFor(op: DiffOp['op'], colors: { text: string; error: string; success: string }) {
  switch (op) {
    case 'del':
      return { color: colors.error, textDecorationLine: 'line-through' as const };
    case 'ins':
      return { color: colors.success, textDecorationLine: 'underline' as const };
    default:
      return { color: colors.text };
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  line: { fontSize: 16, lineHeight: 26 },
});
