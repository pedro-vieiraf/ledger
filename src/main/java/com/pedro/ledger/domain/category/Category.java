package com.pedro.ledger.domain.category;

import java.util.UUID;

/**
 * Represents a category used to classify financial transactions.
 */
public class Category {

  private final UUID id;
  private String name;

  private Category(UUID id, String name) {
    this.id = id;
    this.name = name;
  }

  /**
   * Creates a new category.
   *
   * @param name category name
   * @return a new category
   * @throws IllegalArgumentException if the name is null or blank
   */
  public static Category create(String name) {
    validateName(name);

    return new Category(
        UUID.randomUUID(),
        name.trim()
    );
  }

  /**
   * Renames the category.
   *
   * @param newName new category name
   * @throws IllegalArgumentException if the name is null or blank
   */
  public void rename(String newName) {
    validateName(newName);

    this.name = newName.trim();
  }

  /**
   * Returns the category identifier.
   *
   * @return category identifier
   */
  public UUID getId() {
    return id;
  }

  /**
   * Returns the category name.
   *
   * @return category name
   */
  public String getName() {
    return name;
  }

  /**
   * Validates a category name.
   *
   * @param name category name to validate
   * @throws IllegalArgumentException if the name is null or blank
   */
  private static void validateName(String name) {
    if (name == null || name.isBlank()) {
      throw new IllegalArgumentException(
          "Category name cannot be null or blank"
      );
    }
  }
}