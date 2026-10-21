import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  getAccounts,
  type Account,
} from '@/services/accounts-api';
import {
  createTransaction,
  type CreateTransactionInput,
  type TransactionType,
} from '@/services/transactions-api';
import {
  getCategories,
  type Category,
} from '@/services/categories-api';

type FormType = TransactionType;

const COLORS = {
  background: '#F7F7F2',
  surface: '#FFFFFF',
  primary: '#1F5B45',
  primaryLight: '#E5F0E9',
  text: '#202820',
  secondary: '#69736B',
  border: '#E1E5DE',
  danger: '#B42318',
  income: '#237A4B',
  expense: '#B5473C',
};

function parseAmount(value: string): number | null {
  const normalized = value
    .trim()
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');

  if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100) / 100;
}

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function NewTransactionScreen() {
  const router = useRouter();

  // Impede envios duplicados antes mesmo de o estado React ser atualizado.
  const submitLock = useRef(false);

  const [type, setType] = useState<FormType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === 'ACTIVE'),
    [accounts],
  );

  const availableDestinations = useMemo(
    () => activeAccounts.filter((account) => account.id !== accountId),
    [activeAccounts, accountId],
  );

  const selectedAccount = activeAccounts.find(
    (account) => account.id === accountId,
  );

  const selectedDestination = availableDestinations.find(
    (account) => account.id === destinationAccountId,
  );

  async function loadOptions() {
    setLoadingOptions(true);
    setLoadError(null);

    try {
      const [loadedAccounts, loadedCategories] = await Promise.all([
        getAccounts(),
        getCategories(),
      ]);

      setAccounts(loadedAccounts);
      setCategories(loadedCategories);

      setAccountId((current) =>
        loadedAccounts.some(
          (account) =>
            account.id === current && account.status === 'ACTIVE',
        )
          ? current
          : loadedAccounts.find((account) => account.status === 'ACTIVE')
              ?.id ?? '',
      );

      setDestinationAccountId((current) =>
        loadedAccounts.some(
          (account) =>
            account.id === current && account.status === 'ACTIVE',
        )
          ? current
          : '',
      );

      setCategoryId((current) =>
        loadedCategories.some((category) => category.id === current)
          ? current
          : '',
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar contas e categorias.',
      );
    } finally {
      setLoadingOptions(false);
    }
  }

  useEffect(() => {
    void loadOptions();
  }, []);

  function changeType(nextType: FormType) {
    setType(nextType);

    if (nextType === 'TRANSFER') {
      setCategoryId('');
    } else {
      setDestinationAccountId('');
    }
  }

  function validateForm(): string | null {
    if (!amount.trim()) {
      return 'Informe o valor da transação.';
    }

    if (parseAmount(amount) === null) {
      return 'Informe um valor maior que zero, com no máximo duas casas decimais.';
    }

    if (!accountId || !selectedAccount) {
      return 'Selecione uma conta de origem ativa.';
    }

    if (type === 'TRANSFER') {
      if (!destinationAccountId || !selectedDestination) {
        return 'Selecione uma conta de destino ativa.';
      }

      if (destinationAccountId === accountId) {
        return 'A conta de origem e a de destino devem ser diferentes.';
      }
    }

    return null;
  }

  async function handleSubmit() {
    // O ref bloqueia chamadas simultâneas sem depender do próximo render.
    if (submitLock.current || submitting || loadingOptions) {
      return;
    }

    if (loadError) {
      Alert.alert(
        'Dados indisponíveis',
        'Tente carregar as contas e categorias novamente.',
      );
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      Alert.alert('Confira os dados', validationError);
      return;
    }

    const parsedAmount = parseAmount(amount);

    if (parsedAmount === null) {
      return;
    }

    const normalizedDescription = description.trim();

    const input: CreateTransactionInput =
      type === 'TRANSFER'
        ? {
            amount: parsedAmount,
            currency: 'BRL',
            type,
            description: normalizedDescription || null,
            accountId,
            destinationAccountId,
          }
        : {
            amount: parsedAmount,
            currency: 'BRL',
            type,
            description: normalizedDescription || null,
            accountId,
            categoryId: categoryId || null,
          };

    // Definido sincronamente, antes da primeira operação assíncrona.
    submitLock.current = true;
    setSubmitting(true);

    try {
      await createTransaction(input);

      // O sucesso só é considerado após a API responder sem erro.
      // Volta imediatamente, sem esperar pelo botão OK de um alerta.
      router.back();
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar',
        error instanceof Error
          ? error.message
          : 'Ocorreu um erro ao criar a transação.',
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  if (loadingOptions) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          Carregando contas e categorias...
        </Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>
          Não foi possível carregar os dados
        </Text>
        <Text style={styles.errorText}>{loadError}</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => void loadOptions()}
        >
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </Pressable>

        <Pressable
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => router.back()}
            style={styles.backButton}
            disabled={submitting}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>MOVIMENTAÇÕES</Text>
            <Text style={styles.title}>Nova transação</Text>
            <Text style={styles.subtitle}>
              Registre uma movimentação financeira.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Tipo de transação</Text>

          <View style={styles.typeSelector}>
            <TypeButton
              label="Despesa"
              selected={type === 'EXPENSE'}
              onPress={() => changeType('EXPENSE')}
              disabled={submitting}
            />
            <TypeButton
              label="Receita"
              selected={type === 'INCOME'}
              onPress={() => changeType('INCOME')}
              disabled={submitting}
            />
            <TypeButton
              label="Transferência"
              selected={type === 'TRANSFER'}
              onPress={() => changeType('TRANSFER')}
              disabled={submitting}
            />
          </View>

          <Text style={styles.label}>Valor</Text>

          <View style={styles.amountContainer}>
            <Text style={styles.currencyPrefix}>R$</Text>
            <TextInput
              accessibilityLabel="Valor da transação em reais"
              value={amount}
              onChangeText={setAmount}
              placeholder="0,00"
              placeholderTextColor="#A0A8A0"
              keyboardType="decimal-pad"
              style={styles.amountInput}
              editable={!submitting}
              maxLength={15}
            />
          </View>

          <Text style={styles.helperText}>
            {amount && parseAmount(amount) !== null
              ? formatMoney(parseAmount(amount)!)
              : 'Informe o valor em reais.'}
          </Text>

          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={
              type === 'INCOME'
                ? 'Ex.: Salário'
                : type === 'TRANSFER'
                  ? 'Ex.: Transferência para reserva'
                  : 'Ex.: Compras no supermercado'
            }
            placeholderTextColor="#A0A8A0"
            style={styles.input}
            editable={!submitting}
            maxLength={200}
          />

          <Text style={styles.label}>Conta de origem</Text>
          {activeAccounts.length === 0 ? (
            <Text style={styles.warningText}>
              Você precisa ter uma conta ativa para criar uma transação.
            </Text>
          ) : (
            <View style={styles.optionsList}>
              {activeAccounts.map((account) => (
                <OptionButton
                  key={account.id}
                  label={account.name}
                  detail={`${account.type === 'CHECKING' ? 'Conta corrente' : 'Poupança'} · ${formatMoney(account.balance)}`}
                  selected={accountId === account.id}
                  onPress={() => {
                    setAccountId(account.id);

                    if (destinationAccountId === account.id) {
                      setDestinationAccountId('');
                    }
                  }}
                  disabled={submitting}
                />
              ))}
            </View>
          )}

          {type === 'TRANSFER' && (
            <>
              <Text style={styles.label}>Conta de destino</Text>

              {availableDestinations.length === 0 ? (
                <Text style={styles.warningText}>
                  Você precisa de outra conta ativa para fazer uma transferência.
                </Text>
              ) : (
                <View style={styles.optionsList}>
                  {availableDestinations.map((account) => (
                    <OptionButton
                      key={account.id}
                      label={account.name}
                      detail={`${account.type === 'CHECKING' ? 'Conta corrente' : 'Poupança'} · ${formatMoney(account.balance)}`}
                      selected={destinationAccountId === account.id}
                      onPress={() => setDestinationAccountId(account.id)}
                      disabled={submitting}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          {type !== 'TRANSFER' && (
            <>
              <Text style={styles.label}>Categoria (opcional)</Text>

              {categories.length === 0 ? (
                <Text style={styles.helperText}>
                  Nenhuma categoria cadastrada.
                </Text>
              ) : (
                <View style={styles.categoryList}>
                  <CategoryButton
                    label="Sem categoria"
                    selected={!categoryId}
                    onPress={() => setCategoryId('')}
                    disabled={submitting}
                  />

                  {categories.map((category) => (
                    <CategoryButton
                      key={category.id}
                      label={category.name}
                      selected={categoryId === category.id}
                      onPress={() => setCategoryId(category.id)}
                      disabled={submitting}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Importante</Text>
            <Text style={styles.noticeText}>
              O saldo será atualizado pelo servidor depois que a transação for
              salva. Transferências movimentam as duas contas e não representam
              receita nem despesa no resumo financeiro.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting }}
            onPress={handleSubmit}
            disabled={
              submitting ||
              activeAccounts.length === 0 ||
              (type === 'TRANSFER' && availableDestinations.length === 0)
            }
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              (submitting ||
                activeAccounts.length === 0 ||
                (type === 'TRANSFER' &&
                  availableDestinations.length === 0)) &&
                styles.buttonDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Salvar transação
              </Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            disabled={submitting}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TypeButton({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.typeButton,
        selected && styles.typeButtonSelected,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        style={[
          styles.typeButtonText,
          selected && styles.typeButtonTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function OptionButton({
  label,
  detail,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.optionButton,
        selected && styles.optionButtonSelected,
      ]}
    >
      <View style={styles.optionTextContainer}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDetail}>{detail}</Text>
      </View>

      <View
        style={[
          styles.radio,
          selected && styles.radioSelected,
        ]}
      >
        {selected && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
}

function CategoryButton({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.categoryButton,
        selected && styles.categoryButtonSelected,
      ]}
    >
      <Text
        style={[
          styles.categoryButtonText,
          selected && styles.categoryButtonTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 14,
    color: COLORS.secondary,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 10,
    marginBottom: 20,
    color: COLORS.secondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  backButtonText: {
    fontSize: 32,
    lineHeight: 36,
    color: COLORS.primary,
    marginTop: -4,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: COLORS.primary,
    marginBottom: 4,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.secondary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    marginTop: 20,
    marginBottom: 9,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  typeButtonSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  typeButtonTextSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  amountContainer: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: '#FCFCFA',
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    fontSize: 29,
    fontWeight: '800',
    color: COLORS.text,
  },
  helperText: {
    marginTop: 7,
    fontSize: 12,
    color: COLORS.secondary,
    lineHeight: 18,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#FCFCFA',
  },
  optionsList: {
    gap: 9,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 66,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  optionButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  optionTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  optionDetail: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.secondary,
  },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#AAB4AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: COLORS.surface,
  },
  categoryButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  categoryButtonTextSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  warningText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.danger,
  },
  notice: {
    marginTop: 24,
    padding: 14,
    borderRadius: 13,
    backgroundColor: '#F2F5EF',
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 5,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.secondary,
  },
  primaryButton: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    marginTop: 10,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  cancelButtonText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
});