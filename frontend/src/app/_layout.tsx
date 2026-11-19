import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DesktopShell } from '@/components/desktop/desktop-shell';
import { AccountsProvider } from '@/contexts/accounts-context';
import { CreditCardsProvider } from '@/contexts/credit-cards-context';
import { FeedbackProvider } from '@/contexts/feedback-context';
import { PrivacyProvider } from '@/contexts/privacy-context';
import { RecurrencesProvider } from '@/contexts/recurrences-context';
import { TransactionsProvider } from '@/contexts/transactions-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIsDesktopLayout } from '@/hooks/use-is-desktop-layout';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDesktop = useIsDesktopLayout();

  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" />
    </Stack>
  );

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <PrivacyProvider>
        <FeedbackProvider>
          <AccountsProvider>
            <CreditCardsProvider>
              <TransactionsProvider>
                <RecurrencesProvider>
                  <AnimatedSplashOverlay />

                  {isDesktop ? (
                    <DesktopShell>{stack}</DesktopShell>
                  ) : (
                    stack
                  )}
                </RecurrencesProvider>
              </TransactionsProvider>
            </CreditCardsProvider>
          </AccountsProvider>
        </FeedbackProvider>
      </PrivacyProvider>
    </ThemeProvider>
  );
}
