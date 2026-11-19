import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { InlineFeedback } from '@/components/feedback/inline-feedback';
import {
  formatRecurrenceDate,
  frequencyLabel,
} from '@/components/recurrences/recurrence-utils';
import {
  mobileColors,
  mobileFont,
  mobileRadius,
} from '@/constants/mobile-theme';
import { usePrivacy } from '@/contexts/privacy-context';
import { useUpcomingCommitments } from '@/hooks/use-upcoming-commitments';
import { maskMoney } from '@/utils/privacy';

const colors = {
  surface: mobileColors.surface,
  surfaceMuted: mobileColors.surfaceMuted,
  primary: mobileColors.primary,
  primarySoft: mobileColors.primarySoft,
  text: mobileColors.text,
  secondary: mobileColors.textSecondary,
  muted: mobileColors.textMuted,
  border: mobileColors.border,
};

const COMMITMENT_ICON = {
  ios: 'calendar',
  android: 'calendar_month',
  web: 'calendar_month',
} satisfies SymbolViewProps['name'];

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

/**
 * Próximos compromissos do Dashboard mobile.
 *
 * Fonte: `RecurrencesProvider`. Somente despesas ativas com próxima ocorrência
 * futura, no máximo quatro e em ordem cronológica.
 */
export function MobileDashboardUpcomingCommitments() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const { commitments, loading, error, refresh } = useUpcomingCommitments();

  const isInitialLoading = loading && commitments.length === 0;
  const isRefreshing = loading && commitments.length > 0;

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Próximos compromissos</Text>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Ver todas as assinaturas"
          onPress={() => router.navigate('/recurrences')}
        >
          <Text style={styles.sectionLink}>Ver todos</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.feedbackBlock}>
          <InlineFeedback
            variant="error"
            title="Não foi possível atualizar os compromissos"
            message={error}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isRefreshing }}
            disabled={isRefreshing}
            onPress={() => void refresh().catch(() => {})}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.pressed,
              isRefreshing && styles.disabled,
            ]}
          >
            <Text style={styles.retryButtonText}>
              {isRefreshing ? 'Atualizando...' : 'Tentar novamente'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isInitialLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.stateText}>Carregando compromissos...</Text>
        </View>
      ) : commitments.length === 0 && !error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nenhum compromisso futuro</Text>
          <Text style={styles.emptyText}>
            Cadastre uma assinatura ou recorrência para acompanhar os próximos
            vencimentos.
          </Text>
        </View>
      ) : commitments.length > 0 ? (
        <View style={styles.panel}>
          {commitments.map((commitment, index) => (
            <View
              key={commitment.id}
              style={[
                styles.row,
                index > 0 && styles.rowDivider,
              ]}
            >
              <View style={styles.iconBadge}>
                <SymbolView
                  name={COMMITMENT_ICON}
                  size={16}
                  tintColor={colors.primary}
                />
              </View>

              <View style={styles.info}>
                <Text style={styles.description} numberOfLines={1}>
                  {commitment.description}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {`Vence em ${formatRecurrenceDate(
                    commitment.dueDate,
                  )} · ${frequencyLabel(commitment.frequency)}`}
                </Text>
              </View>

              <Text
                style={styles.amount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {maskMoney(
                  formatCurrency(commitment.amount),
                  hidden,
                )}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    fontFamily: mobileFont,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: mobileFont,
  },
  feedbackBlock: {
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: mobileFont,
  },
  stateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 22,
  },
  stateText: {
    fontSize: 12,
    color: colors.secondary,
    fontFamily: mobileFont,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontFamily: mobileFont,
  },
  emptyText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: colors.secondary,
    fontFamily: mobileFont,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: mobileRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    fontFamily: mobileFont,
  },
  meta: {
    marginTop: 2,
    fontSize: 10,
    color: colors.secondary,
    fontFamily: mobileFont,
  },
  amount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontFamily: mobileFont,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
});
