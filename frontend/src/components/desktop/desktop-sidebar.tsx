import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import {
  desktopColors,
  desktopFont,
  desktopLayout,
} from '@/components/desktop/desktop-theme';

type DesktopNavHref =
  | '/'
  | '/transactions'
  | '/accounts'
  | '/categories'
  | '/recurrences';

type DesktopNavItem = {
  href: DesktopNavHref;
  label: string;
  icon: string;
};

const NAV_ITEMS: DesktopNavItem[] = [
  { href: '/', label: 'Dashboard', icon: '▦' },
  { href: '/transactions', label: 'Transações', icon: '⇄' },
  { href: '/accounts', label: 'Contas', icon: '▤' },
  { href: '/categories', label: 'Categorias', icon: '◈' },
  { href: '/recurrences', label: 'Assinaturas', icon: '↻' },
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

  return (
    <View
      style={[
        styles.sidebar,
        collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded,
      ]}
    >
      <View style={[styles.brand, collapsed && styles.brandCollapsed]}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>f</Text>
        </View>

        {!collapsed ? (
          <View style={styles.brandText}>
            <Text style={styles.brandName}>finora</Text>
            <Text style={styles.brandTagline}>Finanças pessoais</Text>
          </View>
        ) : null}
      </View>

      {!collapsed ? <Text style={styles.sectionLabel}>Menu</Text> : null}

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
                <Text
                  style={[
                    styles.navIconText,
                    active && styles.navIconTextActive,
                  ]}
                >
                  {item.icon}
                </Text>
              </View>

              {!collapsed ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.navLabel,
                    active && styles.navLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
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
          <Text style={styles.collapseLabel}>Recolher menu</Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    height: '100%',
    backgroundColor: desktopColors.surface,
    borderRightWidth: 1,
    borderRightColor: desktopColors.border,
    paddingVertical: 24,
    paddingHorizontal: 14,
    justifyContent: 'flex-start',
  },
  sidebarExpanded: {
    width: desktopLayout.sidebarWidth,
  },
  sidebarCollapsed: {
    width: desktopLayout.sidebarCollapsedWidth,
    paddingHorizontal: 10,
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
    fontWeight: '800',
    letterSpacing: -0.7,
    fontFamily: desktopFont,
  },
  brandTagline: {
    marginTop: 1,
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: desktopFont,
  },
  sectionLabel: {
    paddingHorizontal: 12,
    marginBottom: 8,
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
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
  navIconText: {
    color: desktopColors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  navIconTextActive: {
    color: desktopColors.primary,
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
