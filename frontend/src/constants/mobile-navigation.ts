import type {
  AndroidSymbol,
  SFSymbol,
  SymbolViewProps,
} from 'expo-symbols';

export type MobileNavHref =
  | '/'
  | '/transactions'
  | '/accounts'
  | '/categories'
  | '/recurrences';

export type MobileNavItem = {
  /** Nome da rota dentro de `(tabs)`. */
  route: string;
  href: MobileNavHref;
  label: string;
  icon: SymbolViewProps['name'];
  sf: { default: SFSymbol; selected: SFSymbol };
  md: { default: AndroidSymbol; selected: AndroidSymbol };
};

/**
 * Ordem e nomenclatura alinhadas à sidebar desktop.
 * "Assinaturas" é o rótulo de interface; a rota `/recurrences` permanece.
 */
export const MOBILE_NAV_ITEMS = [
  {
    route: 'index',
    href: '/',
    label: 'Dashboard',
    icon: { ios: 'house', android: 'home', web: 'home' },
    sf: { default: 'house', selected: 'house.fill' },
    md: { default: 'home', selected: 'home_filled' },
  },
  {
    route: 'transactions',
    href: '/transactions',
    label: 'Transações',
    icon: { ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' },
    sf: {
      default: 'arrow.left.arrow.right',
      selected: 'arrow.left.arrow.right',
    },
    md: { default: 'swap_horiz', selected: 'swap_horiz' },
  },
  {
    route: 'accounts',
    href: '/accounts',
    label: 'Contas',
    icon: {
      ios: 'building.columns',
      android: 'account_balance_wallet',
      web: 'account_balance_wallet',
    },
    sf: { default: 'building.columns', selected: 'building.columns.fill' },
    md: {
      default: 'account_balance_wallet',
      selected: 'account_balance_wallet',
    },
  },
  {
    route: 'categories',
    href: '/categories',
    label: 'Categorias',
    icon: {
      ios: 'square.grid.2x2',
      android: 'category',
      web: 'category',
    },
    sf: { default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' },
    md: { default: 'category', selected: 'category' },
  },
  {
    route: 'recurrences',
    href: '/recurrences',
    label: 'Assinaturas',
    icon: {
      ios: 'arrow.triangle.2.circlepath',
      android: 'subscriptions',
      web: 'subscriptions',
    },
    sf: {
      default: 'arrow.triangle.2.circlepath',
      selected: 'arrow.triangle.2.circlepath',
    },
    md: { default: 'subscriptions', selected: 'subscriptions' },
  },
] as const satisfies readonly MobileNavItem[];

export function isActiveMobileNavPath(
  pathname: string,
  href: MobileNavHref,
) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
