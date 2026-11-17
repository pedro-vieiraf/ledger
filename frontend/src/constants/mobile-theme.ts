import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * Tokens da experiência mobile.
 *
 * Os valores espelham a identidade já usada no desktop. Eles são declarados
 * aqui (em vez de importar `desktop-theme`) para manter `constants` independente
 * da camada de componentes e evitar acoplamento entre os dois layouts.
 */
export const mobileColors = {
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
  overlay: 'rgba(20, 32, 26, 0.28)',
} as const;

export const mobileFont = Fonts.sans;

export const mobileTypography = {
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
} as const;

export const mobileSpacing = {
  xs: Spacing.two,
  sm: Spacing.three,
  md: 20,
  lg: Spacing.four,
  xl: Spacing.five,
} as const;

export const mobileRadius = {
  small: 10,
  medium: 14,
  large: 18,
  xl: 24,
  pill: 999,
} as const;

export const mobileTouchTarget = 44;

export const mobileLayout = {
  contentMaxWidth: MaxContentWidth,
  horizontalPadding: mobileSpacing.md,
  contentPaddingTop: 16,
  contentPaddingBottom: mobileSpacing.xl,
} as const;

export const mobileShadows = {
  sheet: {
    shadowColor: '#172A21',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
} as const;
