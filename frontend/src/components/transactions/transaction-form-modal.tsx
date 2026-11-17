import { useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { CurrencyInput } from '@/components/currency-input';
import DatePickerField from '@/components/date-picker-field';
import DateTimePickerFields from '@/components/date-time-picker-fields';
import {
  desktopColors,
  desktopFont,
} from '@/components/desktop/desktop-theme';
import {
  DesktopFormActions,
  DesktopFormField,
  DesktopFormModal,
  DesktopFormSelect,
  desktopFormStyles,
} from '@/components/desktop/forms/desktop-form';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import { FREQUENCY_OPTIONS } from '@/components/recurrences/recurrence-utils';
import { useFeedback } from '@/contexts/feedback-context';
import { useRecurrences } from '@/contexts/recurrences-context';
import { useTransactions } from '@/contexts/transactions-context';
import type { Account } from '@/services/accounts-api';
import type { Category } from '@/services/categories-api';
import type { RecurrenceFrequency } from '@/services/recurrences-api';
import type {
  Transaction as ApiTransaction,
  TransactionType as ApiTransactionType,
} from '@/services/transactions-api';
import {
  formatDateParts,
  formatIsoDate,
  getLocalDateTimeParts,
  isSameLocalMinute,
  parseLocalDate,
  parseLocalDateTime,
  toIsoDate,
} from '@/utils/date-time';

export type TransactionFormMode = 'create' | 'edit';

type TransactionFormType = 'income' | 'expense' | 'transfer';

type TransactionForm = {
  type: TransactionFormType;
  amount: number;
  description: string;
  accountId: string;
  destinationAccountId: string;
  categoryId: string;
  date: string;
  time: string;
};

type TransactionFormModalProps = {
  mode: TransactionFormMode;
  transactionId?: string | null;
  accounts: Account[];
  categories: Category[];
  variant?: 'mobile' | 'desktop';
  onClose: () => void;
};

const COLORS = {
  background: '#F7F7F2',
  surface: '#FFFFFF',
  primary: '#1F5B45',
  primaryLight: '#E7F0E9',
  text: '#202720',
  secondary: '#747C73',
  border: '#E7E9E2',
  expense: '#C6534B',
};

const INITIAL_FORM: TransactionForm = {
  type: 'expense',
  amount: 0,
  description: '',
  accountId: '',
  destinationAccountId: '',
  categoryId: '',
  date: '',
  time: '',
};

const TRANSACTION_TYPES: {
  label: string;
  value: TransactionFormType;
}[] = [
  { label: 'Despesa', value: 'expense' },
  { label: 'Receita', value: 'income' },
  { label: 'Transferência', value: 'transfer' },
];

const CHECK_ICON = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
} satisfies SymbolViewProps['name'];

type FormFieldProps = {
  label: string;
  hint?: string;
  full?: boolean;
  isDesktop: boolean;
  children: ReactNode;
};

/**
 * Rótulo + controle no mesmo componente para manter o mobile inalterado e
 * aplicar a célula do grid apenas no desktop.
 */
function FormField({
  label,
  hint,
  full = false,
  isDesktop,
  children,
}: FormFieldProps) {
  if (isDesktop) {
    return (
      <DesktopFormField label={label} hint={hint} full={full} grid>
        {children}
      </DesktopFormField>
    );
  }

  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </>
  );
}

