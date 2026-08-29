import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BASE_LEVELS, LEVEL_LABELS_FR } from '../src/core/levels';
import { useApp } from '../src/ui/AppProvider';
import { Button } from '../src/ui/components/Button';
import { Card } from '../src/ui/components/Card';
import { Screen } from '../src/ui/components/Screen';
import { useThemeContext } from '../src/ui/ThemeProvider';
import type { ThemePreference } from '../src/ui/theme';

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Système',
  light: 'Clair',
  dark: 'Sombre',
};

export default function SettingsScreen() {
  const theme = useThemeContext();
  const router = useRouter();
  const { settings, updateSettings, saveApiKey, eraseEverything } = useApp();

  const [newKey, setNewKey] = useState('');
  const [hour, setHour] = useState(
    settings.reminderHour === null ? '' : String(settings.reminderHour),
  );

  const replaceKey = async () => {
    if (newKey.trim().length === 0) return;
    await saveApiKey(newKey);
    setNewKey('');
    Alert.alert('Clé remplacée', 'La nouvelle clé est enregistrée.');
  };

  const confirmErase = () => {
    Alert.alert(
      'Tout effacer',
      'Séries, corrections, historique et clé API seront supprimés définitivement. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout effacer',
          style: 'destructive',
          onPress: () => {
            void eraseEverything();
          },
        },
      ],
    );
  };

  return (
    <Screen
      title="Réglages"
      footer={<Button label="Retour" variant="secondary" onPress={() => router.replace('/')} />}
    >
      <Card>
        <Text style={[theme.type.heading, { color: theme.colors.text }]}>Niveau de base</Text>
        <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
          Plancher de référence. L’adaptatif ne dévie que d’un cran.
        </Text>
        {BASE_LEVELS.map((candidate) => (
          <Pressable
            key={candidate}
            accessibilityRole="radio"
            accessibilityState={{ selected: settings.baseLevel === candidate }}
            onPress={() => updateSettings({ baseLevel: candidate })}
            style={optionStyle(settings.baseLevel === candidate, theme)}
          >
            <Text
              style={[
                theme.type.body,
                {
                  color:
                    settings.baseLevel === candidate ? theme.colors.accent : theme.colors.text,
                },
              ]}
            >
              {LEVEL_LABELS_FR[candidate]}
            </Text>
          </Pressable>
        ))}
      </Card>

      <Card>
        <Text style={[theme.type.heading, { color: theme.colors.text }]}>Apparence</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {(['system', 'light', 'dark'] as const).map((candidate) => (
            <Pressable
              key={candidate}
              accessibilityRole="radio"
              accessibilityState={{ selected: settings.theme === candidate }}
              onPress={() => updateSettings({ theme: candidate })}
              style={[optionStyle(settings.theme === candidate, theme), { flex: 1 }]}
            >
              <Text
                style={[
                  theme.type.label,
                  {
                    textAlign: 'center',
                    color: settings.theme === candidate ? theme.colors.accent : theme.colors.text,
                  },
                ]}
              >
                {THEME_LABELS[candidate]}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[theme.type.heading, { color: theme.colors.text }]}>Rappel quotidien</Text>
        <TextInput
          accessibilityLabel="Heure du rappel"
          placeholder="Aucun rappel"
          placeholderTextColor={theme.colors.textMuted}
          value={hour}
          onChangeText={setHour}
          onEndEditing={() => {
            const parsed = Number(hour);
            updateSettings({
              reminderHour:
                hour.trim() === '' || !Number.isFinite(parsed) || parsed < 0 || parsed > 23
                  ? null
                  : parsed,
            });
          }}
          keyboardType="number-pad"
          maxLength={2}
          style={inputStyle(theme)}
        />
      </Card>

      <Card>
        <Text style={[theme.type.heading, { color: theme.colors.text }]}>Clé API</Text>
        <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
          Enregistrée dans le coffre-fort du téléphone. Elle n’est jamais affichée.
        </Text>
        <TextInput
          accessibilityLabel="Nouvelle clé API"
          placeholder="Remplacer par une nouvelle clé"
          placeholderTextColor={theme.colors.textMuted}
          value={newKey}
          onChangeText={setNewKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={inputStyle(theme)}
        />
        <Button
          label="Remplacer la clé"
          variant="secondary"
          onPress={replaceKey}
          disabled={newKey.trim().length === 0}
        />
      </Card>

      <Card>
        <Text style={[theme.type.heading, { color: theme.colors.error }]}>Zone dangereuse</Text>
        <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
          Efface les séries, les corrections, l’historique et la clé API. Irréversible.
        </Text>
        <Button label="Tout effacer" variant="secondary" onPress={confirmErase} />
      </Card>
    </Screen>
  );
}

function optionStyle(selected: boolean, theme: ReturnType<typeof useThemeContext>) {
  return {
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: selected ? theme.colors.accent : theme.colors.border,
    backgroundColor: selected ? theme.colors.accentSoft : 'transparent',
  };
}

function inputStyle(theme: ReturnType<typeof useThemeContext>) {
  return {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    paddingHorizontal: 12,
    fontSize: 16,
  };
}
