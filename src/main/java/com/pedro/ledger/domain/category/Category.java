package com.pedro.ledger.domain.category;

import java.util.UUID;

public class Category {

  private final UUID id;
  private String name;

  private Category(UUID id, String name) {
    this.id = id;
    this.name = name;
  }

  public static Category create(String name) {
    validateName(name);

    return new Category(
        UUID.randomUUID(),
        name.trim()
    );
  }

  public void rename(String newName) {
    validateName(newName);

    this.name = newName.trim();
  }

  public UUID getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  private static void validateName(String name) {
    if (name == null || name.isBlank()) {
      throw new IllegalArgumentException(
          "Category name cannot be null or blank"
      );
    }
  }
}