function Notice({
  isDesktop,
  children,
}: {
  isDesktop: boolean;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.readOnlyNotice,
        isDesktop && desktopFormStyles.notice,
      ]}
    >
      <Text
        style={[
          styles.readOnlyNoticeText,
          isDesktop && desktopFormStyles.noticeText,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

function SelectionCheck({
  selected,
  isDesktop,
}: {
  selected: boolean;
  isDesktop: boolean;
}) {
  if (isDesktop) {
    return selected ? (
      <SymbolView
        name={CHECK_ICON}
        size={14}
        tintColor={desktopColors.primary}
        style={desktopFormStyles.selectionCheck}
      />
    ) : null;
  }

  return (
    <Text
      style={[
        styles.selectionCheck,
        selected && styles.selectionCheckSelected,
      ]}
    >
      {selected ? '✓' : ''}
    </Text>
  );
}

function mapTransactionType(type: ApiTransactionType): TransactionFormType {
  switch (type) {
    case 'INCOME':
      return 'income';
    case 'EXPENSE':
      return 'expense';
    case 'TRANSFER':
      return 'transfer';
  }
}

function toApiTransactionType(
  type: TransactionFormType,
): ApiTransactionType {
  switch (type) {
    case 'income':
      return 'INCOME';
    case 'expense':
      return 'EXPENSE';
    case 'transfer':
      return 'TRANSFER';
  }
}

function getDefaultDescription(type: TransactionFormType) {
  if (type === 'income') return 'Receita';
  if (type === 'transfer') return 'Transferência';
  return 'Despesa';
}

function buildInitialForm(
  mode: TransactionFormMode,
  transactionId: string | null | undefined,
  accounts: Account[],
  transactions: ApiTransaction[],
): TransactionForm {
  if (mode === 'edit') {
    const transaction = transactionId
      ? transactions.find((item) => item.id === transactionId)
      : undefined;

    if (!transaction) {
      return INITIAL_FORM;
    }

    return {
      type: mapTransactionType(transaction.type),
      amount: transaction.amount,
      description: transaction.description ?? '',
      accountId: transaction.accountId,
      destinationAccountId: transaction.destinationAccountId ?? '',
      categoryId: transaction.categoryId ?? '',
      ...getLocalDateTimeParts(transaction.timestamp),
    };
  }

  const active = accounts.filter((account) => account.status === 'ACTIVE');

  return {
    ...INITIAL_FORM,
    accountId: active[0]?.id ?? '',
    destinationAccountId:
      active.find((account) => account.id !== active[0]?.id)?.id ?? '',
    date: formatDateParts(new Date()),
  };
}

/**
 * Formulário compartilhado de criação/edição/exclusão de transações.
 *
 * A lógica financeira permanece nos contexts; este componente apenas
 * orquestra o preenchimento, validação e envio dos mesmos fluxos usados
 * pela tela mobile.
 */
export function TransactionFormModal({
  mode,
  transactionId = null,
  accounts,
  categories,
  variant = 'mobile',
  onClose,
}: TransactionFormModalProps) {
  const isDesktop = variant === 'desktop';

  const { showToast } = useFeedback();
  const { createRecurrence } = useRecurrences();
  const {
    transactions: apiTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();

  const [form, setForm] = useState<TransactionForm>(() =>
    buildInitialForm(mode, transactionId, accounts, apiTransactions),
  );
  const [formError, setFormError] = useState<string | null>(() =>
    mode === 'edit' &&
    (!transactionId ||
      !apiTransactions.some((item) => item.id === transactionId))
      ? 'Não foi possível encontrar essa transação nos dados atuais. Atualize a tela e tente novamente.'
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [repeatTransaction, setRepeatTransaction] = useState(false);
  const [repeatFrequency, setRepeatFrequency] =
    useState<RecurrenceFrequency>('MONTHLY');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState(false);
  const [openSelector, setOpenSelector] = useState<
    'account' | 'destination' | 'category' | null
  >(null);
  const savingRef = useRef(false);

  const editingTransactionId = mode === 'edit' ? transactionId : null;

  const editingTransaction = editingTransactionId
    ? apiTransactions.find((item) => item.id === editingTransactionId)
    : undefined;

  const deletingDescription = editingTransaction
    ? editingTransaction.description?.trim() ||
      getDefaultDescription(mapTransactionType(editingTransaction.type))
    : '';

  const activeAccounts = accounts.filter(
    (account) => account.status === 'ACTIVE',
  );

  const accountOptions = activeAccounts.map((account) => ({
    value: account.id,
    label: account.name,
  }));

  const destinationOptions = activeAccounts
    .filter((account) => account.id !== form.accountId)
    .map((account) => ({ value: account.id, label: account.name }));

  const categoryOptions = [
    ...(mode === 'create' ? [{ value: '', label: 'Sem categoria' }] : []),
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];

  const sourceAccount = accounts.find(
    (account) => account.id === form.accountId,
  );

  const destinationAccount = accounts.find(
    (account) => account.id === form.destinationAccountId,
  );

  const selectAccount = (accountId: string) => {
    setOpenSelector(null);
    setForm((current) => ({
      ...current,
      accountId,
      destinationAccountId:
        current.destinationAccountId === accountId
          ? activeAccounts.find((account) => account.id !== accountId)?.id ??
            ''
          : current.destinationAccountId,
    }));
  };

  const updateForm = <K extends keyof TransactionForm>(
    key: K,
    value: TransactionForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const closeModal = () => {
    if (saving || deletingTransaction) return;

    if (deleteConfirmVisible) {
      setDeleteConfirmVisible(false);
      setDeleteError(null);
      return;
    }

    setFormError(null);
    setDeleteConfirmVisible(false);
    setDeleteError(null);
    onClose();
  };

  const handleSave = async () => {
    if (savingRef.current) {
      return;
    }

    setFormError(null);

    const amount = form.amount;

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Informe um valor maior que zero.');
      return;
    }

    // A data só pode ser editada em transações manuais; as importadas do
    // Open Finance mantêm o horário original. Só enviamos o timestamp quando
    // a data/hora realmente muda, para não zerar os segundos à toa.
    let editedTimestamp: string | undefined;

    if (mode === 'edit' && editingTransaction?.source === 'MANUAL') {
      const parsedDateTime = parseLocalDateTime(form.date, form.time);

      if (!parsedDateTime) {
        setFormError(
          'Informe uma data válida (DD/MM/AAAA) e um horário válido (HH:mm).',
        );
        return;
      }

      const originalDateTime = new Date(editingTransaction.timestamp);

      if (
        Number.isNaN(originalDateTime.getTime()) ||
        !isSameLocalMinute(originalDateTime, parsedDateTime)
      ) {
        editedTimestamp = parsedDateTime.toISOString();
      }
    }

    if (mode === 'create') {
      const sourceAccount = activeAccounts.find(
        (account) => account.id === form.accountId,
      );

      if (!sourceAccount) {
        setFormError('Selecione uma conta de origem ativa.');
        return;
      }

      if (
        form.type === 'transfer' &&
        (!form.destinationAccountId ||
          form.destinationAccountId === form.accountId ||
          !activeAccounts.some(
            (account) => account.id === form.destinationAccountId,
          ))
      ) {
        setFormError(
          'Selecione uma conta de destino ativa, diferente da origem.',
        );
        return;
      }
    }

    let recurrenceStartDate: string | undefined;

    if (mode === 'create' && repeatTransaction) {
      if (form.type === 'transfer') {
        setFormError(
          'Transferências não podem ser configuradas como recorrentes.',
        );
        return;
      }

      const parsedDate = parseLocalDate(form.date);

      if (!parsedDate) {
        setFormError('Informe uma data inicial válida (DD/MM/AAAA).');
        return;
      }

      recurrenceStartDate = toIsoDate(parsedDate);
    }

    setSaving(true);
    savingRef.current = true;

    try {
      if (mode === 'create') {
        if (repeatTransaction && recurrenceStartDate) {
          await createRecurrence({
            amount,
            currency: 'BRL',
            type: form.type === 'income' ? 'INCOME' : 'EXPENSE',
            description: form.description.trim() || null,
            accountId: form.accountId,
            categoryId: form.categoryId || null,
            frequency: repeatFrequency,
            startDate: recurrenceStartDate,
          });
        } else {
          await createTransaction({
            amount,
            currency: 'BRL',
            type: toApiTransactionType(form.type),
            description: form.description.trim() || null,
            accountId: form.accountId,
            ...(form.type === 'transfer'
              ? { destinationAccountId: form.destinationAccountId }
              : {}),
            ...(form.type !== 'transfer' && form.categoryId
              ? { categoryId: form.categoryId }
              : {}),
          });
        }
      } else {
        if (!editingTransactionId) {
          throw new Error('Não foi possível identificar a transação.');
        }

        const originalTransaction = apiTransactions.find(
          (transaction) => transaction.id === editingTransactionId,
        );

        if (!originalTransaction) {
          throw new Error(
            'A transação não está mais disponível. Atualize a lista e tente novamente.',
          );
        }

        await updateTransaction(editingTransactionId, {
          amount,
          description: form.description.trim() || null,
          ...(originalTransaction.type !== 'TRANSFER' && form.categoryId
            ? { categoryId: form.categoryId }
            : {}),
          ...(editedTimestamp ? { timestamp: editedTimestamp } : {}),
        });
      }

      onClose();
      setFormError(null);
      setDeleteConfirmVisible(false);
      setDeleteError(null);

      showToast({
        variant: 'success',
        title:
          mode === 'create' && repeatTransaction
            ? 'Recorrência criada'
            : mode === 'create'
              ? 'Transação criada'
              : 'Transação atualizada',
        message:
          mode === 'create' && repeatTransaction
            ? recurrenceStartDate &&
              recurrenceStartDate <= toIsoDate(new Date())
              ? 'A primeira ocorrência será gerada pelo backend em instantes.'
              : `A primeira ocorrência será gerada em ${formatIsoDate(
                  recurrenceStartDate ?? '',
                )}.`
            : 'O saldo foi atualizado pelo servidor.',
      });
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível salvar a transação.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingTransactionId) {
      setFormError(
        'Atualize a lista antes de tentar excluir essa transação.',
      );
      return;
    }

    setDeleteError(null);
    setDeleteConfirmVisible(true);
  };

  const cancelDelete = () => {
    if (deletingTransaction) {
      return;
    }

    setDeleteConfirmVisible(false);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!editingTransactionId || deletingTransaction) {
      return;
    }

    setDeletingTransaction(true);
    setDeleteError(null);

    try {
      await deleteTransaction(editingTransactionId);

      setDeleteConfirmVisible(false);
      setFormError(null);
      setDeleteError(null);
      onClose();

      showToast({
        variant: 'success',
        title: 'Transação excluída',
        message: 'O histórico foi atualizado.',
      });
    } catch (cause) {
      setDeleteError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível excluir a transação. Tente novamente.',
      );
    } finally {
      setDeletingTransaction(false);
    }
  };

  const fields = (
    <>
      {mode === 'create' ? (
        <FormField label="Tipo de transação" isDesktop={isDesktop} full>
          <View
            style={
              isDesktop ? desktopFormStyles.optionRow : styles.optionRow
            }
          >
            {TRANSACTION_TYPES.map((item) => {
              const selected = form.type === item.value;

              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    updateForm('type', item.value);

                    if (item.value === 'transfer') {
                      updateForm('categoryId', '');
                      setRepeatTransaction(false);
                    }
                  }}
                  style={({ pressed }) =>
                    isDesktop
                      ? [
                          desktopFormStyles.optionButton,
                          selected && desktopFormStyles.optionButtonSelected,
                          pressed &&
                            !selected &&
                            desktopFormStyles.optionButtonPressed,
                        ]
                      : [
                          styles.typeOption,
                          selected && styles.typeOptionSelected,
                        ]
                  }
                >
                  <Text
                    style={
                      isDesktop
                        ? [
                            desktopFormStyles.optionButtonText,
                            selected &&
                              desktopFormStyles.optionButtonTextSelected,
                          ]
                        : [
                            styles.typeOptionText,
                            selected && styles.typeOptionTextSelected,
                          ]
                    }
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>
      ) : (
        <Notice isDesktop={isDesktop}>
          Tipo e contas não podem ser alterados nesta versão. Para mudar esses
          dados, exclua a transação e crie outra.
        </Notice>
      )}

      {mode === 'create' && form.type === 'transfer' ? (
        <Text
          style={[
            styles.fieldHint,
            isDesktop && desktopFormStyles.fieldHint,
            isDesktop && desktopFormStyles.fieldFull,
          ]}
        >
          Transferências não podem ser configuradas como recorrentes.
        </Text>
      ) : null}

      <FormField label="Valor" isDesktop={isDesktop}>
        <CurrencyInput
          value={form.amount}
          onChangeValue={(value) => updateForm('amount', value)}
          style={isDesktop ? desktopFormStyles.input : styles.formInput}
          accessibilityLabel="Valor da transação em reais"
        />
      </FormField>

      <FormField label="Descrição" isDesktop={isDesktop}>
        <TextInput
          value={form.description}
          onChangeText={(value) => updateForm('description', value)}
          placeholder="Ex.: Mercado, salário, aluguel..."
          placeholderTextColor={
            isDesktop ? desktopColors.textMuted : COLORS.secondary
          }
          style={isDesktop ? desktopFormStyles.input : styles.formInput}
          maxLength={160}
          accessibilityLabel="Descrição da transação"
        />
      </FormField>

      {mode === 'edit' &&
        (editingTransaction?.source === 'MANUAL' ? (
          <FormField
            label="Data e hora"
            hint="Alterar a data e o horário não muda o valor da transação, apenas quando ela aconteceu."
            isDesktop={isDesktop}
          >
            <DateTimePickerFields
              date={form.date}
              time={form.time}
              onDateChange={(value) => updateForm('date', value)}
              onTimeChange={(value) => updateForm('time', value)}
              variant={isDesktop ? 'desktop' : 'mobile'}
            />
          </FormField>
        ) : (
          <Notice isDesktop={isDesktop}>
            A data desta transação foi definida pelo Open Finance e não pode
            ser alterada.
          </Notice>
        ))}

      {mode === 'create' && (
        <FormField
          label={form.type === 'transfer' ? 'Conta de origem' : 'Conta'}
          isDesktop={isDesktop}
        >
          {activeAccounts.length === 0 ? (
            <Text
              style={
                isDesktop
                  ? desktopFormStyles.noOptionsText
                  : styles.noOptionsText
              }
            >
              Nenhuma conta ativa disponível.
            </Text>
          ) : (
            <View
              style={
                isDesktop
                  ? desktopFormStyles.selectionList
                  : styles.selectionList
              }
            >
              {activeAccounts.map((account) => {
                const selected = form.accountId === account.id;

                return (
                  <Pressable
                    key={account.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      updateForm('accountId', account.id);

                      if (form.destinationAccountId === account.id) {
                        updateForm(
                          'destinationAccountId',
                          activeAccounts.find(
                            (item) => item.id !== account.id,
                          )?.id ?? '',
                        );
                      }
                    }}
                    style={({ pressed }) =>
                      isDesktop
                        ? [
                            desktopFormStyles.selectionOption,
                            selected &&
                              desktopFormStyles.selectionOptionSelected,
                            pressed &&
                              !selected &&
                              desktopFormStyles.selectionOptionPressed,
                          ]
                        : [
                            styles.selectionOption,
                            selected && styles.selectionOptionSelected,
                          ]
                    }
                  >
                    <Text
                      style={
                        isDesktop
                          ? [
                              desktopFormStyles.selectionOptionText,
                              selected &&
                                desktopFormStyles.selectionOptionTextSelected,
                            ]
                          : [
                              styles.selectionOptionText,
                              selected && styles.selectionOptionTextSelected,
                            ]
                      }
                    >
                      {account.name}
                    </Text>
                    <SelectionCheck
                      selected={selected}
                      isDesktop={isDesktop}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </FormField>
      )}

      {mode === 'create' && form.type === 'transfer' ? (
        <FormField label="Conta de destino" isDesktop={isDesktop}>
          <View
            style={
              isDesktop
                ? desktopFormStyles.selectionList
                : styles.selectionList
            }
          >
            {activeAccounts
              .filter((account) => account.id !== form.accountId)
              .map((account) => {
                const selected =
                  form.destinationAccountId === account.id;

                return (
                  <Pressable
                    key={account.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() =>
                      updateForm('destinationAccountId', account.id)
                    }
                    style={({ pressed }) =>
                      isDesktop
                        ? [
                            desktopFormStyles.selectionOption,
                            selected &&
                              desktopFormStyles.selectionOptionSelected,
                            pressed &&
                              !selected &&
                              desktopFormStyles.selectionOptionPressed,
                          ]
                        : [
                            styles.selectionOption,
                            selected && styles.selectionOptionSelected,
                          ]
                    }
                  >
                    <Text
                      style={
                        isDesktop
                          ? [
                              desktopFormStyles.selectionOptionText,
                              selected &&
                                desktopFormStyles.selectionOptionTextSelected,
                            ]
                          : [
                              styles.selectionOptionText,
                              selected && styles.selectionOptionTextSelected,
                            ]
                      }
                    >
                      {account.name}
                    </Text>
                    <SelectionCheck
                      selected={selected}
                      isDesktop={isDesktop}
                    />
                  </Pressable>
                );
              })}
            {activeAccounts.filter(
              (account) => account.id !== form.accountId,
            ).length === 0 && (
              <Text
                style={
                  isDesktop
                    ? desktopFormStyles.noOptionsText
                    : styles.noOptionsText
                }
              >
                Você precisa de pelo menos duas contas ativas para realizar
                uma transferência.
              </Text>
            )}
          </View>
        </FormField>
      ) : null}

      {form.type !== 'transfer' && (
        <FormField
          label="Categoria"
          hint={
            mode === 'edit' && !form.categoryId
              ? 'A transação continuará sem categoria se você não selecionar uma.'
              : undefined
          }
          isDesktop={isDesktop}
        >
          <View
            style={
              isDesktop
                ? desktopFormStyles.selectionList
                : styles.selectionList
            }
          >
            {mode === 'create' && (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  selected: form.categoryId === '',
                }}
                onPress={() => updateForm('categoryId', '')}
                style={({ pressed }) =>
                  isDesktop
                    ? [
                        desktopFormStyles.selectionOption,
                        form.categoryId === '' &&
                          desktopFormStyles.selectionOptionSelected,
                        pressed &&
                          form.categoryId !== '' &&
                          desktopFormStyles.selectionOptionPressed,
                      ]
                    : [
                        styles.selectionOption,
                        form.categoryId === '' &&
                          styles.selectionOptionSelected,
                      ]
                }
              >
                <Text
                  style={
                    isDesktop
                      ? [
                          desktopFormStyles.selectionOptionText,
                          form.categoryId === '' &&
                            desktopFormStyles.selectionOptionTextSelected,
                        ]
                      : [
                          styles.selectionOptionText,
                          form.categoryId === '' &&
                            styles.selectionOptionTextSelected,
                        ]
                  }
                >
                  Sem categoria
                </Text>
                <SelectionCheck
                  selected={form.categoryId === ''}
                  isDesktop={isDesktop}
                />
              </Pressable>
            )}

            {categories.map((category) => {
              const selected = form.categoryId === category.id;

              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => updateForm('categoryId', category.id)}
                  style={({ pressed }) =>
                    isDesktop
                      ? [
                          desktopFormStyles.selectionOption,
                          selected &&
                            desktopFormStyles.selectionOptionSelected,
                          pressed &&
                            !selected &&
                            desktopFormStyles.selectionOptionPressed,
                        ]
                      : [
                          styles.selectionOption,
                          selected && styles.selectionOptionSelected,
                        ]
                  }
                >
                  <Text
                    style={
                      isDesktop
                        ? [
                            desktopFormStyles.selectionOptionText,
                            selected &&
                              desktopFormStyles.selectionOptionTextSelected,
                          ]
                        : [
                            styles.selectionOptionText,
                            selected && styles.selectionOptionTextSelected,
                          ]
                    }
                  >
                    {category.name}
                  </Text>
                  <SelectionCheck
                    selected={selected}
                    isDesktop={isDesktop}
                  />
                </Pressable>
              );
            })}

            {categories.length === 0 && (
              <Text
                style={
                  isDesktop
                    ? desktopFormStyles.noOptionsText
                    : styles.noOptionsText
                }
              >
                Nenhuma categoria cadastrada. Você pode salvar sem categoria e
                cadastrar uma depois.
              </Text>
            )}
          </View>
        </FormField>
      )}

      {mode === 'create' && form.type !== 'transfer' && (
        <View
          style={[
            styles.repeatCard,
            isDesktop && desktopFormStyles.fieldFull,
            isDesktop && styles.desktopRepeatCard,
          ]}
        >
          <View style={styles.repeatHeader}>
            <View style={styles.repeatHeaderText}>
              <Text
                style={[
                  styles.repeatTitle,
                  isDesktop && styles.desktopText,
                ]}
              >
                Repetir transação
              </Text>
              <Text
                style={[
                  styles.repeatDescription,
                  isDesktop && styles.desktopText,
                ]}
              >
                Crie uma regra automática em vez de uma transação avulsa.
              </Text>
            </View>

            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Repetir transação"
              accessibilityState={{ checked: repeatTransaction }}
              onPress={() => setRepeatTransaction((current) => !current)}
              style={[
                styles.switchTrack,
                repeatTransaction && styles.switchTrackOn,
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  repeatTransaction && styles.switchThumbOn,
                ]}
              />
            </Pressable>
          </View>

          {repeatTransaction && (
            <>
              <Text
                style={[
                  styles.fieldLabel,
                  isDesktop && styles.desktopInlineLabel,
                ]}
              >
                Frequência
              </Text>
              <View
                style={
                  isDesktop ? desktopFormStyles.chipRow : styles.repeatChips
                }
              >
                {FREQUENCY_OPTIONS.map((option) => {
                  const selected = repeatFrequency === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setRepeatFrequency(option.value)}
                      style={({ pressed }) =>
                        isDesktop
                          ? [
                              desktopFormStyles.chip,
                              selected && desktopFormStyles.chipSelected,
                              pressed &&
                                !selected &&
                                desktopFormStyles.chipPressed,
                            ]
                          : [
                              styles.chip,
                              selected && styles.chipSelected,
                            ]
                      }
                    >
                      <Text
                        style={
                          isDesktop
                            ? [
                                desktopFormStyles.chipText,
                                selected && desktopFormStyles.chipTextSelected,
                              ]
                            : [
                                styles.chipText,
                                selected && styles.chipTextSelected,
                              ]
                        }
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text
                style={[
                  styles.fieldLabel,
                  isDesktop && styles.desktopInlineLabel,
                ]}
              >
                Data inicial
              </Text>
              <DatePickerField
                value={form.date}
                onChange={(value) => updateForm('date', value)}
                accessibilityLabel="Data inicial da recorrência"
                variant={isDesktop ? 'desktop' : 'mobile'}
              />

              <Text
                style={[
                  styles.fieldHint,
                  isDesktop && desktopFormStyles.fieldHint,
                ]}
              >
                Nenhuma transação avulsa será criada agora. O backend gerará a
                primeira ocorrência na data inicial e as próximas conforme a
                frequência.
              </Text>
            </>
          )}
        </View>
      )}
    </>
  );

  const desktopFields = (
    <>
      <DesktopFormField
        label="Tipo de transação"
        hint={
          mode === 'edit'
            ? 'Tipo e contas não podem ser alterados nesta versão. Para mudar esses dados, exclua a transação e crie outra.'
            : form.type === 'transfer'
              ? 'Transferências não podem ser configuradas como recorrentes.'
              : undefined
        }
      >
        <View style={desktopFormStyles.optionRow}>
          {TRANSACTION_TYPES.map((item) => {
            const selected = form.type === item.value;
            const typeDisabled = mode === 'edit';

            return (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: typeDisabled }}
                disabled={typeDisabled}
                onPress={() => {
                  updateForm('type', item.value);
                  setOpenSelector(null);

                  if (item.value === 'transfer') {
                    updateForm('categoryId', '');
                    setRepeatTransaction(false);
                  }
                }}
                style={({ pressed }) => [
                  desktopFormStyles.optionButton,
                  selected && desktopFormStyles.optionButtonSelected,
                  pressed &&
                    !selected &&
                    !typeDisabled &&
                    desktopFormStyles.optionButtonPressed,
                  typeDisabled && desktopFormStyles.disabled,
                ]}
              >
                <Text
                  style={[
                    desktopFormStyles.optionButtonText,
                    selected && desktopFormStyles.optionButtonTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </DesktopFormField>

      <View style={desktopFormStyles.gridRow}>
        <DesktopFormField label="Valor" style={desktopFormStyles.fieldHalf}>
          <CurrencyInput
            value={form.amount}
            onChangeValue={(value) => updateForm('amount', value)}
            style={desktopFormStyles.input}
            accessibilityLabel="Valor da transação em reais"
            editable={!saving}
          />
        </DesktopFormField>

        <DesktopFormField label="Descrição" style={desktopFormStyles.fieldHalf}>
          <TextInput
            value={form.description}
            onChangeText={(value) => updateForm('description', value)}
            onFocus={() => setOpenSelector(null)}
            placeholder="Ex.: Mercado, salário, aluguel..."
            placeholderTextColor={desktopColors.textMuted}
            style={desktopFormStyles.input}
            maxLength={160}
            accessibilityLabel="Descrição da transação"
            editable={!saving}
          />
        </DesktopFormField>
      </View>

      <View style={desktopFormStyles.gridRow}>
        <DesktopFormField
          label={form.type === 'transfer' ? 'Conta de origem' : 'Conta'}
          style={desktopFormStyles.fieldHalf}
        >
          {mode === 'create' ? (
            activeAccounts.length === 0 ? (
              <Text style={desktopFormStyles.noOptionsText}>
                Nenhuma conta ativa disponível.
              </Text>
            ) : (
              <DesktopFormSelect
                value={form.accountId}
                options={accountOptions}
                onChange={selectAccount}
                accessibilityLabel="Selecionar conta da transação"
                placeholder="Selecione a conta"
                searchPlaceholder="Pesquisar conta..."
                emptyLabel="Nenhuma conta encontrada."
                disabled={saving}
                open={openSelector === 'account'}
                onOpenChange={(open) =>
                  setOpenSelector(open ? 'account' : null)
                }
              />
            )
          ) : (
            <View style={desktopFormStyles.readonlyField}>
              <Text
                numberOfLines={1}
                style={desktopFormStyles.readonlyValue}
              >
                {sourceAccount?.name ?? 'Conta não encontrada'}
              </Text>
            </View>
          )}
        </DesktopFormField>

        {form.type === 'transfer' ? (
          <DesktopFormField
            label="Conta de destino"
            hint={
              destinationOptions.length === 0
                ? 'Você precisa de pelo menos duas contas ativas para realizar uma transferência.'
                : undefined
            }
            style={desktopFormStyles.fieldHalf}
          >
            {mode === 'create' ? (
              <DesktopFormSelect
                value={form.destinationAccountId}
                options={destinationOptions}
                onChange={(value) => {
                  setOpenSelector(null);
                  updateForm('destinationAccountId', value);
                }}
                accessibilityLabel="Selecionar conta de destino"
                placeholder={
                  destinationOptions.length === 0
                    ? 'Nenhuma conta disponível'
                    : 'Selecione a conta'
                }
                searchPlaceholder="Pesquisar conta..."
                emptyLabel="Nenhuma conta de destino disponível."
                disabled={saving || destinationOptions.length === 0}
                open={openSelector === 'destination'}
                onOpenChange={(open) =>
                  setOpenSelector(open ? 'destination' : null)
                }
              />
            ) : (
              <View style={desktopFormStyles.readonlyField}>
                <Text
                  numberOfLines={1}
                  style={desktopFormStyles.readonlyValue}
                >
                  {destinationAccount?.name ?? 'Conta não encontrada'}
                </Text>
              </View>
            )}
          </DesktopFormField>
        ) : (
          <DesktopFormField
            label="Categoria"
            hint={
              mode === 'edit' && !form.categoryId
                ? 'A transação continuará sem categoria se você não selecionar uma.'
                : undefined
            }
            style={desktopFormStyles.fieldHalf}
          >
            <DesktopFormSelect
              value={form.categoryId}
              options={categoryOptions}
              onChange={(value) => {
                setOpenSelector(null);
                updateForm('categoryId', value);
              }}
              accessibilityLabel="Selecionar categoria da transação"
              placeholder="Sem categoria"
              searchPlaceholder="Pesquisar categoria..."
              emptyLabel={
                categories.length === 0
                  ? 'Nenhuma categoria cadastrada.'
                  : 'Nenhuma categoria encontrada.'
              }
              disabled={saving}
              open={openSelector === 'category'}
              onOpenChange={(open) =>
                setOpenSelector(open ? 'category' : null)
              }
            />
          </DesktopFormField>
        )}
      </View>

      {mode === 'edit' &&
        (editingTransaction?.source === 'MANUAL' ? (
          <DesktopFormField
            label="Data e horário"
            hint="Alterar a data e o horário não muda o valor da transação, apenas quando ela aconteceu."
          >
            <DateTimePickerFields
              date={form.date}
              time={form.time}
              onDateChange={(value) => updateForm('date', value)}
              onTimeChange={(value) => updateForm('time', value)}
              variant="desktop"
            />
          </DesktopFormField>
        ) : (
          <Notice isDesktop>
            A data desta transação foi definida pelo Open Finance e não pode ser
            alterada.
          </Notice>
        ))}

      {mode === 'create' && form.type !== 'transfer' ? (
        <View style={styles.repeatCard}>
          <View style={styles.repeatHeader}>
            <View style={styles.repeatHeaderText}>
              <Text style={[styles.repeatTitle, styles.desktopText]}>
                Repetir transação
              </Text>
              <Text style={[styles.repeatDescription, styles.desktopText]}>
                Crie uma regra automática em vez de uma transação avulsa.
              </Text>
            </View>

            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Repetir transação"
              accessibilityState={{ checked: repeatTransaction }}
              onPress={() => setRepeatTransaction((current) => !current)}
              style={[
                styles.switchTrack,
                repeatTransaction && styles.switchTrackOn,
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  repeatTransaction && styles.switchThumbOn,
                ]}
              />
            </Pressable>
          </View>

          {repeatTransaction ? (
            <>
              <Text style={styles.desktopInlineLabel}>Frequência</Text>
              <View style={desktopFormStyles.chipRow}>
                {FREQUENCY_OPTIONS.map((option) => {
                  const selected = repeatFrequency === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setRepeatFrequency(option.value)}
                      style={({ pressed }) => [
                        desktopFormStyles.chip,
                        selected && desktopFormStyles.chipSelected,
                        pressed &&
                          !selected &&
                          desktopFormStyles.chipPressed,
                      ]}
                    >
                      <Text
                        style={[
                          desktopFormStyles.chipText,
                          selected && desktopFormStyles.chipTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.desktopInlineLabel}>Data inicial</Text>
              <DatePickerField
                value={form.date}
                onChange={(value) => updateForm('date', value)}
                accessibilityLabel="Data inicial da recorrência"
                variant="desktop"
              />

              <Text
                style={[
                  desktopFormStyles.fieldHint,
                  styles.desktopRepeatHint,
                ]}
              >
                Nenhuma transação avulsa será criada agora. O backend gerará a
                primeira ocorrência na data inicial e as próximas conforme a
                frequência.
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
    </>
  );

  const feedback = formError ? (
    <InlineFeedback
      message={formError}
      variant="error"
      style={styles.formFeedback}
    />
  ) : null;

  const disclaimer = (
    <Text
      style={[
        styles.modalDisclaimer,
        isDesktop && desktopFormStyles.disclaimer,
      ]}
    >
      Os saldos são atualizados pelo backend após salvar ou excluir uma
      transação.
    </Text>
  );

  const deleteDialog = (
    <ConfirmDialog
      embedded
      visible={deleteConfirmVisible}
      title="Excluir transação?"
      message={
        `Deseja excluir "${deletingDescription}"? Essa operação ` +
        'também reverterá o efeito da transação no saldo da conta, ' +
        'quando aplicável.'
      }
      confirmLabel="Excluir"
      tone="danger"
      loading={deletingTransaction}
      error={deleteError}
      onConfirm={() => void confirmDelete()}
      onCancel={cancelDelete}
    />
  );

  if (isDesktop) {
    return (
      <DesktopFormModal
        onClose={closeModal}
        closeDisabled={saving || deletingTransaction}
        eyebrow={
          mode === 'create'
            ? 'NOVA MOVIMENTAÇÃO'
            : 'DETALHES DA MOVIMENTAÇÃO'
        }
        title={mode === 'create' ? 'Adicionar transação' : 'Editar transação'}
        description={
          mode === 'create'
            ? 'Registre uma receita, despesa ou transferência entre contas.'
            : 'Ajuste os dados permitidos para esta movimentação.'
        }
        maxWidth={820}
        overlay={deleteDialog}
        footer={
          <DesktopFormActions
            onCancel={closeModal}
            onSave={() => void handleSave()}
            saveLabel={
              mode === 'create' ? 'Salvar transação' : 'Salvar alterações'
            }
            saving={saving}
            cancelDisabled={saving || deletingTransaction}
            destructiveAction={
              mode === 'edit' && editingTransactionId
                ? {
                    label: 'Excluir transação',
                    onPress: handleDelete,
                    disabled: saving || deletingTransaction,
                  }
                : undefined
            }
          />
        }
      >
        {desktopFields}
        {feedback}
        {disclaimer}
      </DesktopFormModal>
    );
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeModal}
    >
      <SafeAreaView style={styles.modalSafeArea}>
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalEyebrow}>
                {mode === 'create'
                  ? 'NOVA MOVIMENTAÇÃO'
                  : 'DETALHES DA MOVIMENTAÇÃO'}
              </Text>
              <Text style={styles.modalTitle}>
                {mode === 'create'
                  ? 'Adicionar transação'
                  : 'Editar transação'}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar formulário"
              onPress={closeModal}
              disabled={saving}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {fields}
            {feedback}

            <Pressable
              accessibilityRole="button"
              onPress={() => void handleSave()}
              disabled={saving}
              style={[styles.saveButton, saving && styles.disabledButton]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {mode === 'create'
                    ? 'Salvar transação'
                    : 'Salvar alterações'}
                </Text>
              )}
            </Pressable>

            {mode === 'edit' && editingTransactionId && (
              <Pressable
                accessibilityRole="button"
                onPress={handleDelete}
                disabled={saving || deletingTransaction}
                style={[
                  styles.deleteButton,
                  (saving || deletingTransaction) && styles.disabledButton,
                ]}
              >
                <Text style={styles.deleteButtonText}>
                  Excluir transação
                </Text>
              </Pressable>
            )}

            {disclaimer}
          </ScrollView>

          {deleteDialog}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalKeyboard: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalEyebrow: {
    color: COLORS.secondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '800',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeButtonText: {
    color: COLORS.text,
    fontSize: 26,
    lineHeight: 29,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 9,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeOptionText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  typeOptionTextSelected: {
    color: '#FFFFFF',
  },
  formInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: COLORS.text,
    fontSize: 14,
  },
  readOnlyNotice: {
    backgroundColor: COLORS.primaryLight,
    padding: 13,
    borderRadius: 12,
  },
  readOnlyNoticeText: {
    color: COLORS.primary,
    fontSize: 12,
    lineHeight: 18,
  },
  selectionList: {
    gap: 7,
  },
  selectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  selectionOptionSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  selectionOptionText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
  },
  selectionOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  selectionCheck: {
    color: 'transparent',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 10,
  },
  selectionCheckSelected: {
    color: COLORS.primary,
  },
  noOptionsText: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: 5,
  },
  repeatCard: {
    marginTop: 22,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  repeatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  repeatHeaderText: {
    flex: 1,
  },
  repeatTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  repeatDescription: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  repeatChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  switchTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    padding: 3,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: COLORS.primary,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  fieldHint: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },
  formFeedback: {
    marginTop: 18,
  },
  desktopRepeatCard: {
    marginTop: 0,
  },
  desktopInlineLabel: {
    marginTop: 16,
    marginBottom: 7,
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  desktopText: {
    fontFamily: desktopFont,
  },
  desktopRepeatHint: {
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 50,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.6,
  },
  deleteButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.expense,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: COLORS.expense,
    fontSize: 13,
    fontWeight: '700',
  },
  modalDisclaimer: {
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 18,
  },
});
