import { useRef, useState } from 'react';
import { TextInput } from 'react-native';

import { desktopColors } from '@/components/desktop/desktop-theme';
import {
  DesktopFormActions,
  DesktopFormField,
  DesktopFormModal,
  desktopFormStyles,
} from '@/components/desktop/forms/desktop-form';
import { InlineFeedback } from '@/components/feedback/inline-feedback';
import type { Category } from '@/services/categories-api';
import {
  validateCategoryForm,
  type CategoryFormValues,
} from '@/utils/categories';

export type DesktopCategoryFormMode = 'create' | 'edit';

type DesktopCategoryFormModalProps = {
  mode: DesktopCategoryFormMode;
  category?: Category | null;
  categories: Category[];
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

/**
 * Formulário desktop de criação/edição de categoria.
 *
 * Reutiliza a validação compartilhada e delega as operações ao chamador, que
 * mantém a lista e os toasts no padrão das demais páginas desktop.
 */
export function DesktopCategoryFormModal({
  mode,
  category,
  categories,
  onClose,
  onSubmit,
}: DesktopCategoryFormModalProps) {
  const mutationInProgressRef = useRef(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<CategoryFormValues>({
    name: mode === 'edit' && category ? category.name : '',
  });

  function closeForm() {
    if (saving) {
      return;
    }

    onClose();
  }

  async function saveCategory() {
    if (mutationInProgressRef.current) {
      return;
    }

    const validationError = validateCategoryForm(form, {
      categories,
      editingCategoryId: mode === 'edit' ? category?.id : null,
    });

    if (validationError) {
      setFormError(validationError);
      return;
    }

    mutationInProgressRef.current = true;
    setSaving(true);
    setFormError('');

    try {
      await onSubmit(form.name.trim());
      onClose();
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível salvar a categoria.',
      );
    } finally {
      mutationInProgressRef.current = false;
      setSaving(false);
    }
  }

  return (
    <DesktopFormModal
      onClose={closeForm}
      closeDisabled={saving}
      eyebrow="CATEGORIA"
      title={mode === 'edit' ? 'Editar categoria' : 'Nova categoria'}
      description={
        mode === 'edit'
          ? 'Atualize o nome da categoria.'
          : 'Informe um nome para identificar a categoria.'
      }
      maxWidth={460}
      footer={
        <DesktopFormActions
          onCancel={closeForm}
          onSave={() => void saveCategory()}
          saveLabel={
            mode === 'edit' ? 'Salvar alterações' : 'Criar categoria'
          }
          saving={saving}
          cancelDisabled={saving}
        />
      }
    >
      <DesktopFormField label="Nome da categoria">
        <TextInput
          accessibilityLabel="Nome da categoria"
          value={form.name}
          onChangeText={(name) => {
            setForm({ name });
            setFormError('');
          }}
          placeholder="Ex.: Alimentação"
          placeholderTextColor={desktopColors.textMuted}
          style={desktopFormStyles.input}
          autoCapitalize="sentences"
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={() => void saveCategory()}
          editable={!saving}
          autoFocus
        />
      </DesktopFormField>

      {formError ? (
        <InlineFeedback
          message={formError}
          variant="error"
          style={desktopFormStyles.feedback}
        />
      ) : null}
    </DesktopFormModal>
  );
}
