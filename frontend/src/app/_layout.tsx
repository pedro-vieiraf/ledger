import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AccountsProvider } from '@/contexts/accounts-context';
import { TransactionsProvider } from '@/contexts/transactions-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <AccountsProvider>
        <TransactionsProvider>
          <AnimatedSplashOverlay />

          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </TransactionsProvider>
      </AccountsProvider>
    </ThemeProvider>
  );
}