import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  useFonts,
} from '@expo-google-fonts/fraunces';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
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

function Themed() {
  const { ready, settings } = useApp();
  const [fontsLoaded] = useFonts({ Fraunces_400Regular, Fraunces_600SemiBold });

  useEffect(() => {
    if (ready && fontsLoaded) void SplashScreen.hideAsync();
  }, [ready, fontsLoaded]);

  if (!ready || !fontsLoaded) return null;

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
