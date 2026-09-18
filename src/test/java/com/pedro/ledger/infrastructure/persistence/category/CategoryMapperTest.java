package com.pedro.ledger.infrastructure.persistence.category;

import static org.assertj.core.api.Assertions.assertThat;

import com.pedro.ledger.domain.category.Category;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CategoryMapperTest {

  private final CategoryMapper mapper = new CategoryMapper();

  @Test
  void shouldMapDomainToEntity() {
    Category category = Category.create("Food");

    CategoryEntity entity = mapper.toEntity(category);

    assertThat(entity.getId())
        .isEqualTo(category.getId());

    assertThat(entity.getName())
        .isEqualTo(category.getName());
  }

  @Test
  void shouldMapEntityToDomain() {
    UUID id = UUID.randomUUID();

    CategoryEntity entity = new CategoryEntity(
        id,
        "Food"
    );

    Category category = mapper.toDomain(entity);

    assertThat(category.getId())
        .isEqualTo(id);

    assertThat(category.getName())
        .isEqualTo("Food");
  }

  @Test
  void shouldPreserveCategoryDataWhenMappingToDomain() {
    UUID id = UUID.randomUUID();

    CategoryEntity entity = new CategoryEntity(
        id,
        "Entertainment"
    );

    Category category = mapper.toDomain(entity);

    assertThat(category.getId())
        .isEqualTo(id);

    assertThat(category.getName())
        .isEqualTo("Entertainment");
  }
}