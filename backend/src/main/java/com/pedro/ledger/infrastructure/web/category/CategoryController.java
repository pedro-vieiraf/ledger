package com.pedro.ledger.infrastructure.web.category;

import com.pedro.ledger.application.category.CategoryApplicationService;
import com.pedro.ledger.domain.category.Category;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/categories")
public class CategoryController {

  private final CategoryApplicationService categoryApplicationService;

  public CategoryController(CategoryApplicationService categoryApplicationService) {
    this.categoryApplicationService = categoryApplicationService;
  }

  /**
   * Creates a new category.
   */
  @PostMapping
  public ResponseEntity<CategoryResponse> create(
      @Valid
      @RequestBody CategoryRequest request
  ) {
    Category category = categoryApplicationService.create(
        request.name()
    );

    CategoryResponse response = CategoryResponse.from(category);

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  /**
   * Retrieves all categories.
   */
  @GetMapping
  public ResponseEntity<List<CategoryResponse>> findAll() {
    List<CategoryResponse> categories = categoryApplicationService.findAll()
        .stream()
        .map(CategoryResponse::from)
        .toList();

    return ResponseEntity.ok(categories);
  }

  /**
   * Retrieves a category from its id.
   */
  @GetMapping("/{id}")
  public ResponseEntity<CategoryResponse> findById(
      @PathVariable UUID id
  ) {
    return categoryApplicationService.findById(id)
        .map(CategoryResponse::from)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /**
   * Updates a category.
   */
  @PatchMapping("/{id}")
  public ResponseEntity<CategoryResponse> update(
      @PathVariable UUID id,
      @Valid
      @RequestBody CategoryRequest request
  ) {
    Category category = categoryApplicationService.update(
        id,
        request.name()
    );

    return ResponseEntity.ok(CategoryResponse.from(category));
  }

  /**
   * Delete a category.
   */
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID id
  ) {
    categoryApplicationService.delete(id);

    return ResponseEntity.noContent().build();
  }
}
