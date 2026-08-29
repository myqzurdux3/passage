import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  useFonts,
} from '@expo-google-fonts/fraunces';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../src/ui/AppProvider';
import { ThemeProvider, useThemeContext } from '../src/ui/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

/** Sans clé API, tout mène à l'amorçage ; avec une clé, on n'y reste pas. */
function BootGuard() {
  const { ready, deps } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;

    const onOnboarding = segments[0] === 'onboarding';
    if (!deps && !onOnboarding) router.replace('/onboarding');
    else if (deps && onOnboarding) router.replace('/');
  }, [ready, deps, segments, router]);

  return null;
}

function Navigation() {
  const theme = useThemeContext();

  return (
    <>
      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'fade',
        }}
      />
    </>
  );
}

function BootFailure({ message }: { message: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#FBF9F4' }}>
      <Text style={{ fontSize: 20, fontWeight: '600', color: '#1A1815' }}>
        Passage n’a pas pu démarrer
      </Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: '#6B6459' }}>{message}</Text>
      <Text style={{ fontSize: 13, lineHeight: 20, color: '#6B6459' }}>
        Relance l’application. Si le problème persiste, réinstalle-la : les données locales sont
        probablement illisibles.
      </Text>
    </View>
  );
}

function Themed() {
  const { ready, bootError, settings } = useApp();
  const [fontsLoaded] = useFonts({ Fraunces_400Regular, Fraunces_600SemiBold });

  useEffect(() => {
    if (ready && fontsLoaded) void SplashScreen.hideAsync();
  }, [ready, fontsLoaded]);

  if (!ready || !fontsLoaded) return null;
  if (bootError) return <BootFailure message={bootError} />;

  return (
    <ThemeProvider preference={settings.theme}>
      <BootGuard />
      <Navigation />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Themed />
      </AppProvider>
    </SafeAreaProvider>
  );
}
