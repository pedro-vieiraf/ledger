import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = {
  background: '#F7F8F5',
  surface: '#FFFFFF',
  primary: '#176B52',
  primaryLight: '#E8F3ED',
  text: '#202923',
  secondary: '#788078',
  border: '#E9ECE7',
  income: '#27845B',
  expense: '#B84D4D',
  expenseLight: '#F9EDEC',
};

const transactions = [
  {
    id: '1',
    title: 'Supermercado',
    category: 'Alimentação',
    date: 'Hoje, 14:32',
    amount: -185.4,
    symbol: 'S',
    color: '#F2E8D9',
  },
  {
    id: '2',
    title: 'Salário',
    category: 'Renda',
    date: 'Ontem, 09:15',
    amount: 3500,
    symbol: 'R',
    color: colors.primaryLight,
  },
  {
    id: '3',
    title: 'Netflix',
    category: 'Assinaturas',
    date: 'Ontem, 08:00',
    amount: -39.9,
    symbol: 'N',
    color: '#F5E6E6',
  },
  {
    id: '4',
    title: 'Restaurante',
    category: 'Alimentação',
    date: '18 out, 20:10',
    amount: -72.5,
    symbol: 'R',
    color: '#F2E8D9',
  },
];

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export default function HomeScreen() {
  const [balanceVisible, setBalanceVisible] = useState(true);

  function showComingSoon(feature: string) {
    Alert.alert(
      feature,
      'Esta funcionalidade será implementada nas próximas etapas do Ledger.',
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>L</Text>
            </View>

            <View>
              <Text style={styles.brandName}>Ledger</Text>
              <Text style={styles.brandSubtitle}>Suas finanças, em ordem.</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notificações"
            style={styles.headerButton}
            onPress={() => showComingSoon('Notificações')}
          >
            <Text style={styles.headerButtonText}>♧</Text>
          </Pressable>
        </View>

        <View style={styles.monthRow}>
          <Text style={styles.sectionEyebrow}>VISÃO GERAL</Text>

          <Pressable
            accessibilityRole="button"
            style={styles.monthButton}
            onPress={() => showComingSoon('Selecionar período')}
          >
            <Text style={styles.monthButtonText}>Outubro 2026  ⌄</Text>
          </Pressable>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Saldo total</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                balanceVisible ? 'Ocultar saldo' : 'Mostrar saldo'
              }
              onPress={() => setBalanceVisible((visible) => !visible)}
              hitSlop={10}
            >
              <Text style={styles.visibilityButton}>
                {balanceVisible ? 'Ocultar' : 'Mostrar'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.balanceAmount}>
            {balanceVisible ? formatCurrency(8450.9) : 'R$ ••••••'}
          </Text>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceFooter}>
            <View style={styles.balanceIndicator}>
              <Text style={styles.balanceIndicatorText}>↗</Text>
            </View>

            <Text style={styles.balanceFooterText}>
              Saldo consolidado das suas contas
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Este mês</Text>
          <Text style={styles.sectionCaption}>Outubro de 2026</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconIncome}>
              <Text style={styles.summaryIconTextIncome}>↙</Text>
            </View>

            <Text style={styles.summaryLabel}>Receitas</Text>

            <Text
              style={styles.summaryAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {balanceVisible ? formatCurrency(4200) : 'R$ •••••'}
            </Text>

            <Text style={styles.summaryDescription}>Entradas do mês</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIconExpense}>
              <Text style={styles.summaryIconTextExpense}>↗</Text>
            </View>

            <Text style={styles.summaryLabel}>Despesas</Text>

            <Text
              style={styles.summaryAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {balanceVisible ? formatCurrency(1750) : 'R$ •••••'}
            </Text>

            <Text style={styles.summaryDescription}>Saídas do mês</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transações recentes</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => showComingSoon('Todas as transações')}
            hitSlop={8}
          >
            <Text style={styles.seeAll}>Ver todas →</Text>
          </Pressable>
        </View>

        <View style={styles.transactionsCard}>
          {transactions.map((transaction, index) => {
            const isIncome = transaction.amount > 0;

            return (
              <View
                key={transaction.id}
                style={[
                  styles.transactionRow,
                  index !== transactions.length - 1 &&
                    styles.transactionBorder,
                ]}
              >
                <View
                  style={[
                    styles.transactionIcon,
                    { backgroundColor: transaction.color },
                  ]}
                >
                  <Text style={styles.transactionIconText}>
                    {transaction.symbol}
                  </Text>
                </View>

                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionTitle} numberOfLines={1}>
                    {transaction.title}
                  </Text>

                  <Text style={styles.transactionCategory}>
                    {transaction.category} · {transaction.date}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.transactionAmount,
                    {
                      color: isIncome ? colors.income : colors.text,
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {isIncome ? '+' : '−'}
                  {formatCurrency(Math.abs(transaction.amount))}
                </Text>
              </View>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={() => showComingSoon('Nova transação')}
        >
          <Text style={styles.addButtonIcon}>＋</Text>
          <Text style={styles.addButtonText}>Nova transação</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Valores demonstrativos — ainda não conectados às suas contas.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  logo: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '700',
  },
  brandName: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  brandSubtitle: {
    color: colors.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 22,
    color: colors.text,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.secondary,
  },
  monthButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  monthButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    color: '#D6E8DF',
    fontSize: 14,
    fontWeight: '500',
  },
  visibilityButton: {
    color: '#E1EEE7',
    fontSize: 12,
    fontWeight: '600',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1.1,
    marginTop: 10,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: '#FFFFFF30',
    marginVertical: 20,
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  balanceIndicator: {
    width: 25,
    height: 25,
    borderRadius: 9,
    backgroundColor: '#FFFFFF20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceIndicatorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  balanceFooterText: {
    color: '#D6E8DF',
    fontSize: 12,
    flexShrink: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionCaption: {
    color: colors.secondary,
    fontSize: 11,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 29,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
  },
  summaryIconIncome: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  summaryIconExpense: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.expenseLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  summaryIconTextIncome: {
    color: colors.income,
    fontSize: 19,
    fontWeight: '700',
  },
  summaryIconTextExpense: {
    color: colors.expense,
    fontSize: 19,
    fontWeight: '700',
  },
  summaryLabel: {
    color: colors.secondary,
    fontSize: 12,
    marginBottom: 7,
  },
  summaryAmount: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  summaryDescription: {
    color: colors.secondary,
    fontSize: 10,
    marginTop: 7,
  },
  seeAll: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  transactionsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 16,
  },
  transactionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionIconText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  transactionDetails: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  transactionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  transactionCategory: {
    color: colors.secondary,
    fontSize: 10,
  },
  transactionAmount: {
    maxWidth: '42%',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  addButton: {
    minHeight: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addButtonIcon: {
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 25,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disclaimer: {
    color: colors.secondary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 16,
  },
});