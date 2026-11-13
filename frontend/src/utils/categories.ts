import type { Category } from '@/services/categories-api';

export type CategoryFormValues = {
  name: string;
};

export const emptyCategoryForm: CategoryFormValues = {
  name: '',
};

/**
 * Validação do formulário de categoria, compartilhada entre mobile e desktop.
 * Retorna a mensagem de erro ou `null` quando os dados são válidos.
 */
export function validateCategoryForm(
  values: CategoryFormValues,
  options: {
    categories: Pick<Category, 'id' | 'name'>[];
    editingCategoryId?: string | null;
  },
) {
  const name = values.name.trim();

  if (!name) {
    return 'Informe o nome da categoria.';
  }

  const normalizedName = name.toLocaleLowerCase('pt-BR');

  const duplicate = options.categories.some(
    (category) =>
      category.id !== options.editingCategoryId &&
      category.name.toLocaleLowerCase('pt-BR') === normalizedName,
  );

  if (duplicate) {
    return 'Já existe uma categoria com esse nome.';
  }

  return null;
}
