package com.pedro.ledger.infrastructure.persistence.category;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * JPA entity representing a category in the persistence layer.
 */
@Entity
@Table(name = "categories")
public class CategoryEntity {

  @Id
  private UUID id;

  @Column(nullable = false, unique = true)
  private String name;

  /**
   * Protected constructor required by JPA.
   */
  protected CategoryEntity() {
  }

  public CategoryEntity(UUID id, String name) {
    this.id = id;
    this.name = name;
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
}
