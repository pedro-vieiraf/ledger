package com.pedro.ledger.infrastructure.persistence.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pedro.ledger.domain.category.Category;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CategoryPersistenceRepositoryTest {

  @Mock
  private CategoryJpaRepository jpaRepository;

  @Mock
  private CategoryMapper mapper;

  private CategoryPersistenceRepository repository;

  @BeforeEach
  void setUp() {
    repository = new CategoryPersistenceRepository(
        jpaRepository,
        mapper
    );
  }

  @Test
  void shouldSaveCategory() {
    UUID id = UUID.randomUUID();
    Category category = Category.create("Food");
    CategoryEntity entity = new CategoryEntity(
        id,
        "Food"
    );
    CategoryEntity savedEntity = new CategoryEntity(
        id,
        "Food"
    );
    Category savedCategory = Category.restore(
        id,
        "Food"
    );

    when(mapper.toEntity(category))
        .thenReturn(entity);

    when(jpaRepository.save(entity))
        .thenReturn(savedEntity);

    when(mapper.toDomain(savedEntity))
        .thenReturn(savedCategory);

    Category result = repository.save(category);

    assertThat(result)
        .isSameAs(savedCategory);

    verify(mapper)
        .toEntity(category);

    verify(jpaRepository)
        .save(entity);

    verify(mapper)
        .toDomain(savedEntity);
  }

  @Test
  void shouldFindCategoryById() {
    UUID id = UUID.randomUUID();

    CategoryEntity entity = new CategoryEntity(
        id,
        "Food"
    );

    Category category = Category.restore(
        id,
        "Food"
    );

    when(jpaRepository.findById(id))
        .thenReturn(Optional.of(entity));

    when(mapper.toDomain(entity))
        .thenReturn(category);

    Optional<Category> result = repository.findById(id);

    assertThat(result)
        .isPresent()
        .containsSame(category);

    verify(jpaRepository)
        .findById(id);

    verify(mapper)
        .toDomain(entity);
  }

  @Test
  void shouldReturnEmptyWhenCategoryIsNotFound() {
    UUID id = UUID.randomUUID();

    when(jpaRepository.findById(id))
        .thenReturn(Optional.empty());

    Optional<Category> result = repository.findById(id);

    assertThat(result)
        .isEmpty();

    verify(jpaRepository)
        .findById(id);
  }

  @Test
  void shouldFindAllCategories() {
    UUID firstId = UUID.randomUUID();
    UUID secondId = UUID.randomUUID();

    CategoryEntity firstEntity = new CategoryEntity(
        firstId,
        "Food"
    );

    CategoryEntity secondEntity = new CategoryEntity(
        secondId,
        "Entertainment"
    );

    Category firstCategory = Category.restore(
        firstId,
        "Food"
    );

    Category secondCategory = Category.restore(
        secondId,
        "Entertainment"
    );

    when(jpaRepository.findAll())
        .thenReturn(List.of(
            firstEntity,
            secondEntity
        ));

    when(mapper.toDomain(firstEntity))
        .thenReturn(firstCategory);

    when(mapper.toDomain(secondEntity))
        .thenReturn(secondCategory);

    List<Category> result = repository.findAll();

    assertThat(result)
        .containsExactly(
            firstCategory,
            secondCategory
        );

    verify(jpaRepository)
        .findAll();

    verify(mapper)
        .toDomain(firstEntity);

    verify(mapper)
        .toDomain(secondEntity);
  }

  @Test
  void shouldReturnEmptyListWhenThereAreNoCategories() {
    when(jpaRepository.findAll())
        .thenReturn(List.of());

    List<Category> result = repository.findAll();

    assertThat(result)
        .isEmpty();

    verify(jpaRepository)
        .findAll();
  }

  @Test
  void shouldDeleteCategory() {
    UUID id = UUID.randomUUID();

    repository.delete(id);

    verify(jpaRepository)
        .deleteById(id);
  }
}