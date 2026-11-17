package com.pedro.ledger.infrastructure.persistence.category;

import com.pedro.ledger.domain.category.Category;
import org.springframework.stereotype.Component;

/**
 * Maps between category domain objects and persistence entities.
 */
@Component
public class CategoryMapper {

  /**
   * Converts a domain category into a persistence entity.
   *
   * @param category category domain object
   * @return persistence entity representing the category
   */
  public CategoryEntity toEntity(Category category) {
    return new CategoryEntity(
        category.getId(),
        category.getName()
    );
  }

  /**
   * Converts a persistence entity into a domain category.
   *
   * @param entity category persistence entity
   * @return domain category reconstructed from the entity
   */
  public Category toDomain(CategoryEntity entity) {
    return Category.restore(
        entity.getId(),
        entity.getName()
    );
  }
}
