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
import { useRouter } from 'expo-router';

const transactions = [
  {
    id: '1',
    title: 'Supermercado',
    category: 'Alimentação',
    date: 'Hoje, 14:32',
    amount: -185.4,
  },
  {
    id: '2',
    title: 'Salário',
    category: 'Renda',
    date: 'Ontem, 09:15',
    amount: 3500,
  },
  {
    id: '3',
    title: 'Netflix',
    category: 'Assinaturas',
    date: 'Ontem, 08:00',
    amount: -39.9,
  },
  {
    id: '4',
    title: 'Restaurante',
    category: 'Alimentação',
    date: '18 out, 20:10',
    amount: -72.5,
  },
];

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function showComingSoon(feature: string) {
  Alert.alert(
    'Em desenvolvimento',
    `A funcionalidade "${feature}" estará disponível em breve.`,
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [balanceVisible, setBalanceVisible] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, Pedro 👋</Text>
            <Text style={styles.subtitle}>
              Aqui está seu resumo financeiro.
            </Text>
          </View>

          <Pressable
            style={styles.avatar}
            onPress={() => showComingSoon('Perfil')}
          >
            <Text style={styles.avatarText}>P</Text>
          </Pressable>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Saldo total</Text>

            <Pressable
              onPress={() => setBalanceVisible((visible) => !visible)}
              accessibilityRole="button"
              accessibilityLabel={
                balanceVisible ? 'Ocultar saldo' : 'Mostrar saldo'
              }
            >
              <Text style={styles.balanceToggle}>
                {balanceVisible ? 'Ocultar' : 'Mostrar'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.balanceValue}>
            {balanceVisible ? formatCurrency(8450.9) : '••••••••'}
          </Text>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceFooter}>
            <View>
              <Text style={styles.balanceFooterLabel}>Receitas do mês</Text>
              <Text style={styles.incomeValue}>
                {balanceVisible ? '+ R$ 4.200,00' : '••••••'}
              </Text>
            </View>

            <View>
              <Text style={styles.balanceFooterLabel}>Despesas do mês</Text>
              <Text style={styles.expenseValue}>
                {balanceVisible ? '- R$ 1.750,00' : '••••••'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryAction,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/new-transaction')}
          >
            <Text style={styles.primaryActionIcon}>＋</Text>
            <Text style={styles.primaryActionText}>Nova transação</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryAction,
              pressed && styles.pressed,
            ]}
            onPress={() => showComingSoon('Adicionar conta')}
          >
            <Text style={styles.secondaryActionIcon}>▣</Text>
            <Text style={styles.secondaryActionText}>Adicionar conta</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transações recentes</Text>

          <Pressable
            onPress={() => router.navigate('/transactions')}
            accessibilityRole="button"
          >
            <Text style={styles.seeAll}>Ver todas</Text>
          </Pressable>
        </View>

        <View style={styles.transactionList}>
          {transactions.map((transaction) => {
            const isIncome = transaction.amount > 0;

            return (
              <Pressable
                key={transaction.id}
                style={({ pressed }) => [
                  styles.transactionItem,
                  pressed && styles.transactionPressed,
                ]}
                onPress={() => showComingSoon('Detalhes da transação')}
              >
                <View
                  style={[
                    styles.transactionIcon,
                    isIncome
                      ? styles.incomeIconBackground
                      : styles.expenseIconBackground,
                  ]}
                >
                  <Text
                    style={[
                      styles.transactionIconText,
                      isIncome
                        ? styles.incomeIconText
                        : styles.expenseIconText,
                    ]}
                  >
                    {isIncome ? '↓' : '↑'}
                  </Text>
                </View>

                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>
                    {transaction.title}
                  </Text>
                  <Text style={styles.transactionMeta}>
                    {transaction.category} · {transaction.date}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.transactionAmount,
                    isIncome ? styles.incomeValue : styles.expenseValue,
                  ]}
                >
                  {isIncome ? '+' : '-'}
                  {formatCurrency(Math.abs(transaction.amount))}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.demoNotice}>
          <Text style={styles.demoNoticeTitle}>Dados demonstrativos</Text>
          <Text style={styles.demoNoticeText}>
            Os valores desta tela ainda são exemplos e não representam
            necessariamente os saldos e as transações reais das suas contas.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F8F5',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#202820',
  },
  subtitle: {
    marginTop: 5,
    fontSize: 13,
    color: '#747D74',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DDECE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#176B52',
  },
  balanceCard: {
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#176B52',
    marginBottom: 22,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 13,
    color: '#D7E8DE',
  },
  balanceToggle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceValue: {
    marginTop: 12,
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: '#FFFFFF35',
    marginVertical: 20,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  balanceFooterLabel: {
    fontSize: 11,
    color: '#D7E8DE',
    marginBottom: 7,
  },
  incomeValue: {
    color: '#237A4B',
    fontWeight: '700',
  },
  expenseValue: {
    color: '#B5473C',
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  primaryAction: {
    flex: 1,
    minHeight: 58,
    borderRadius: 15,
    backgroundColor: '#176B52',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 7,
  },
  primaryActionIcon: {
    fontSize: 23,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryAction: {
    flex: 1,
    minHeight: 58,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DCE3DB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 7,
  },
  secondaryActionIcon: {
    fontSize: 17,
    color: '#176B52',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#176B52',
  },
  pressed: {
    opacity: 0.75,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#202820',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: '#176B52',
  },
  transactionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E7EAE4',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF1ED',
  },
  transactionPressed: {
    opacity: 0.7,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  incomeIconBackground: {
    backgroundColor: '#E2F3E8',
  },
  expenseIconBackground: {
    backgroundColor: '#FBE9E6',
  },
  transactionIconText: {
    fontSize: 22,
    fontWeight: '700',
  },
  incomeIconText: {
    color: '#237A4B',
  },
  expenseIconText: {
    color: '#B5473C',
  },
  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#202820',
  },
  transactionMeta: {
    marginTop: 5,
    fontSize: 11,
    color: '#7B847B',
  },
  transactionAmount: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  demoNotice: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#EEF1EA',
  },
  demoNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4B594D',
    marginBottom: 5,
  },
  demoNoticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6C766D',
  },
});