import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = {
  background: '#F7F8F5',
  surface: '#FFFFFF',
  primary: '#176B52',
  text: '#202923',
  secondary: '#788078',
  border: '#E9ECE7',
};

export default function TransactionsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>LEDGER</Text>
        <Text style={styles.title}>Transações</Text>
        <Text style={styles.description}>
          Acompanhe suas receitas, despesas e transferências.
        </Text>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>↔</Text>
          </View>

          <Text style={styles.cardTitle}>
            Suas transações aparecerão aqui
          </Text>

          <Text style={styles.cardDescription}>
            Nesta área você poderá consultar o histórico e filtrar suas
            movimentações por período, categoria e tipo.
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          A lista de transações será implementada na próxima etapa.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  description: {
    color: colors.secondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 26,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#E8F3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  icon: {
    color: colors.primary,
    fontSize: 28,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardDescription: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  disclaimer: {
    color: colors.secondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 18,
  },
});