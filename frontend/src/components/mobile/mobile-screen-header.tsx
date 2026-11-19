import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  mobileColors,
  mobileFont,
  mobileRadius,
  mobileShadows,
  mobileSpacing,
  mobileTouchTarget,
  mobileTypography,
} from '@/constants/mobile-theme';

const DEFAULT_PRIMARY_ICON = {
  ios: 'plus',
  android: 'add',
  web: 'add',
} satisfies SymbolViewProps['name'];

const MENU_ICON = {
  ios: 'ellipsis',
  android: 'more_horiz',
  web: 'more_horiz',
} satisfies SymbolViewProps['name'];

const CLOSE_ICON = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
} satisfies SymbolViewProps['name'];

const ABOUT_ICON = {
  ios: 'info.circle',
  android: 'info',
  web: 'info',
} satisfies SymbolViewProps['name'];

const SETTINGS_ICON = {
  ios: 'gearshape',
  android: 'settings',
  web: 'settings',
} satisfies SymbolViewProps['name'];

const CHEVRON_ICON = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
} satisfies SymbolViewProps['name'];

const CARD_ICON = {
  ios: 'creditcard',
  android: 'credit_card',
  web: 'credit_card',
} satisfies SymbolViewProps['name'];

const MENU_ITEMS: {
  key: string;
  label: string;
  href: Href;
  icon: SymbolViewProps['name'];
}[] = [
  {
    key: 'credit-cards',
    label: 'Cartões',
    href: '/credit-cards',
    icon: CARD_ICON,
  },
  {
    key: 'about',
    label: 'Sobre a Finora',
    href: '/about',
    icon: ABOUT_ICON,
  },
  {
    key: 'settings',
    label: 'Configurações',
    href: '/settings',
    icon: SETTINGS_ICON,
  },
];

export type MobileHeaderAction = {
  accessibilityLabel: string;
  onPress: () => void;
  icon?: SymbolViewProps['name'];
  disabled?: boolean;
};

type MobileScreenHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  primaryAction?: MobileHeaderAction;
  secondaryActions?: MobileHeaderAction[];
  showMenu?: boolean;
  loading?: boolean;
};

