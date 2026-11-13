import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import {
  formatCurrency,
  getDefaultTransactionDescription,
} from '@/components/desktop/desktop-format';
import { useAccounts } from '@/contexts/accounts-context';
import { usePrivacy } from '@/contexts/privacy-context';
import { useRecurrences } from '@/contexts/recurrences-context';
import { useTransactions } from '@/contexts/transactions-context';
import { getCategories, type Category } from '@/services/categories-api';
import { formatIsoDate, toIsoDate } from '@/utils/date-time';
import { maskMoney } from '@/utils/privacy';

type TopbarPanel = 'notifications' | 'settings' | null;

type SearchTransaction = {
  id: string;
  title: string;
  meta: string;
};

type SearchAccount = {
  id: string;
  title: string;
  meta: string;
};

type SearchCategory = {
  id: string;
  title: string;
};

type SearchResults = {
  transactions: SearchTransaction[];
  accounts: SearchAccount[];
  categories: SearchCategory[];
};

const EMPTY_RESULTS: SearchResults = {
  transactions: [],
  accounts: [],
  categories: [],
};

const SETTINGS_ICON = {
  ios: 'gearshape',
  android: 'settings',
  web: 'settings',
} as const;

const PRIVACY_ICON = {
  ios: 'eye',
  android: 'visibility',
  web: 'visibility',
} as const;

const PRIVACY_HIDDEN_ICON = {
  ios: 'eye.slash',
  android: 'visibility_off',
  web: 'visibility_off',
} as const;

const ABOUT_ICON = {
  ios: 'info.circle',
  android: 'info',
  web: 'info',
} as const;

const CHEVRON_RIGHT_ICON = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
} as const;

type SettingsMenuItem = {
  key: string;
  label: string;
  href: Href;
  icon: SymbolViewProps['name'];
};

const SETTINGS_MENU_ITEMS: SettingsMenuItem[] = [
  {
    key: 'about',
    label: 'Sobre a Finora',
    href: '/about',
    icon: ABOUT_ICON,
  },
];

function SearchIcon() {
  return (
    <View style={styles.searchIcon}>
      <View style={styles.searchCircle} />
      <View style={styles.searchHandle} />
    </View>
  );
}

function BellIcon() {
  return (
    <View style={styles.bellIcon}>
      <View style={styles.bellBody} />
      <View style={styles.bellBase} />
      <View style={styles.bellClapper} />
    </View>
  );
}

function SearchGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.searchGroup}>
      <Text style={styles.searchGroupTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SearchResultRow({
  title,
  meta,
  onPress,
}: {
  title: string;
  meta?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.searchResultRow,
        pressed && styles.searchResultRowPressed,
      ]}
    >
      <View style={styles.searchResultText}>
        <Text style={styles.searchResultTitle} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.searchResultMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Text style={styles.searchResultChevron}>›</Text>
    </Pressable>
  );
}

function SettingsMenuItemRow({
  item,
  onPress,
}: {
  item: SettingsMenuItem;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      id={`settings-menu-item-${item.key}`}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.menuItem,
        hovered && styles.menuItemHovered,
        pressed && styles.menuItemPressed,
      ]}
    >
      <SymbolView
        name={item.icon}
        size={16}
        tintColor={desktopColors.textSecondary}
      />
      <Text style={styles.menuItemLabel}>{item.label}</Text>
      <SymbolView
        name={CHEVRON_RIGHT_ICON}
        size={13}
        tintColor={desktopColors.textMuted}
      />
    </Pressable>
  );
}

