import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { SymbolView } from 'expo-symbols';

import {
  formatDateParts,
  parseLocalDate,
} from '@/utils/date-time';

const COLORS = {
  surface: '#FFFFFF',
  primary: '#1F5B45',
  primaryLight: '#E7F0E9',
  text: '#202720',
  secondary: '#747C73',
  border: '#E7E9E2',
  overlay: 'rgba(32, 39, 32, 0.45)',
};

export interface DatePickerFieldProps {
  /** Data atual no formato `DD/MM/AAAA`. */
  value: string;
  /** Chamado com a nova data, sempre em `DD/MM/AAAA`. */
  onChange: (value: string) => void;
  accessibilityLabel?: string;
  /** Variante visual; no desktop aplica a tipografia e as medidas do tema. */
  variant?: 'mobile' | 'desktop';
}

/**
 * Campo de data única que abre o seletor nativo ao toque.
 */
export default function DatePickerField(
    {
      value,
      onChange,
      accessibilityLabel = 'Selecionar data',
    }: DatePickerFieldProps,
) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draft, setDraft] = useState<Date>(new Date());

  const currentDate = parseLocalDate(value) ?? new Date();

  const openPicker = () => {
    setDraft(currentDate);
    setPickerVisible(true);
  };

  const closePicker = () => {
    setPickerVisible(false);
  };

  const confirmDraft = () => {
    setPickerVisible(false);
    onChange(formatDateParts(draft));
  };

  return (
      <>
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPress={openPicker}
            style={styles.field}
        >
          <Text style={styles.fieldValue}>
            {value || 'Selecione'}
          </Text>
          <SymbolView
              name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
              size={16}
              tintColor={COLORS.secondary}
              style={styles.fieldIcon}
          />
        </Pressable>

        {Platform.OS === 'android' && pickerVisible && (
            <DateTimePicker
                value={currentDate}
                mode="date"
                presentation="dialog"
                onValueChange={(_event, selectedDate) => {
                  setPickerVisible(false);

                  if (selectedDate) {
                    onChange(formatDateParts(selectedDate));
                  }
                }}
                onDismiss={() => setPickerVisible(false)}
            />
        )}

        {Platform.OS === 'ios' && (
            <Modal
                transparent
                visible={pickerVisible}
                animationType="fade"
                onRequestClose={closePicker}
            >
              <View style={styles.iosOverlay}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fechar seleção"
                    style={StyleSheet.absoluteFill}
                    onPress={closePicker}
                />

                <View style={styles.iosSheet}>
                  <Text style={styles.iosTitle}>Escolha a data</Text>

                  <DateTimePicker
                      value={draft}
                      mode="date"
                      display="spinner"
                      accentColor={COLORS.primary}
                      onValueChange={(_event, selectedDate) => {
                        if (selectedDate) {
                          setDraft(selectedDate);
                        }
                      }}
                  />

                  <View style={styles.iosButtons}>
                    <Pressable
                        accessibilityRole="button"
                        onPress={closePicker}
                        style={styles.iosButton}
                    >
                      <Text style={styles.iosButtonCancelText}>
                        Cancelar
                      </Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        onPress={confirmDraft}
                        style={styles.iosButton}
                    >
                      <Text style={styles.iosButtonConfirmText}>
                        Confirmar
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
        )}
      </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 48,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldValue: {
    color: COLORS.text,
    fontSize: 14,
  },
  fieldIcon: {
    marginLeft: 8,
  },
  iosOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.overlay,
  },
  iosSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  iosTitle: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  iosButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  iosButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  iosButtonCancelText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  iosButtonConfirmText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});
