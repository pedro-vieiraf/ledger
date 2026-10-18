package com.pedro.ledger.infrastructure.web.category;

import com.pedro.ledger.domain.category.Category;
import java.util.UUID;

public record CategoryResponse(
    UUID id,
    String name
) {

  /**
   * Creates a category response from a domain category.
   */
  public static CategoryResponse from(Category category) {
    return new CategoryResponse(
        category.getId(),
        category.getName()
    );
  }
}
