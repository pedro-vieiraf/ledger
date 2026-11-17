import { Fonts } from '@/constants/theme';

export const desktopColors = {
  background: '#F7F7F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F3EE',
  primary: '#1F5B45',
  primarySoft: '#DCE9E1',
  primaryStrong: '#174535',
  text: '#252B28',
  textSecondary: '#6B746E',
  textMuted: '#8A918C',
  border: '#E4E7E0',
  borderStrong: '#D5DAD2',
  income: '#237A4B',
  incomeSoft: '#E2F3E8',
  expense: '#B5473C',
  expenseSoft: '#FBE9E6',
  transfer: '#5474A1',
  transferSoft: '#EDF1F8',
  warning: '#A36A1F',
  warningSoft: '#F7EFE1',
  shadow: '#172A21',
  overlay: 'rgba(20, 32, 26, 0.18)',
} as const;

export const desktopLayout = {
  breakpoint: 1024,
  sidebarWidth: 240,
  sidebarCollapsedWidth: 76,
  topbarHeight: 72,
  contentMaxWidth: 1440,
  pagePadding: 32,
  radius: 18,
  radiusSmall: 12,
} as const;

export const desktopFont = Fonts.sans;

export const desktopShadows = {
  card: {
    shadowColor: desktopColors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  popover: {
    shadowColor: desktopColors.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;