export function DesktopTopbar() {
  const router = useRouter();
  const { hidden, toggle: togglePrivacy } = usePrivacy();
  const { accounts } = useAccounts();
  const { transactions } = useTransactions();
  const { recurrences } = useRecurrences();

  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [panel, setPanel] = useState<TopbarPanel>(null);
  const [settingsHovered, setSettingsHovered] = useState(false);
  const [privacyHovered, setPrivacyHovered] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCategories()
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
        }
      })
      .catch(() => {
        // A busca continua funcionando com os dados já disponíveis.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');

  const results = useMemo<SearchResults>(() => {
    if (!normalizedQuery) {
      return EMPTY_RESULTS;
    }

    const transactionResults = transactions
      .filter((transaction) => {
        const description =
          transaction.description?.trim() ||
          getDefaultTransactionDescription(transaction.type);
        const category = categoriesById.get(transaction.categoryId ?? '');
        const account = accountsById.get(transaction.accountId);

        return [description, category, account]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedQuery);
      })
      .slice(0, 4)
      .map((transaction) => ({
        id: transaction.id,
        title:
          transaction.description?.trim() ||
          getDefaultTransactionDescription(transaction.type),
        meta: [
          categoriesById.get(transaction.categoryId ?? '') ??
            (transaction.type === 'TRANSFER' ? 'Transferência' : 'Sem categoria'),
          maskMoney(
            formatCurrency(transaction.amount, transaction.currency),
            hidden,
          ),
        ].join(' · '),
      }));

    const accountResults = accounts
      .filter((account) => account.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
      .slice(0, 3)
      .map((account) => ({
        id: account.id,
        title: account.name,
        meta: `${account.status === 'ACTIVE' ? 'Ativa' : 'Inativa'} · ${maskMoney(
          formatCurrency(account.balance),
          hidden,
        )}`,
      }));

    const categoryResults = categories
      .filter((category) =>
        category.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery),
      )
      .slice(0, 3)
      .map((category) => ({
        id: category.id,
        title: category.name,
      }));

    return {
      transactions: transactionResults,
      accounts: accountResults,
      categories: categoryResults,
    };
  }, [
    accounts,
    accountsById,
    categories,
    categoriesById,
    hidden,
    normalizedQuery,
    transactions,
  ]);

  const hasResults =
    results.transactions.length > 0 ||
    results.accounts.length > 0 ||
    results.categories.length > 0;

  const today = toIsoDate(new Date());
  const dueRecurrences = useMemo(
    () =>
      recurrences
        .filter(
          (recurrence) =>
            recurrence.status === 'ACTIVE' &&
            recurrence.nextOccurrence <= today,
        )
        .sort((first, second) =>
          first.nextOccurrence.localeCompare(second.nextOccurrence),
        ),
    [recurrences, today],
  );

  function cancelSearchBlur() {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }

  function closeSearch() {
    cancelSearchBlur();
    setSearchOpen(false);
    setQuery('');
  }

  function navigateToAccount(accountId: string) {
    closeSearch();
    router.navigate({
      pathname: '/accounts/[id]',
      params: { id: accountId },
    });
  }

  function handleSearchSubmit() {
    if (results.transactions.length > 0) {
      closeSearch();
      router.navigate('/transactions');
      return;
    }

    if (results.accounts.length > 0) {
      navigateToAccount(results.accounts[0].id);
      return;
    }

    if (results.categories.length > 0) {
      closeSearch();
      router.navigate('/categories');
      return;
    }

    closeSearch();
    router.navigate('/transactions');
  }

  function handleSearchBlur() {
    cancelSearchBlur();
    setSearchFocused(false);
    blurTimeoutRef.current = setTimeout(() => setSearchOpen(false), 160);
  }

  return (
    <View style={styles.topbar}>
      <View style={styles.searchArea}>
        <View
          id="search-field-topbar"
          style={[
            styles.searchBox,
            searchFocused && styles.searchBoxFocused,
          ]}
        >
          <SearchIcon />
          <TextInput
            accessibilityLabel="Buscar transações, contas ou categorias"
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              cancelSearchBlur();
              setSearchFocused(true);
              setSearchOpen(true);
            }}
            onBlur={handleSearchBlur}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Buscar transações, contas ou categorias"
            placeholderTextColor={desktopColors.textMuted}
            returnKeyType="search"
            style={styles.searchInput}
          />

          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              onPress={() => {
                cancelSearchBlur();
                setQuery('');
                setSearchOpen(true);
              }}
              style={styles.searchClear}
            >
              <Text style={styles.searchClearText}>×</Text>
            </Pressable>
          ) : null}
        </View>

        {searchOpen && normalizedQuery ? (
          <View style={styles.searchPanel}>
            {hasResults ? (
              <>
                {results.transactions.length > 0 ? (
                  <SearchGroup title="Transações">
                    {results.transactions.map((transaction) => (
                      <SearchResultRow
                        key={transaction.id}
                        title={transaction.title}
                        meta={transaction.meta}
                        onPress={() => {
                          closeSearch();
                          router.navigate('/transactions');
                        }}
                      />
                    ))}
                  </SearchGroup>
                ) : null}

                {results.accounts.length > 0 ? (
                  <SearchGroup title="Contas">
                    {results.accounts.map((account) => (
                      <SearchResultRow
                        key={account.id}
                        title={account.title}
                        meta={account.meta}
                        onPress={() => navigateToAccount(account.id)}
                      />
                    ))}
                  </SearchGroup>
                ) : null}

                {results.categories.length > 0 ? (
                  <SearchGroup title="Categorias">
                    {results.categories.map((category) => (
                      <SearchResultRow
                        key={category.id}
                        title={category.title}
                        onPress={() => {
                          closeSearch();
                          router.navigate('/categories');
                        }}
                      />
                    ))}
                  </SearchGroup>
                ) : null}
              </>
            ) : (
              <Text style={styles.searchEmpty}>
                Nenhum resultado encontrado para “{query.trim()}”.
              </Text>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notificações"
          onPress={() =>
            setPanel((current) =>
              current === 'notifications' ? null : 'notifications',
            )
          }
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
        >
          <BellIcon />
          {dueRecurrences.length > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {dueRecurrences.length > 9 ? '9+' : dueRecurrences.length}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.divider} />

        <View style={styles.privacyControl}>
          <Pressable
            id="privacy-toggle-button"
            accessibilityRole="button"
            accessibilityLabel={
              hidden ? 'Mostrar valores financeiros' : 'Ocultar valores financeiros'
            }
            accessibilityState={{ checked: hidden }}
            onPress={togglePrivacy}
            onHoverIn={() => setPrivacyHovered(true)}
            onHoverOut={() => setPrivacyHovered(false)}
            style={({ pressed }) => [
              styles.iconButton,
              privacyHovered && styles.iconButtonHovered,
              hidden && styles.iconButtonActive,
              pressed && styles.iconButtonPressed,
            ]}
          >
            <SymbolView
              name={hidden ? PRIVACY_HIDDEN_ICON : PRIVACY_ICON}
              size={19}
              tintColor={
                hidden || privacyHovered
                  ? desktopColors.primary
                  : desktopColors.textSecondary
              }
            />
          </Pressable>

          {privacyHovered ? (
            <View pointerEvents="none" style={styles.privacyTooltip}>
              <Text style={styles.privacyTooltipText}>
                {hidden ? 'Mostrar valores' : 'Ocultar valores'}
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          id="settings-menu-button"
          accessibilityRole="button"
          accessibilityLabel="Configurações"
          accessibilityState={{ expanded: panel === 'settings' }}
          onPress={() =>
            setPanel((current) =>
              current === 'settings' ? null : 'settings',
            )
          }
          onHoverIn={() => setSettingsHovered(true)}
          onHoverOut={() => setSettingsHovered(false)}
          style={({ pressed }) => [
            styles.iconButton,
            settingsHovered && styles.iconButtonHovered,
            panel === 'settings' && styles.iconButtonActive,
            pressed && styles.iconButtonPressed,
          ]}
        >
          <SymbolView
            name={SETTINGS_ICON}
            size={19}
            tintColor={
              panel === 'settings' || settingsHovered
                ? desktopColors.primary
                : desktopColors.textSecondary
            }
          />
        </Pressable>
      </View>

      <Modal
        transparent
        visible={panel !== null}
        animationType="fade"
        onRequestClose={() => setPanel(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPanel(null)}
        >
          <View
            style={[
              styles.popoverAnchor,
              panel === 'settings' && styles.settingsAnchor,
            ]}
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={styles.popover}
            >
              {panel === 'notifications' ? (
                <View>
                  <View style={styles.popoverHeader}>
                    <Text style={styles.popoverTitle}>Notificações</Text>
                    {dueRecurrences.length > 0 ? (
                      <View style={styles.popoverCount}>
                        <Text style={styles.popoverCountText}>
                          {dueRecurrences.length}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {dueRecurrences.length > 0 ? (
                    dueRecurrences.slice(0, 4).map((recurrence) => (
                      <Pressable
                        key={recurrence.id}
                        onPress={() => {
                          setPanel(null);
                          router.navigate('/recurrences');
                        }}
                        style={({ pressed }) => [
                          styles.notificationRow,
                          pressed && styles.notificationRowPressed,
                        ]}
                      >
                        <View style={styles.notificationIcon}>
                          <Text style={styles.notificationIconText}>↻</Text>
                        </View>
                        <View style={styles.notificationText}>
                          <Text
                            style={styles.notificationTitle}
                            numberOfLines={1}
                          >
                            {recurrence.description?.trim() ||
                              'Recorrência ativa'}
                          </Text>
                          <Text style={styles.notificationMeta}>
                            Próxima ocorrência:{' '}
                            {formatIsoDate(recurrence.nextOccurrence)}
                          </Text>
                        </View>
                      </Pressable>
                    ))
                  ) : (
                    <Text style={styles.popoverEmpty}>
                      Nenhuma notificação pendente.
                    </Text>
                  )}

                  <Pressable
                    onPress={() => {
                      setPanel(null);
                      router.navigate('/recurrences');
                    }}
                    style={({ pressed }) => [
                      styles.popoverFooter,
                      pressed && styles.popoverFooterPressed,
                    ]}
                  >
                    <Text style={styles.popoverFooterText}>
                      Ver recorrências
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.menu}>
                  {SETTINGS_MENU_ITEMS.map((item) => (
                    <SettingsMenuItemRow
                      key={item.key}
                      item={item}
                      onPress={() => {
                        setPanel(null);
                        router.navigate(item.href);
                      }}
                    />
                  ))}
                </View>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    height: desktopLayout.topbarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: desktopLayout.pagePadding,
    backgroundColor: desktopColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: desktopColors.border,
    zIndex: 30,
  },
  searchArea: {
    flex: 1,
    maxWidth: 440,
    position: 'relative',
    zIndex: 40,
  },
  searchBox: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surfaceMuted,
  },
  searchBoxFocused: {
    borderColor: desktopColors.primary,
    backgroundColor: desktopColors.surface,
  },
  searchIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCircle: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.6,
    borderColor: desktopColors.textSecondary,
  },
  searchHandle: {
    position: 'absolute',
    right: 1,
    bottom: 2,
    width: 5,
    height: 1.6,
    borderRadius: 1,
    backgroundColor: desktopColors.textSecondary,
    transform: [{ rotate: '45deg' }],
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: desktopColors.text,
    fontSize: 13,
    fontFamily: desktopFont,
  },
  searchClear: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearText: {
    color: desktopColors.textSecondary,
    fontSize: 18,
    lineHeight: 20,
    fontFamily: desktopFont,
  },
  searchPanel: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.popover,
  },
  searchGroup: {
    paddingTop: 4,
    paddingBottom: 2,
  },
  searchGroupTitle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  searchResultRowPressed: {
    backgroundColor: desktopColors.primarySoft,
  },
  searchResultText: {
    flex: 1,
    minWidth: 0,
  },
  searchResultTitle: {
    color: desktopColors.text,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  searchResultMeta: {
    marginTop: 2,
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  searchResultChevron: {
    color: desktopColors.textMuted,
    fontSize: 18,
    fontFamily: desktopFont,
  },
  searchEmpty: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    color: desktopColors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: desktopFont,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.surfaceMuted,
  },
  iconButtonPressed: {
    backgroundColor: desktopColors.primarySoft,
  },
  iconButtonHovered: {
    backgroundColor: desktopColors.primarySoft,
  },
  iconButtonActive: {
    backgroundColor: desktopColors.primarySoft,
  },
  privacyControl: {
    position: 'relative',
    zIndex: 60,
  },
  privacyTooltip: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    minWidth: 120,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: desktopColors.text,
    zIndex: 60,
  },
  privacyTooltipText: {
    color: desktopColors.surface,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  bellIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBody: {
    width: 13,
    height: 12,
    borderWidth: 1.6,
    borderBottomWidth: 0,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderColor: desktopColors.textSecondary,
  },
  bellBase: {
    width: 17,
    height: 1.6,
    borderRadius: 1,
    marginTop: 1,
    backgroundColor: desktopColors.textSecondary,
  },
  bellClapper: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
    backgroundColor: desktopColors.textSecondary,
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.expense,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: desktopColors.border,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: desktopLayout.topbarHeight - 6,
    paddingRight: desktopLayout.pagePadding,
    backgroundColor: desktopColors.overlay,
  },
  popoverAnchor: {
    width: 340,
  },
  settingsAnchor: {
    width: 264,
  },
  popover: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    padding: 14,
    ...desktopShadows.popover,
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  popoverTitle: {
    color: desktopColors.text,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  popoverCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  popoverCountText: {
    color: desktopColors.primary,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  notificationRowPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  notificationIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  notificationIconText: {
    color: desktopColors.primary,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  notificationText: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitle: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  notificationMeta: {
    marginTop: 2,
    color: desktopColors.textSecondary,
    fontSize: 10,
    fontFamily: desktopFont,
  },
  popoverEmpty: {
    paddingHorizontal: 6,
    paddingVertical: 18,
    color: desktopColors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: desktopFont,
  },
  popoverFooter: {
    marginTop: 8,
    paddingHorizontal: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: desktopColors.border,
  },
  popoverFooterPressed: {
    opacity: 0.65,
  },
  popoverFooterText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  menu: {
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 10,
  },
  menuItemHovered: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  menuItemPressed: {
    backgroundColor: desktopColors.primarySoft,
  },
  menuItemLabel: {
    flex: 1,
    color: desktopColors.text,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
});
