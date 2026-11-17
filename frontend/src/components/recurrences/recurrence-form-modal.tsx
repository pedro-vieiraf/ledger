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
import { SymbolView } from 'expo-symbols';

import DatePickerField from '@/components/date-picker-field';
import {
  desktopColors,
} from '@/components/desktop/desktop-theme';
import {
  DesktopFormActions,
  DesktopFormField,
  DesktopFormModal,
  DesktopFormSelect,
  desktopFormStyles,
} from '@/components/desktop/forms/desktop-form';
import { CurrencyInput } from '@/components/currency-input';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import {
  FREQUENCY_OPTIONS,
  RECURRENCE_COLORS as COLORS,
  frequencyLabel,
  todayDateInput,
} from '@/components/recurrences/recurrence-utils';
import { useFeedback } from '@/contexts/feedback-context';
import { useRecurrences } from '@/contexts/recurrences-context';
import type { Account } from '@/services/accounts-api';
import type { Category } from '@/services/categories-api';
import type {
  CreateRecurrenceInput,
  Recurrence,
  RecurrenceFrequency,
  RecurrenceType,
  UpdateRecurrenceInput,
} from '@/services/recurrences-api';
import {
  formatIsoDate,
  parseLocalDate,
  toIsoDate,
} from '@/utils/date-time';

type RecurrenceForm = {
  type: RecurrenceType;
  amount: number;
  description: string;
  accountId: string;
  categoryId: string;
  frequency: RecurrenceFrequency;
  startDate: string;
};

type RecurrenceFormModalProps = {
  recurrence?: Recurrence;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onSaved?: () => void;
  variant?: 'mobile' | 'desktop';
};

const TYPE_OPTIONS: { label: string; value: RecurrenceType }[] = [
  { label: 'Despesa', value: 'EXPENSE' },
  { label: 'Receita', value: 'INCOME' },
];

const CHECK_ICON = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
} as const;

