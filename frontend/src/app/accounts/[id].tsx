import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccounts } from '@/contexts/accounts-context';

const colors = {
  background: '#F7F8F5',
  surface: '#FFFFFF',
  primary: '#176B52',
  primaryLight: '#E8F3ED',
  text: '#202923',
  secondary: '#788078',
  border: '#E9ECE7',
  danger: '#B84D4D',
  dangerLight: '#F9EDEC',
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export default function AccountDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accounts } = useAccounts();

  const account = accounts.find((item) => item.id === id);

  if (!account) {
    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Stack.Screen options={{ headerShown: false }} />

          <View style={styles.centeredContent}>
            <Text style={styles.notFoundTitle}>Conta não encontrada</Text>
            <Text style={styles.notFoundDescription}>
              Essa conta pode ter sido removida ou não está mais disponível.
            </Text>

            <Pressable
                accessibilityRole="button"
                style={styles.primaryButton}
                onPress={() => router.back()}
            >
              <Text style={styles.primaryButtonText}>Voltar</Text>
            </Pressable>
          </View>
        </SafeAreaView>
    );
  }

  const isActive = account.status === 'ACTIVE';

  return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />

        <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
          <Pressable
              accessibilityRole="button"
              style={styles.backButton}
              onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>‹  Voltar para contas</Text>
          </Pressable>

          <Text style={styles.eyebrow}>LEDGER / CONTAS</Text>

          <View style={styles.heading}>
            <View
                style={[
                  styles.accountIcon,
                  !isActive && styles.accountIconInactive,
                ]}
            >
              <Text style={styles.accountIconText}>
                {account.type === 'CHECKING' ? '▤' : '◫'}
              </Text>
            </View>

            <View style={styles.headingText}>
              <Text style={styles.title}>{account.name}</Text>
              <Text style={styles.subtitle}>
                {account.type === 'CHECKING' ? 'Conta corrente' : 'Poupança'}
              </Text>
            </View>
          </View>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Saldo atual</Text>
            <Text style={styles.balanceAmount} adjustsFontSizeToFit>
              {currencyFormatter.format(account.balance)}
            </Text>

            <View
                style={[
                  styles.statusBadge,
                  isActive ? styles.statusActive : styles.statusInactive,
                ]}
            >
              <View
                  style={[
                    styles.statusDot,
                    !isActive && styles.statusDotInactive,
                  ]}
              />
              <Text
                  style={[
                    styles.statusText,
                    !isActive && styles.statusTextInactive,
                  ]}
              >
                {isActive ? 'Conta ativa' : 'Conta inativa'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Informações da conta</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome</Text>
              <Text style={styles.infoValue}>{account.name}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo</Text>
              <Text style={styles.infoValue}>
                {account.type === 'CHECKING' ? 'Conta corrente' : 'Poupança'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>
                {isActive ? 'Ativa' : 'Inativa'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Identificador</Text>
              <Text style={styles.idValue} selectable>
                {account.id}
              </Text>
            </View>
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Movimentações</Text>
            <Text style={styles.noticeDescription}>
              O histórico de receitas, despesas e transferências desta conta
              será implementado em uma próxima etapa.
            </Text>
          </View>

          <Text style={styles.disclaimer}>
            Os dados são mantidos em memória nesta versão de desenvolvimento.
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
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
    marginBottom: 24,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 18,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  accountIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountIconInactive: {
    backgroundColor: '#EEEEEA',
  },
  accountIconText: {
    color: colors.primary,
    fontSize: 26,
  },
  headingText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: 14,
    marginTop: 5,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 23,
    marginBottom: 30,
  },
  balanceLabel: {
    color: '#E0EEE7',
    fontSize: 13,
    fontWeight: '500',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.7,
    marginTop: 12,
    marginBottom: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 7,
  },
  statusActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  statusInactive: {
    backgroundColor: '#F3E4E2',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#9BD4B4',
  },
  statusDotInactive: {
    backgroundColor: colors.danger,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextInactive: {
    color: colors.danger,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 17,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 16,
  },
  infoLabel: {
    color: colors.secondary,
    fontSize: 13,
  },
  infoValue: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  idValue: {
    flex: 1,
    color: colors.secondary,
    fontSize: 11,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  notice: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 18,
    marginTop: 22,
  },
  noticeTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  noticeDescription: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  disclaimer: {
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 24,
  },
  notFoundTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  notFoundDescription: {
    color: colors.secondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 22,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
