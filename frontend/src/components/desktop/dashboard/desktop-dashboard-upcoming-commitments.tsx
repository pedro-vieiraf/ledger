import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { formatCurrency } from '@/components/desktop/desktop-format';
import {
  desktopColors,
  desktopFont,
  desktopLayout,
  desktopShadows,
} from '@/components/desktop/desktop-theme';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import {
  formatRecurrenceDate,
  frequencyLabel,
} from '@/components/recurrences/recurrence-utils';
import { usePrivacy } from '@/contexts/privacy-context';
import { useUpcomingCommitments } from '@/hooks/use-upcoming-commitments';
import { maskMoney } from '@/utils/privacy';

const ICONS = {
  commitment: {
    ios: 'calendar',
    android: 'calendar_month',
    web: 'calendar_month',
  },
} satisfies Record<string, SymbolViewProps['name']>;

/**
 * Próximos compromissos do Dashboard desktop.
 *
 * A fonte é o `RecurrencesProvider`: apenas despesas ativas com próxima
 * ocorrência futura, no máximo quatro, em ordem cronológica. Nenhum compromisso
 * é projetado além do que existe no contrato de recorrências.
 */
export function DesktopDashboardUpcomingCommitments() {
  const router = useRouter();
  const { hidden } = usePrivacy();
  const { commitments, loading, error, refresh } = useUpcomingCommitments();

  const isInitialLoading = loading && commitments.length === 0;
  const isRefreshing = loading && commitments.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>Próximos compromissos</Text>
          <Text style={styles.subtitle}>
            Assinaturas e recorrências ativas
          </Text>
        </View>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Ver todas as assinaturas"
          onPress={() => router.navigate('/recurrences')}
          style={({ pressed }) => [
            styles.linkButton,
            pressed && styles.linkButtonPressed,
          ]}
        >
          <Text style={styles.linkText}>Ver todos</Text>
          <Text style={styles.linkChevron}>›</Text>
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
              pressed && styles.retryButtonPressed,
              isRefreshing && styles.retryButtonDisabled,
            ]}
          >
            <Text style={styles.retryButtonText}>
              {isRefreshing ? 'Atualizando...' : 'Tentar novamente'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isInitialLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={desktopColors.primary} />
          <Text style={styles.loadingText}>Carregando compromissos...</Text>
        </View>
      ) : commitments.length === 0 && !error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nenhum compromisso futuro</Text>
          <Text style={styles.emptyText}>
            Cadastre uma assinatura ou recorrência para acompanhar os próximos
            vencimentos aqui.
          </Text>
        </View>
      ) : commitments.length > 0 ? (
        <View style={styles.list}>
          {commitments.map((commitment, index) => (
            <View
              key={commitment.id}
              style={[
                styles.row,
                index < commitments.length - 1 && styles.rowDivider,
              ]}
            >
              <View style={styles.iconBadge}>
                <SymbolView
                  name={ICONS.commitment}
                  size={15}
                  tintColor={desktopColors.primary}
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
                  formatCurrency(commitment.amount, commitment.currency),
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
  container: {
    flex: 1,
    minWidth: 300,
    padding: 20,
    borderRadius: desktopLayout.radius,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.card,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heading: {
    flexShrink: 1,
    minWidth: 160,
  },
  title: {
    color: desktopColors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    fontFamily: desktopFont,
  },
  subtitle: {
    marginTop: 4,
    color: desktopColors.textSecondary,
    fontSize: 11,
    fontFamily: desktopFont,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  linkButtonPressed: {
    opacity: 0.62,
  },
  linkText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  linkChevron: {
    color: desktopColors.primary,
    fontSize: 16,
    lineHeight: 17,
    fontFamily: desktopFont,
  },
  feedbackBlock: {
    marginTop: 14,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: desktopColors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonPressed: {
    backgroundColor: desktopColors.primarySoft,
  },
  retryButtonDisabled: {
    opacity: 0.4,
  },
  retryButtonText: {
    color: desktopColors.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  emptyState: {
    marginTop: 14,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  emptyTitle: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  emptyText: {
    marginTop: 5,
    color: desktopColors.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: desktopFont,
  },
  list: {
    marginTop: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: desktopColors.border,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primarySoft,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  meta: {
    marginTop: 2,
    color: desktopColors.textSecondary,
    fontSize: 10,
    fontFamily: desktopFont,
  },
  amount: {
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: desktopFont,
  },
});
