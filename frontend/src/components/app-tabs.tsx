import { usePathname } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  isActiveMobileNavPath,
  MOBILE_NAV_ITEMS,
} from '@/constants/mobile-navigation';
import {
  mobileColors,
  mobileFont,
  mobileRadius,
  mobileTouchTarget,
  mobileTypography,
} from '@/constants/mobile-theme';

export default function AppTabs() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />

      <TabList
        style={[
          styles.tabBar,
          { paddingBottom: Math.max(insets.bottom, 6) },
        ]}
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = isActiveMobileNavPath(pathname, item.href);

          return (
            <TabTrigger
              key={item.route}
              name={item.route}
              href={item.href}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              aria-selected={active}
              style={({ pressed }) => [
                styles.trigger,
                pressed && styles.triggerPressed,
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  active && styles.iconContainerActive,
                ]}
              >
                <SymbolView
                  name={item.icon}
                  size={20}
                  tintColor={
                    active ? mobileColors.primary : mobileColors.textMuted
                  }
                />
              </View>

              <Text
                numberOfLines={1}
                style={[styles.label, active && styles.labelActive]}
              >
                {item.label}
              </Text>
            </TabTrigger>
          );
        })}
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: mobileColors.background,
  },
  slot: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: 6,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: mobileColors.border,
    backgroundColor: mobileColors.surface,
  },
  trigger: {
    flex: 1,
    minWidth: 0,
    minHeight: mobileTouchTarget + 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
    paddingVertical: 4,
    borderRadius: mobileRadius.medium,
  },
  triggerPressed: {
    opacity: 0.65,
  },
  iconContainer: {
    width: 34,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: mobileRadius.pill,
  },
  iconContainerActive: {
    backgroundColor: mobileColors.primarySoft,
  },
  label: {
    ...mobileTypography.tabLabel,
    lineHeight: 13,
    maxWidth: '100%',
    textAlign: 'center',
    color: mobileColors.textSecondary,
    fontFamily: mobileFont,
  },
  labelActive: {
    fontWeight: '700',
    color: mobileColors.primary,
  },
});
