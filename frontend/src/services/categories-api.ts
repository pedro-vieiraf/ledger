import { apiRequest } from './api';

export interface Category {
  id: string;
  name: string;
}

export interface CreateCategoryInput {
  name: string;
}

export function getCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/categories');
}

export function getCategory(id: string): Promise<Category> {
  return apiRequest<Category>(`/categories/${id}`);
}

export function createCategory(
  input: CreateCategoryInput,
): Promise<Category> {
  return apiRequest<Category>('/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function updateCategory(
  id: string,
  input: CreateCategoryInput,
): Promise<Category> {
  return apiRequest<Category>(`/categories/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export function deleteCategory(id: string): Promise<void> {
  return apiRequest<void>(`/categories/${id}`, {
    method: 'DELETE',
  });
}