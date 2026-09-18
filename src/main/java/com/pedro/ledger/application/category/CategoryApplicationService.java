package com.pedro.ledger.application.category;

import com.pedro.ledger.domain.category.Category;
import com.pedro.ledger.domain.category.CategoryNotFoundException;
import com.pedro.ledger.domain.category.CategoryRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Application service responsible for category use cases.
 */
@Service
public class CategoryApplicationService {

  private final CategoryRepository categoryRepository;

  public CategoryApplicationService(CategoryRepository categoryRepository) {
    this.categoryRepository = categoryRepository;
  }

  /**
   * Creates a new category.
   */
  public Category create(
      String name
  ) {
    Category category = Category.create(name);

    return categoryRepository.save(category);
  }

  /**
   * Find all categories.
   */
  public List<Category> findAll() {
    return categoryRepository.findAll();
  }

  /**
   * Find a category by its id.
   */
  public Optional<Category> findById(UUID id) {
    return categoryRepository.findById(id);
  }

  /**
   * Updates a category.
   */
  public Category update(UUID id, String name) {
    Category category = categoryRepository.findById(id)
        .orElseThrow(() -> new CategoryNotFoundException());

    category.rename(name);

    return categoryRepository.save(category);
  }

  /**
   * Deletes a category.
   */
  public void delete(UUID id) {
    categoryRepository.findById(id)
        .orElseThrow(() -> new CategoryNotFoundException());

    categoryRepository.delete(id);
  }
}
