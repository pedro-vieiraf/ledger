package com.pedro.ledger.application.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pedro.ledger.domain.category.Category;
import com.pedro.ledger.domain.category.CategoryRepository;
import com.pedro.ledger.domain.category.CategoryNotFoundException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CategoryApplicationServiceTest {

  @Mock
  private CategoryRepository categoryRepository;

  private CategoryApplicationService service;

  @BeforeEach
  void setUp() {
    service = new CategoryApplicationService(categoryRepository);
  }

  @Test
  void shouldCreateCategory() {
    Category category = Category.create("Food");

    when(categoryRepository.save(any(Category.class)))
        .thenReturn(category);

    Category result = service.create("Food");

    assertThat(result)
        .isSameAs(category);

    assertThat(result.getName())
        .isEqualTo("Food");

    verify(categoryRepository)
        .save(any(Category.class));
  }

  @Test
  void shouldFindAllCategories() {
    Category food = Category.create("Food");
    Category entertainment = Category.create("Entertainment");

    when(categoryRepository.findAll())
        .thenReturn(List.of(
            food,
            entertainment
        ));

    List<Category> result = service.findAll();

    assertThat(result)
        .containsExactly(
            food,
            entertainment
        );

    verify(categoryRepository)
        .findAll();
  }

  @Test
  void shouldReturnEmptyListWhenThereAreNoCategories() {
    when(categoryRepository.findAll())
        .thenReturn(List.of());

    List<Category> result = service.findAll();

    assertThat(result)
        .isEmpty();

    verify(categoryRepository)
        .findAll();
  }

  @Test
  void shouldFindCategoryById() {
    UUID id = UUID.randomUUID();

    Category category = Category.restore(
        id,
        "Food"
    );

    when(categoryRepository.findById(id))
        .thenReturn(Optional.of(category));

    Optional<Category> result = service.findById(id);

    assertThat(result)
        .isPresent()
        .containsSame(category);

    verify(categoryRepository)
        .findById(id);
  }

  @Test
  void shouldReturnEmptyWhenCategoryIsNotFound() {
    UUID id = UUID.randomUUID();

    when(categoryRepository.findById(id))
        .thenReturn(Optional.empty());

    Optional<Category> result = service.findById(id);

    assertThat(result)
        .isEmpty();

    verify(categoryRepository)
        .findById(id);
  }

  @Test
  void shouldUpdateCategoryName() {
    UUID id = UUID.randomUUID();

    Category category = Category.restore(
        id,
        "Food"
    );

    when(categoryRepository.findById(id))
        .thenReturn(Optional.of(category));

    when(categoryRepository.save(category))
        .thenReturn(category);

    Category result = service.update(
        id,
        "Groceries"
    );

    assertThat(result)
        .isSameAs(category);

    assertThat(result.getName())
        .isEqualTo("Groceries");

    verify(categoryRepository)
        .findById(id);

    verify(categoryRepository)
        .save(category);
  }

  @Test
  void shouldThrowWhenUpdatingCategoryThatDoesNotExist() {
    UUID id = UUID.randomUUID();

    when(categoryRepository.findById(id))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() ->
        service.update(id, "Groceries")
    )
        .isInstanceOf(CategoryNotFoundException.class);

    verify(categoryRepository)
        .findById(id);
  }

  @Test
  void shouldDeleteCategory() {
    UUID id = UUID.randomUUID();

    Category category = Category.restore(
        id,
        "Food"
    );

    when(categoryRepository.findById(id))
        .thenReturn(Optional.of(category));

    service.delete(id);

    verify(categoryRepository)
        .findById(id);

    verify(categoryRepository)
        .delete(id);
  }

  @Test
  void shouldThrowWhenDeletingCategoryThatDoesNotExist() {
    UUID id = UUID.randomUUID();

    when(categoryRepository.findById(id))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() ->
        service.delete(id)
    )
        .isInstanceOf(CategoryNotFoundException.class);

    verify(categoryRepository)
        .findById(id);
  }
}