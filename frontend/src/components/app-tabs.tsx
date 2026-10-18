import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
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
  );
}