export function MobileScreenHeader({
  title,
  eyebrow,
  subtitle,
  primaryAction,
  secondaryActions,
  showMenu = true,
  loading = false,
}: MobileScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function openMenu() {
    setMenuOpen(true);
  }

  function navigateTo(href: Href) {
    closeMenu();
    router.navigate(href);
  }

  return (
    <>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {eyebrow ? (
            <Text style={styles.eyebrow} numberOfLines={1}>
              {eyebrow}
            </Text>
          ) : null}

          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={3}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {loading ||
        primaryAction ||
        (secondaryActions && secondaryActions.length > 0) ||
        showMenu ? (
          <View style={styles.actions}>
            {loading ? (
              <View
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel="Atualizando"
                style={styles.loadingIndicator}
              >
                <ActivityIndicator size="small" color={mobileColors.primary} />
              </View>
            ) : null}

            {secondaryActions?.map((action, index) => (
              <Pressable
                key={`${action.accessibilityLabel}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={action.accessibilityLabel}
                accessibilityState={{ disabled: action.disabled ?? false }}
                disabled={action.disabled}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.secondaryButton,
                  pressed && styles.actionPressed,
                  action.disabled && styles.actionDisabled,
                ]}
              >
                <SymbolView
                  name={action.icon ?? DEFAULT_PRIMARY_ICON}
                  size={20}
                  tintColor={mobileColors.textSecondary}
                />
              </Pressable>
            ))}

            {primaryAction ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={primaryAction.accessibilityLabel}
                accessibilityState={{
                  disabled: primaryAction.disabled ?? false,
                }}
                disabled={primaryAction.disabled}
                onPress={primaryAction.onPress}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.primaryButton,
                  pressed && styles.actionPressed,
                  primaryAction.disabled && styles.actionDisabled,
                ]}
              >
                <SymbolView
                  name={primaryAction.icon ?? DEFAULT_PRIMARY_ICON}
                  size={22}
                  tintColor="#FFFFFF"
                />
              </Pressable>
            ) : null}

            {showMenu ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir menu de opções"
                accessibilityState={{ expanded: menuOpen }}
                aria-expanded={menuOpen}
                onPress={openMenu}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.menuButton,
                  menuOpen && styles.menuButtonOpen,
                  pressed && styles.actionPressed,
                ]}
              >
                <SymbolView
                  name={MENU_ICON}
                  size={22}
                  tintColor={
                    menuOpen
                      ? mobileColors.primary
                      : mobileColors.textSecondary
                  }
                />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <Modal
        transparent
        visible={menuOpen}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable
          accessible={false}
          onPress={closeMenu}
          style={styles.backdrop}
        >
          <Pressable
            accessibilityViewIsModal
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + mobileSpacing.sm },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Opções</Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar menu de opções"
                onPress={closeMenu}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.actionPressed,
                ]}
              >
                <SymbolView
                  name={CLOSE_ICON}
                  size={18}
                  tintColor={mobileColors.textSecondary}
                />
              </Pressable>
            </View>

            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => navigateTo(item.href)}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <View style={styles.menuItemIcon}>
                  <SymbolView
                    name={item.icon}
                    size={20}
                    tintColor={mobileColors.primary}
                  />
                </View>

                <Text style={styles.menuItemLabel}>{item.label}</Text>

                <SymbolView
                  name={CHEVRON_ICON}
                  size={14}
                  tintColor={mobileColors.textMuted}
                />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: mobileSpacing.sm,
    marginBottom: mobileSpacing.md,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    ...mobileTypography.eyebrow,
    marginBottom: 6,
    color: mobileColors.primary,
    fontFamily: mobileFont,
  },
  title: {
    ...mobileTypography.title,
    color: mobileColors.text,
    fontFamily: mobileFont,
  },
  subtitle: {
    ...mobileTypography.subtitle,
    marginTop: 4,
    color: mobileColors.textSecondary,
    fontFamily: mobileFont,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileSpacing.xs,
  },
  actionButton: {
    width: mobileTouchTarget,
    height: mobileTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: mobileRadius.medium,
  },
  primaryButton: {
    backgroundColor: mobileColors.primary,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: mobileColors.border,
    backgroundColor: mobileColors.surface,
  },
  menuButton: {
    backgroundColor: 'transparent',
  },
  menuButtonOpen: {
    backgroundColor: mobileColors.primarySoft,
  },
  actionPressed: {
    opacity: 0.72,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  loadingIndicator: {
    width: mobileTouchTarget,
    height: mobileTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: mobileColors.overlay,
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingTop: mobileSpacing.xs,
    paddingHorizontal: mobileSpacing.md,
    borderTopLeftRadius: mobileRadius.xl,
    borderTopRightRadius: mobileRadius.xl,
    backgroundColor: mobileColors.surface,
    ...mobileShadows.sheet,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: mobileRadius.pill,
    backgroundColor: mobileColors.borderStrong,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: mobileSpacing.xs,
    marginBottom: mobileSpacing.xs,
  },
  sheetTitle: {
    color: mobileColors.text,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: mobileFont,
  },
  closeButton: {
    width: mobileTouchTarget,
    height: mobileTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: mobileRadius.medium,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileSpacing.xs,
    minHeight: mobileTouchTarget + 8,
    paddingHorizontal: 4,
    borderRadius: mobileRadius.medium,
  },
  menuItemPressed: {
    backgroundColor: mobileColors.surfaceMuted,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: mobileRadius.small,
    backgroundColor: mobileColors.primarySoft,
  },
  menuItemLabel: {
    ...mobileTypography.menuLabel,
    flex: 1,
    minWidth: 0,
    color: mobileColors.text,
    fontFamily: mobileFont,
  },
});
