import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />

      <NativeTabs
        backgroundColor={colors.background}
        indicatorColor={colors.backgroundElement}
        labelStyle={{
          selected: { color: colors.text },
        }}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="home" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="transactions">
          <NativeTabs.Trigger.Label>Transações</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="receipt_long" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="accounts">
          <NativeTabs.Trigger.Label>Contas</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="account_balance_wallet" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}