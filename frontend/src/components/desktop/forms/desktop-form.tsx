import { useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import {
  desktopColors,
  desktopFont,
  desktopShadows,
} from '@/components/desktop/desktop-theme';

const CLOSE_ICON = {
  ios: 'xmark',
  android: 'close',
  web: 'close',
} satisfies SymbolViewProps['name'];

const CHEVRON_ICON = {
  ios: 'chevron.down',
  android: 'keyboard_arrow_down',
  web: 'keyboard_arrow_down',
} satisfies SymbolViewProps['name'];

const CHECK_ICON = {
  ios: 'checkmark',
  android: 'check',
  web: 'check',
} satisfies SymbolViewProps['name'];

/** A partir desta quantidade de opções o seletor passa a exibir pesquisa. */
const SELECT_SEARCH_THRESHOLD = 5;

const MODAL_OVERLAY = 'rgba(16, 24, 20, 0.45)';

type DesktopFormModalProps = {
  onClose: () => void;
  closeDisabled?: boolean;
  eyebrow: string;
  title: string;
  description?: string;
  maxWidth?: number;
  children: ReactNode;
  footer?: ReactNode;
  overlay?: ReactNode;
  bodyStyle?: StyleProp<ViewStyle>;
};

/**
 * Estrutura compartilhada dos formulários desktop da Finora.
 *
 * Mantém cabeçalho, área rolável, rodapé de ações e sobreposições no mesmo
 * padrão visual. A lógica de cada formulário continua no componente de origem.
 */
export function DesktopFormModal({
  onClose,
  closeDisabled = false,
  eyebrow,
  title,
  description,
  maxWidth = 760,
  children,
  footer,
  overlay,
  bodyStyle,
}: DesktopFormModalProps) {
  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={() => {
        if (!closeDisabled) {
          onClose();
        }
      }}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar formulário"
          style={StyleSheet.absoluteFill}
          disabled={closeDisabled}
          onPress={onClose}
        />

        <View style={[styles.card, { maxWidth }]}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.title}>{title}</Text>
              {description ? (
                <Text style={styles.description}>{description}</Text>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar formulário"
              disabled={closeDisabled}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && !closeDisabled && styles.closeButtonPressed,
                closeDisabled && styles.disabled,
              ]}
            >
              <SymbolView
                name={CLOSE_ICON}
                size={16}
                tintColor={desktopColors.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={[styles.bodyContent, bodyStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {footer ? <View style={styles.footer}>{footer}</View> : null}

          {overlay}
        </View>
      </View>
    </Modal>
  );
}

type DesktopFormFieldProps = {
  label: string;
  hint?: string;
  full?: boolean;
  /** Aplica o dimensionamento de célula dentro de um `desktopFormStyles.grid`. */
  grid?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Campo com rótulo e dica no padrão tipográfico do desktop. */
export function DesktopFormField({
  label,
  hint,
  full = false,
  grid = false,
  style,
  children,
}: DesktopFormFieldProps) {
  const sized = grid || full;

  return (
    <View
      style={[
        desktopFormStyles.field,
        sized && desktopFormStyles.fieldSized,
        full && desktopFormStyles.fieldFull,
        style,
      ]}
    >
      <Text style={desktopFormStyles.fieldLabel}>{label}</Text>
      {children}
      {hint ? (
        <Text style={desktopFormStyles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

type DesktopFormSelectOption = {
  value: string;
  label: string;
};

type SelectAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SELECT_PANEL_GAP = 6;
const SELECT_PANEL_EDGE = 12;
const SELECT_PANEL_MAX_HEIGHT = 280;
const SELECT_PANEL_MIN_HEIGHT = 120;

type DesktopFormSelectProps = {
  value: string;
  options: DesktopFormSelectOption[];
  onChange: (value: string) => void;
  accessibilityLabel: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  /** Permite que o formulário mantenha apenas um seletor aberto por vez. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Seletor compacto no padrão dos formulários desktop.
 *
 * Exibe apenas o valor escolhido e revela as opções ao abrir. Quando há muitas
 * opções, inclui um campo de pesquisa para reduzir a lista.
 */
export function DesktopFormSelect({
  value,
  options,
  onChange,
  accessibilityLabel,
  placeholder = 'Selecione',
  searchPlaceholder = 'Pesquisar...',
  emptyLabel = 'Nenhuma opção disponível.',
  disabled = false,
  open,
  onOpenChange,
}: DesktopFormSelectProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState<SelectAnchor | null>(null);
  const triggerRef = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();

  const isOpen = open ?? internalOpen;
  const selected = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) =>
        option.label.toLowerCase().includes(normalizedQuery),
      )
    : options;
  const showSearch = options.length >= SELECT_SEARCH_THRESHOLD;

  function setSelectOpen(nextOpen: boolean) {
    if (nextOpen) {
      setQuery('');
    }

    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
  }

  function chooseOption(nextValue: string) {
    onChange(nextValue);
    setSelectOpen(false);
  }

  function toggleSelect() {
    if (isOpen) {
      setSelectOpen(false);
      return;
    }

    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    trigger.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setSelectOpen(true);
    });
  }

  const panelTop = anchor ? anchor.y + anchor.height + SELECT_PANEL_GAP : 0;
  const spaceBelow = anchor ? windowHeight - panelTop - SELECT_PANEL_EDGE : 0;
  const openAbove =
    anchor !== null && spaceBelow < 220 && anchor.y > spaceBelow;
  const panelMaxHeight = anchor
    ? Math.max(
        SELECT_PANEL_MIN_HEIGHT,
        Math.min(
          SELECT_PANEL_MAX_HEIGHT,
          openAbove
            ? anchor.y - SELECT_PANEL_EDGE - SELECT_PANEL_GAP
            : spaceBelow,
        ),
      )
    : SELECT_PANEL_MAX_HEIGHT;

  return (
    <View style={desktopFormStyles.selectWrap}>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: isOpen, disabled }}
        disabled={disabled}
        onPress={toggleSelect}
        style={({ pressed }) => [
          desktopFormStyles.selectTrigger,
          isOpen && desktopFormStyles.selectTriggerOpen,
          pressed && !isOpen && desktopFormStyles.selectTriggerPressed,
          disabled && desktopFormStyles.disabled,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            desktopFormStyles.selectValue,
            !selected && desktopFormStyles.selectPlaceholder,
          ]}
        >
          {selected ? selected.label : placeholder}
        </Text>

        <SymbolView
          name={CHEVRON_ICON}
          size={14}
          tintColor={desktopColors.textMuted}
          style={isOpen ? desktopFormStyles.selectChevronOpen : undefined}
        />
      </Pressable>

      {isOpen && anchor ? (
        <Modal
          transparent
          visible
          animationType="none"
          onRequestClose={() => setSelectOpen(false)}
        >
          <View style={desktopFormStyles.selectOverlay}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar seletor"
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectOpen(false)}
            />

            <View
              style={[
                desktopFormStyles.selectPanel,
                {
                  top: openAbove ? undefined : panelTop,
                  bottom: openAbove
                    ? windowHeight - anchor.y + SELECT_PANEL_GAP
                    : undefined,
                  left: anchor.x,
                  width: anchor.width,
                  maxHeight: panelMaxHeight,
                },
              ]}
            >
              {showSearch ? (
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={desktopColors.textMuted}
                  style={desktopFormStyles.selectSearch}
                  accessibilityLabel={`Pesquisar em ${accessibilityLabel}`}
                />
              ) : null}

              {filteredOptions.length === 0 ? (
                <Text style={desktopFormStyles.selectEmpty}>{emptyLabel}</Text>
              ) : (
                <ScrollView
                  style={desktopFormStyles.selectOptions}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {filteredOptions.map((option) => {
                    const optionSelected = option.value === value;

                    return (
                      <Pressable
                        key={option.value || '__empty__'}
                        accessibilityRole="button"
                        accessibilityState={{ selected: optionSelected }}
                        onPress={() => chooseOption(option.value)}
                        style={({ pressed }) => [
                          desktopFormStyles.selectOption,
                          optionSelected &&
                            desktopFormStyles.selectOptionSelected,
                          pressed &&
                            !optionSelected &&
                            desktopFormStyles.selectOptionPressed,
                        ]}
                      >
                        <Text
                          style={[
                            desktopFormStyles.selectOptionText,
                            optionSelected &&
                              desktopFormStyles.selectOptionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>

                        {optionSelected ? (
                          <SymbolView
                            name={CHECK_ICON}
                            size={14}
                            tintColor={desktopColors.primary}
                            style={desktopFormStyles.selectionCheck}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

type DestructiveAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type DesktopFormActionsProps = {
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
  cancelLabel?: string;
  saving?: boolean;
  savingLabel?: string;
  cancelDisabled?: boolean;
  saveDisabled?: boolean;
  destructiveAction?: DestructiveAction;
  hint?: string;
};

/** Rodapé de ações com cancelar, salvar e ação destrutiva opcional. */
export function DesktopFormActions({
  onCancel,
  onSave,
  saveLabel,
  cancelLabel = 'Cancelar',
  saving = false,
  savingLabel = 'Salvando...',
  cancelDisabled = false,
  saveDisabled = false,
  destructiveAction,
  hint,
}: DesktopFormActionsProps) {
  const actionsDisabled = saving || saveDisabled;

  return (
    <View style={styles.footerRow}>
      {hint ? <Text style={styles.footerHint}>{hint}</Text> : null}

      <View style={styles.footerActions}>
        {destructiveAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: destructiveAction.disabled }}
            disabled={destructiveAction.disabled}
            onPress={destructiveAction.onPress}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed &&
                !destructiveAction.disabled &&
                styles.deleteButtonPressed,
              destructiveAction.disabled && styles.disabled,
            ]}
          >
            <Text style={styles.deleteButtonText}>
              {destructiveAction.label}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saving || cancelDisabled }}
          disabled={saving || cancelDisabled}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && !(saving || cancelDisabled) && styles.secondaryPressed,
            (saving || cancelDisabled) && styles.disabled,
          ]}
        >
          <Text style={styles.secondaryButtonText}>{cancelLabel}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: actionsDisabled, busy: saving }}
          disabled={actionsDisabled}
          onPress={onSave}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && !actionsDisabled && styles.saveButtonPressed,
            actionsDisabled && styles.disabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>{saveLabel}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/** Estilos de campo/opção reutilizados pelos formulários desktop. */
export const desktopFormStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 16,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  fieldHalf: {
    flex: 1,
    minWidth: 0,
  },
  readonlyField: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surfaceMuted,
  },
  readonlyValue: {
    color: desktopColors.textSecondary,
    fontSize: 13,
    fontFamily: desktopFont,
  },
  selectWrap: {
    position: 'relative',
  },
  selectOverlay: {
    flex: 1,
  },
  selectTrigger: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  selectTriggerOpen: {
    borderColor: desktopColors.primary,
  },
  selectTriggerPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  selectValue: {
    flex: 1,
    color: desktopColors.text,
    fontSize: 13,
    fontFamily: desktopFont,
  },
  selectPlaceholder: {
    color: desktopColors.textMuted,
  },
  selectChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  selectPanel: {
    position: 'absolute',
    padding: 6,
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    overflow: 'hidden',
    ...desktopShadows.popover,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  selectSearch: {
    minHeight: 38,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.background,
    color: desktopColors.text,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  selectOptions: {
    maxHeight: 216,
    flexShrink: 1,
  },
  selectOption: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectOptionSelected: {
    backgroundColor: desktopColors.primarySoft,
  },
  selectOptionPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  selectOptionText: {
    flex: 1,
    color: desktopColors.text,
    fontSize: 12,
    fontFamily: desktopFont,
  },
  selectOptionTextSelected: {
    color: desktopColors.primary,
    fontWeight: '700',
  },
  selectEmpty: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    color: desktopColors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: desktopFont,
  },
  field: {
    gap: 7,
  },
  fieldSized: {
    flexGrow: 1,
    flexBasis: 240,
    minWidth: 220,
  },
  fieldFull: {
    flexBasis: '100%',
    minWidth: '100%',
  },
  fieldLabel: {
    color: desktopColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontFamily: desktopFont,
  },
  fieldHint: {
    color: desktopColors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    fontFamily: desktopFont,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    color: desktopColors.text,
    fontSize: 13,
    fontFamily: desktopFont,
  },
  notice: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: desktopColors.primarySoft,
  },
  noticeText: {
    color: desktopColors.primary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: desktopFont,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonSelected: {
    backgroundColor: desktopColors.primarySoft,
    borderColor: desktopColors.primary,
  },
  optionButtonPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  optionButtonText: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  optionButtonTextSelected: {
    color: desktopColors.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  chipSelected: {
    backgroundColor: desktopColors.primary,
    borderColor: desktopColors.primary,
  },
  chipPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  chipText: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: desktopFont,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  selectionList: {
    gap: 7,
  },
  selectionOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  selectionOptionSelected: {
    backgroundColor: desktopColors.primarySoft,
    borderColor: desktopColors.primary,
  },
  selectionOptionPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  selectionOptionText: {
    flex: 1,
    color: desktopColors.text,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: desktopFont,
  },
  selectionOptionTextSelected: {
    color: desktopColors.primary,
    fontWeight: '700',
  },
  selectionCheck: {
    marginLeft: 10,
  },
  noOptionsText: {
    paddingVertical: 5,
    color: desktopColors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: desktopFont,
  },
  feedback: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  disclaimer: {
    color: desktopColors.textMuted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: desktopFont,
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: MODAL_OVERLAY,
  },
  card: {
    width: '100%',
    maxHeight: '88%',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
    ...desktopShadows.popover,
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  heading: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: desktopColors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: desktopFont,
  },
  title: {
    marginTop: 6,
    color: desktopColors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: desktopFont,
  },
  description: {
    marginTop: 5,
    color: desktopColors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: desktopFont,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.surfaceMuted,
  },
  closeButtonPressed: {
    backgroundColor: desktopColors.border,
  },
  body: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  bodyContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerHint: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 180,
    color: desktopColors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    fontFamily: desktopFont,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginLeft: 'auto',
  },
  secondaryButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: desktopColors.border,
    backgroundColor: desktopColors.surface,
  },
  secondaryPressed: {
    backgroundColor: desktopColors.surfaceMuted,
  },
  secondaryButtonText: {
    color: desktopColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  saveButton: {
    minWidth: 120,
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: desktopColors.primary,
  },
  saveButtonPressed: {
    backgroundColor: desktopColors.primaryStrong,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: desktopFont,
  },
  deleteButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: desktopColors.expense,
    backgroundColor: desktopColors.surface,
  },
  deleteButtonPressed: {
    backgroundColor: desktopColors.expenseSoft,
  },
  deleteButtonText: {
    color: desktopColors.expense,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: desktopFont,
  },
  disabled: {
    opacity: 0.6,
  },
});