function SelectionCheck({
  selected,
  isDesktop,
}: {
  selected: boolean;
  isDesktop: boolean;
}) {
  if (isDesktop) {
    return selected ? (
      <SymbolView name={CHECK_ICON} size={14} tintColor={COLORS.primary} />
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

type FormFieldProps = {
  label: string;
  hint?: string;
  full?: boolean;
  isDesktop: boolean;
  children: ReactNode;
};

/** Campo compartilhado; no desktop usa a célula do grid e a tipografia do tema. */
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

export function RecurrenceFormModal({
  recurrence,
  accounts,
  categories,
  onClose,
  onSaved,
  variant = 'mobile',
}: RecurrenceFormModalProps) {
  const { showToast } = useFeedback();
  const { createRecurrence, updateRecurrence } = useRecurrences();
  const isEditing = Boolean(recurrence);
  const isDesktop = variant === 'desktop';

  const [form, setForm] = useState<RecurrenceForm>(() => ({
    type: recurrence?.type ?? 'EXPENSE',
    amount: recurrence?.amount ?? 0,
    description: recurrence?.description ?? '',
    accountId: recurrence?.accountId ?? accounts[0]?.id ?? '',
    categoryId: recurrence?.categoryId ?? '',
    frequency: recurrence?.frequency ?? 'MONTHLY',
    startDate: recurrence?.startDate
      ? formatIsoDate(recurrence.startDate)
      : todayDateInput(),
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [openSelector, setOpenSelector] = useState<
    'account' | 'category' | null
  >(null);
  const savingRef = useRef(false);

  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }));

  const categoryOptions = [
    ...(isEditing ? [] : [{ value: '', label: 'Sem categoria' }]),
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];

  const formAccount = accounts.find(
    (account) => account.id === form.accountId,
  );

  function updateForm<K extends keyof RecurrenceForm>(
    key: K,
    value: RecurrenceForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (savingRef.current) {
      return;
    }

    setFormError(null);

    if (!Number.isFinite(form.amount) || form.amount <= 0) {
      setFormError('Informe um valor maior que zero.');
      return;
    }

    if (!isEditing) {
      if (!form.accountId) {
        setFormError('Selecione uma conta ativa.');
        return;
      }

      const startDate = parseLocalDate(form.startDate);

      if (!startDate) {
        setFormError('Informe uma data inicial válida (DD/MM/AAAA).');
        return;
      }
    }

    setSaving(true);
    savingRef.current = true;

    try {
      if (recurrence) {
        const input: UpdateRecurrenceInput = {
          amount: form.amount,
          description: form.description.trim(),
        };

        // A API não permite remover a categoria; envie apenas quando houver
        // uma categoria selecionada.
        if (form.categoryId) {
          input.categoryId = form.categoryId;
        }

        await updateRecurrence(recurrence.id, input);

        showToast({
          variant: 'success',
          title: isDesktop ? 'Assinatura atualizada' : 'Recorrência atualizada',
          message: 'As próximas ocorrências usarão os novos dados.',
        });
      } else {
        const startDate = parseLocalDate(form.startDate);

        if (!startDate) {
          setFormError('Informe uma data inicial válida (DD/MM/AAAA).');
          return;
        }

        const input: CreateRecurrenceInput = {
          amount: form.amount,
          currency: 'BRL',
          type: form.type,
          description: form.description.trim() || null,
          accountId: form.accountId,
          categoryId: form.categoryId || null,
          frequency: form.frequency,
          startDate: toIsoDate(startDate),
        };

        await createRecurrence(input);

        showToast({
          variant: 'success',
          title: isDesktop ? 'Assinatura criada' : 'Recorrência criada',
          message: 'As ocorrências serão geradas automaticamente.',
        });
      }

      onSaved?.();
      onClose();
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível salvar a recorrência.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const fields = (
    <>
      {isEditing ? (
        <Notice isDesktop={isDesktop}>
          Tipo, conta, frequência e data inicial não podem ser alterados. Para
          mudar esses dados, encerre a assinatura e crie outra.
        </Notice>
      ) : (
        <FormField label="Tipo" isDesktop={isDesktop} full>
          <View
            style={isDesktop ? desktopFormStyles.optionRow : styles.optionRow}
          >
            {TYPE_OPTIONS.map((option) => {
              const selected = form.type === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => updateForm('type', option.value)}
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
                          selected &&
                            option.value === 'INCOME' &&
                            styles.incomeOptionSelected,
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
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>
      )}

      <FormField label="Valor" isDesktop={isDesktop}>
        <CurrencyInput
          value={form.amount}
          onChangeValue={(value) => updateForm('amount', value)}
          style={isDesktop ? desktopFormStyles.input : styles.input}
          accessibilityLabel="Valor da recorrência"
        />
      </FormField>

      <FormField label="Descrição" isDesktop={isDesktop}>
        <TextInput
          value={form.description}
          onChangeText={(value) => updateForm('description', value)}
          placeholder="Ex.: Aluguel, salário, streaming..."
          placeholderTextColor={
            isDesktop ? desktopColors.textMuted : COLORS.secondary
          }
          style={isDesktop ? desktopFormStyles.input : styles.input}
          maxLength={160}
          accessibilityLabel="Descrição da recorrência"
        />
      </FormField>

      {isEditing ? null : (
        <>
          <FormField label="Frequência" isDesktop={isDesktop} full>
            <View
              style={
                isDesktop ? desktopFormStyles.chipRow : styles.chipRow
              }
            >
              {FREQUENCY_OPTIONS.map((option) => {
                const selected = form.frequency === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => updateForm('frequency', option.value)}
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
          </FormField>

          <FormField label="Data inicial" isDesktop={isDesktop}>
            <DatePickerField
              value={form.startDate}
              onChange={(value) => updateForm('startDate', value)}
              accessibilityLabel="Data inicial da recorrência"
              variant={isDesktop ? 'desktop' : 'mobile'}
            />
          </FormField>

          <FormField label="Conta" isDesktop={isDesktop}>
            {accounts.length === 0 ? (
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
                {accounts.map((account) => {
                  const selected = form.accountId === account.id;

                  return (
                    <Pressable
                      key={account.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => updateForm('accountId', account.id)}
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
                                selected &&
                                  styles.selectionOptionTextSelected,
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
        </>
      )}

      <FormField
        label="Categoria"
        hint={
          isEditing
            ? 'A categoria atual é mantida se você não selecionar outra.'
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
          {!isEditing && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: form.categoryId === '' }}
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
              Nenhuma categoria cadastrada. Você pode salvar sem categoria.
            </Text>
          )}
        </View>
      </FormField>
    </>
  );

  const desktopFields = (
    <>
      <DesktopFormField
        label="Tipo"
        hint={
          isEditing
            ? 'Tipo, conta, frequência e data inicial não podem ser alterados. Para mudar esses dados, encerre a assinatura e crie outra.'
            : undefined
        }
      >
        <View style={desktopFormStyles.optionRow}>
          {TYPE_OPTIONS.map((option) => {
            const selected = form.type === option.value;
            const typeDisabled = isEditing || saving;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: typeDisabled }}
                disabled={typeDisabled}
                onPress={() => {
                  updateForm('type', option.value);
                  setOpenSelector(null);
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
                  {option.label}
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
            accessibilityLabel="Valor da recorrência"
            editable={!saving}
          />
        </DesktopFormField>

        <DesktopFormField
          label="Descrição"
          style={desktopFormStyles.fieldHalf}
        >
          <TextInput
            value={form.description}
            onChangeText={(value) => updateForm('description', value)}
            onFocus={() => setOpenSelector(null)}
            placeholder="Ex.: Aluguel, salário, streaming..."
            placeholderTextColor={desktopColors.textMuted}
            style={desktopFormStyles.input}
            maxLength={160}
            accessibilityLabel="Descrição da recorrência"
            editable={!saving}
          />
        </DesktopFormField>
      </View>

      <View style={desktopFormStyles.gridRow}>
        <DesktopFormField label="Conta" style={desktopFormStyles.fieldHalf}>
          {isEditing ? (
            <View style={desktopFormStyles.readonlyField}>
              <Text
                numberOfLines={1}
                style={desktopFormStyles.readonlyValue}
              >
                {formAccount?.name ?? 'Conta não encontrada'}
              </Text>
            </View>
          ) : accounts.length === 0 ? (
            <Text style={desktopFormStyles.noOptionsText}>
              Nenhuma conta ativa disponível.
            </Text>
          ) : (
            <DesktopFormSelect
              value={form.accountId}
              options={accountOptions}
              onChange={(value) => {
                setOpenSelector(null);
                updateForm('accountId', value);
              }}
              accessibilityLabel="Selecionar conta da assinatura"
              placeholder="Selecione a conta"
              searchPlaceholder="Pesquisar conta..."
              emptyLabel="Nenhuma conta encontrada."
              disabled={saving}
              open={openSelector === 'account'}
              onOpenChange={(open) =>
                setOpenSelector(open ? 'account' : null)
              }
            />
          )}
        </DesktopFormField>

        <DesktopFormField
          label="Categoria"
          hint={
            isEditing
              ? 'A categoria atual é mantida se você não selecionar outra.'
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
            accessibilityLabel="Selecionar categoria da assinatura"
            placeholder="Sem categoria"
            searchPlaceholder="Pesquisar categoria..."
            emptyLabel={
              categories.length === 0
                ? 'Nenhuma categoria cadastrada.'
                : 'Nenhuma categoria encontrada.'
            }
            disabled={saving}
            open={openSelector === 'category'}
            onOpenChange={(open) => setOpenSelector(open ? 'category' : null)}
          />
        </DesktopFormField>
      </View>

      <View style={desktopFormStyles.gridRow}>
        <DesktopFormField
          label="Frequência"
          style={desktopFormStyles.fieldHalf}
        >
          {isEditing ? (
            <View style={desktopFormStyles.readonlyField}>
              <Text style={desktopFormStyles.readonlyValue}>
                {frequencyLabel(form.frequency)}
              </Text>
            </View>
          ) : (
            <View style={desktopFormStyles.chipRow}>
              {FREQUENCY_OPTIONS.map((option) => {
                const selected = form.frequency === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: saving }}
                    disabled={saving}
                    onPress={() => updateForm('frequency', option.value)}
                    style={({ pressed }) => [
                      desktopFormStyles.chip,
                      styles.desktopFrequencyChip,
                      selected && desktopFormStyles.chipSelected,
                      pressed && !selected && desktopFormStyles.chipPressed,
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
          )}
        </DesktopFormField>

        <DesktopFormField
          label="Data inicial"
          style={desktopFormStyles.fieldHalf}
        >
          {isEditing ? (
            <View style={desktopFormStyles.readonlyField}>
              <Text style={desktopFormStyles.readonlyValue}>
                {form.startDate}
              </Text>
            </View>
          ) : (
            <DatePickerField
              value={form.startDate}
              onChange={(value) => updateForm('startDate', value)}
              accessibilityLabel="Data inicial da recorrência"
              variant="desktop"
            />
          )}
        </DesktopFormField>
      </View>
    </>
  );

  const saveLabel = isEditing
    ? 'Salvar alterações'
    : isDesktop
      ? 'Criar assinatura'
      : 'Criar recorrência';

  if (isDesktop) {
    return (
      <DesktopFormModal
        onClose={onClose}
        closeDisabled={saving}
        eyebrow={isEditing ? 'AJUSTAR ASSINATURA' : 'NOVA ASSINATURA'}
        title={isEditing ? 'Editar assinatura' : 'Nova assinatura'}
        description={
          isEditing
            ? 'Atualize o valor, a descrição e a categoria da assinatura.'
            : 'Configure frequência, valor, conta e data inicial.'
        }
        maxWidth={640}
        footer={
          <DesktopFormActions
            onCancel={onClose}
            onSave={() => void handleSave()}
            saveLabel={saveLabel}
            saving={saving}
            cancelDisabled={saving}
            hint="As ocorrências são geradas pelo backend. Transações já geradas não são alteradas ao editar a assinatura."
          />
        }
      >
        {desktopFields}

        {formError ? (
          <InlineFeedback
            message={formError}
            variant="error"
            style={styles.feedback}
          />
        ) : null}
      </DesktopFormModal>
    );
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>
                {isEditing ? 'AJUSTAR REGRA' : 'NOVA RECORRÊNCIA'}
              </Text>
              <Text style={styles.title}>
                {isEditing ? 'Editar recorrência' : 'Adicionar recorrência'}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar formulário"
              onPress={onClose}
              disabled={saving}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {fields}

            {formError ? (
              <InlineFeedback
                message={formError}
                variant="error"
                style={styles.feedback}
              />
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => void handleSave()}
              disabled={saving}
              style={[styles.saveButton, saving && styles.disabled]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>{saveLabel}</Text>
              )}
            </Pressable>

            <Text style={styles.disclaimer}>
              As ocorrências são geradas pelo backend. Transações já geradas
              não são alteradas ao editar a regra.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboard: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeButtonText: {
    color: COLORS.secondary,
    fontSize: 22,
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  readOnlyNotice: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  readOnlyNoticeText: {
    color: COLORS.primary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
  },
  fieldHint: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  input: {
    minHeight: 48,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: COLORS.text,
    fontSize: 14,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeOptionSelected: {
    backgroundColor: COLORS.expenseBackground,
    borderColor: COLORS.expense,
  },
  incomeOptionSelected: {
    backgroundColor: COLORS.incomeBackground,
    borderColor: COLORS.income,
  },
  typeOptionText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  typeOptionTextSelected: {
    color: COLORS.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
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
  selectionList: {
    gap: 8,
  },
  selectionOption: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  selectionOptionSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  selectionOptionText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  selectionOptionTextSelected: {
    color: COLORS.primary,
  },
  selectionCheck: {
    color: 'transparent',
    fontSize: 13,
    fontWeight: '800',
  },
  selectionCheckSelected: {
    color: COLORS.primary,
  },
  noOptionsText: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  feedback: {
    marginTop: 18,
  },
  saveButton: {
    minHeight: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  desktopFrequencyChip: {
    paddingHorizontal: 11,
  },
  disclaimer: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 18,
  },
});
