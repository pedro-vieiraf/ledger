import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import {
  desktopColors,
  desktopFont,
  desktopLayout,
} from '@/components/desktop/desktop-theme';

type DesktopNavHref =
  | '/'
  | '/transactions'
  | '/accounts'
  | '/credit-cards'
  | '/categories'
  | '/recurrences';

type DesktopNavItem = {
  href: DesktopNavHref;
  label: string;
  icon: SymbolViewProps['name'];
};

const NAV_ITEMS: DesktopNavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: { ios: 'square.grid.2x2', android: 'dashboard', web: 'dashboard' },
  },
  {
    href: '/transactions',
    label: 'Transações',
    icon: {
      ios: 'arrow.left.arrow.right',
      android: 'swap_horiz',
      web: 'swap_horiz',
    },
  },
  {
    href: '/accounts',
    label: 'Contas',
    icon: {
      ios: 'building.columns',
      android: 'account_balance',
      web: 'account_balance',
    },
  },
  {
    href: '/credit-cards',
    label: 'Cartões',
    icon: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
  },
  {
    href: '/categories',
    label: 'Categorias',
    icon: { ios: 'tag', android: 'label', web: 'label' },
  },
  {
    href: '/recurrences',
    label: 'Assinaturas',
    icon: {
      ios: 'arrow.triangle.2.circlepath',
      android: 'autorenew',
      web: 'autorenew',
    },
  },
];

type DesktopSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

function isActivePath(pathname: string, href: DesktopNavHref) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopSidebar({
  collapsed,
  onToggle,
}: DesktopSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  // Animated.Value é mutável por natureza; o ref mantém a mesma instância
  // durante toda a vida do componente sem disparar novas renderizações.
  // eslint-disable-next-line react-hooks/refs
  const expansion = useRef(new Animated.Value(collapsed ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(expansion, {
      toValue: collapsed ? 0 : 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [collapsed, expansion]);

  // eslint-disable-next-line react-hooks/refs
  const sidebarWidth = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [
      desktopLayout.sidebarCollapsedWidth,
      desktopLayout.sidebarWidth,
    ],
  });

  // eslint-disable-next-line react-hooks/refs
  const horizontalPadding = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 14],
  });

  // Os rótulos só aparecem quando a sidebar já tem largura suficiente para
  // exibi-los. Assim o texto não é espremido durante a expansão.
  // eslint-disable-next-line react-hooks/refs
  const labelsOpacity = expansion.interpolate({
    inputRange: [0, 0.82, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.sidebar,
        { width: sidebarWidth, paddingHorizontal: horizontalPadding },
      ]}
    >
      <View style={[styles.brand, collapsed && styles.brandCollapsed]}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>f</Text>
        </View>

        {!collapsed ? (
          <Animated.View
            style={[styles.brandText, { opacity: labelsOpacity }]}
          >
            <Text numberOfLines={1} style={styles.brandName}>
              finora
            </Text>
            <Text numberOfLines={1} style={styles.brandTagline}>
              Finanças pessoais
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.navigation}>
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Pressable
              key={item.href}
              accessibilityRole="link"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              onPress={() => router.navigate(item.href)}
              style={({ pressed }) => [
                styles.navItem,
                collapsed && styles.navItemCollapsed,
                active && styles.navItemActive,
                pressed && styles.navItemPressed,
              ]}
            >
              <View
                style={[
                  styles.navIcon,
                  active && styles.navIconActive,
                ]}
              >
                <SymbolView
                  name={item.icon}
                  size={17}
                  tintColor={
                    active
                      ? desktopColors.primary
                      : desktopColors.textSecondary
                  }
                />
              </View>

              {!collapsed ? (
                <Animated.Text
                  numberOfLines={1}
                  style={[
                    styles.navLabel,
                    active && styles.navLabelActive,
                    { opacity: labelsOpacity },
                  ]}
                >
                  {item.label}
                </Animated.Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.spacer} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'
        }
        onPress={onToggle}
        style={({ pressed }) => [
          styles.collapseButton,
          collapsed && styles.collapseButtonCollapsed,
          pressed && styles.collapseButtonPressed,
        ]}
      >
        <Text style={styles.collapseIcon}>{collapsed ? '›' : '‹'}</Text>
        {!collapsed ? (
          <Animated.Text
            numberOfLines={1}
            style={[styles.collapseLabel, { opacity: labelsOpacity }]}
          >
            Recolher menu
          </Animated.Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    height: '100%',
    overflow: 'hidden',
    backgroundColor: desktopColors.surface,
    borderRightWidth: 1,
    borderRightColor: desktopColors.border,
    paddingVertical: 24,
    justifyContent: 'flex-start',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    marginBottom: 30,
  },
  brandCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primary,
  },
  brandMarkText: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 27,
    fontFamily: desktopFont,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  brandName: {
    color: desktopColors.primary,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '800',
    letterSpacing: -0.7,
    fontFamily: desktopFont,
  },
  brandTagline: {
    marginTop: 1,
    color: desktopColors.textMuted,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: desktopFont,
  },
  navigation: {
    gap: 4,
  },
  navItem: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 10,
    borderRadius: 11,
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  navItemActive: {
    backgroundColor: desktopColors.primarySoft,
  },
  navItemPressed: {
    opacity: 0.72,
  },
  navIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: {
    backgroundColor: desktopColors.surface,
  },
  navLabel: {
    flex: 1,
    minWidth: 0,
    color: desktopColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  navLabelActive: {
    color: desktopColors.primary,
    fontWeight: '700',
  },
  spacer: {
    flex: 1,
  },
  collapseButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: desktopColors.surfaceMuted,
  },
  collapseButtonCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  collapseButtonPressed: {
    backgroundColor: desktopColors.primarySoft,
  },
  collapseIcon: {
    color: desktopColors.primary,
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  collapseLabel: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
});
