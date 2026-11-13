import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import {
  formatDateParts,
  formatTimeParts,
  parseLocalDateTime,
} from '@/utils/date-time';

const FIELD_ICONS = {
  date: {
    ios: 'calendar',
    android: 'calendar_month',
    web: 'calendar_month',
  },
  time: {
    ios: 'clock',
    android: 'schedule',
    web: 'schedule',
  },
} satisfies Record<PickerMode, SymbolViewProps['name']>;

const COLORS = {
  surface: '#FFFFFF',
  primary: '#1F5B45',
  primaryLight: '#E7F0E9',
  text: '#202720',
  secondary: '#747C73',
  border: '#E7E9E2',
  overlay: 'rgba(32, 39, 32, 0.45)',
};

export interface DateTimePickerFieldsProps {
  /** Variante visual; no desktop aplica a tipografia e as medidas do tema. */
  variant?: 'mobile' | 'desktop';
  /** Data atual do formulário, no formato `DD/MM/AAAA`. */
  date: string;
  /** Hora atual do formulário, no formato `HH:mm`. */
  time: string;
  /** Chamado com a nova data, sempre em `DD/MM/AAAA`. */
  onDateChange: (value: string) => void;
  /** Chamado com a nova hora, sempre em `HH:mm`. */
  onTimeChange: (value: string) => void;
}

type PickerMode = 'date' | 'time';

function getFieldValue(date: string, time: string, mode: PickerMode, fallback: Date) {
  if (mode === 'date') {
    return parseLocalDateTime(date, '00:00') ?? fallback;
  }

  return parseLocalDateTime(date, time) ?? fallback;
}

/**
 * Campos de data e hora que abrem o seletor nativo ao toque.
 *
 * No Android, o `@expo/ui` apresenta diálogos Material 3 (calendário e
 * relógio). No iOS, o picker do SwiftUI é sempre embutido na hierarquia,
 * então é mostrado dentro de uma folha com Confirmar/Cancelar.
 */
export default function DateTimePickerFields(
    {
      date,
      time,
      onDateChange,
      onTimeChange,
    }: DateTimePickerFieldsProps,
) {
  const [activePicker, setActivePicker] = useState<PickerMode | null>(null);
  const [draft, setDraft] = useState<Date>(new Date());

  const now = new Date();
  const currentDate = getFieldValue(date, time, 'date', now);
  const currentTime = getFieldValue(date, time, 'time', now);

  const openPicker = (mode: PickerMode) => {
    const parsed = parseLocalDateTime(date, time);

    setDraft(parsed ?? (mode === 'date' ? currentDate : currentTime));
    setActivePicker(mode);
  };

  const closePicker = () => {
    setActivePicker(null);
  };

  const confirmDraft = () => {
    const mode = activePicker;

    setActivePicker(null);

    if (mode === 'date') {
      onDateChange(formatDateParts(draft));
    } else if (mode === 'time') {
      onTimeChange(formatTimeParts(draft));
    }
  };

  return (
      <>
        <View style={styles.row}>
          <Pressable
              accessibilityRole="button"
              accessibilityLabel="Selecionar data da transação"
              onPress={() => openPicker('date')}
              style={[styles.field, styles.dateField]}
          >
            <Text style={styles.fieldValue}>
              {date || 'Selecione'}
            </Text>
            <SymbolView
              name={FIELD_ICONS.date}
              size={16}
              tintColor={COLORS.secondary}
              style={styles.fieldIcon}
            />
          </Pressable>

          <Pressable
              accessibilityRole="button"
              accessibilityLabel="Selecionar horário da transação"
              onPress={() => openPicker('time')}
              style={styles.field}
          >
            <Text style={styles.fieldValue}>
              {time || 'Selecione'}
            </Text>
            <SymbolView
              name={FIELD_ICONS.time}
              size={16}
              tintColor={COLORS.secondary}
              style={styles.fieldIcon}
            />
          </Pressable>
        </View>

        {Platform.OS === 'android' && activePicker === 'date' && (
            <DateTimePicker
                value={currentDate}
                mode="date"
                presentation="dialog"
                onValueChange={(_event, selectedDate) => {
                  setActivePicker(null);

                  if (selectedDate) {
                    onDateChange(formatDateParts(selectedDate));
                  }
                }}
                onDismiss={() => setActivePicker(null)}
            />
        )}

        {Platform.OS === 'android' && activePicker === 'time' && (
            <DateTimePicker
                value={currentTime}
                mode="time"
                is24Hour={true}
                presentation="dialog"
                onValueChange={(_event, selectedDate) => {
                  setActivePicker(null);

                  if (selectedDate) {
                    onTimeChange(formatTimeParts(selectedDate));
                  }
                }}
                onDismiss={() => setActivePicker(null)}
            />
        )}

        {Platform.OS === 'ios' && (
            <Modal
                transparent
                visible={activePicker !== null}
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
                  <Text style={styles.iosTitle}>
                    {activePicker === 'date'
                        ? 'Escolha a data'
                        : 'Escolha o horário'}
                  </Text>

                  {activePicker !== null && (
                      <DateTimePicker
                          value={draft}
                          mode={activePicker}
                          display="spinner"
                          accentColor={COLORS.primary}
                          onValueChange={(_event, selectedDate) => {
                            if (selectedDate) {
                              setDraft(selectedDate);
                            }
                          }}
                      />
                  )}

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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  field: {
    flex: 1,
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
  dateField: {
    flex: 2,
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
  iosBackdrop: {
    backgroundColor: 'transparent',
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
