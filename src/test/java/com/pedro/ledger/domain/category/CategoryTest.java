package com.pedro.ledger.domain.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class CategoryTest {

  @Test
  void shouldCreateCategory() {
    Category category = Category.create("Food");

    assertThat(category.getId()).isNotNull();
    assertThat(category.getName()).isEqualTo("Food");
  }

  @Test
  void shouldGenerateDifferentIdsForDifferentCategories() {
    Category first = Category.create("Food");
    Category second = Category.create("Transport");

    assertThat(first.getId())
        .isNotEqualTo(second.getId());
  }

  @Test
  void shouldRejectNullName() {
    assertThatThrownBy(() ->
        Category.create(null)
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Category name cannot be null or blank");
  }

  @Test
  void shouldRejectBlankName() {
    assertThatThrownBy(() ->
        Category.create("   ")
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Category name cannot be null or blank");
  }

  @Test
  void shouldTrimName() {
    Category category = Category.create("  Food  ");

    assertThat(category.getName())
        .isEqualTo("Food");
  }

  @Test
  void shouldRenameCategory() {
    Category category = Category.create("Food");

    UUID id = category.getId();

    category.rename("Food & Dining");

    assertThat(category.getId())
        .isEqualTo(id);

    assertThat(category.getName())
        .isEqualTo("Food & Dining");
  }

  @Test
  void shouldRejectNullNameWhenRenaming() {
    Category category = Category.create("Food");

    assertThatThrownBy(() ->
        category.rename(null)
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Category name cannot be null or blank");
  }

  @Test
  void shouldRejectBlankNameWhenRenaming() {
    Category category = Category.create("Food");

    assertThatThrownBy(() ->
        category.rename("   ")
    )
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Category name cannot be null or blank");
  }

  @Test
  void shouldTrimNameWhenRenaming() {
    Category category = Category.create("Food");

    category.rename("  Food & Dining  ");

    assertThat(category.getName())
        .isEqualTo("Food & Dining");
  }
}