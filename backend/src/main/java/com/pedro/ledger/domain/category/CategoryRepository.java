package com.pedro.ledger.domain.category;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository {

  Category save(Category category);

  Optional<Category> findById(UUID id);

  List<Category> findAll();

  void delete(UUID id);

}
