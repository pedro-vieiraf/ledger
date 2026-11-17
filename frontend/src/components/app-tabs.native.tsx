import { NativeTabs } from 'expo-router/native-tabs';

import { MOBILE_NAV_ITEMS } from '@/constants/mobile-navigation';
import {
  mobileColors,
  mobileFont,
  mobileTypography,
} from '@/constants/mobile-theme';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={mobileColors.surface}
      tintColor={mobileColors.primary}
      iconColor={{
        default: mobileColors.textMuted,
        selected: mobileColors.primary,
      }}
      labelStyle={{
        default: {
          ...mobileTypography.tabLabel,
          color: mobileColors.textSecondary,
          fontFamily: mobileFont,
        },
        selected: {
          ...mobileTypography.tabLabel,
          color: mobileColors.primary,
          fontWeight: '700',
          fontFamily: mobileFont,
        },
      }}
      indicatorColor={mobileColors.primarySoft}
      rippleColor={mobileColors.primarySoft}
      labelVisibilityMode="labeled"
    >
      {MOBILE_NAV_ITEMS.map((item) => (
        <NativeTabs.Trigger key={item.route} name={item.route}>
          <NativeTabs.Trigger.Label>{item.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={item.sf} md={item.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
