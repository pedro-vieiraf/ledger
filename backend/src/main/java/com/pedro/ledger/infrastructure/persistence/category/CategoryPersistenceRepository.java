package com.pedro.ledger.infrastructure.persistence.category;

import com.pedro.ledger.domain.category.Category;
import com.pedro.ledger.domain.category.CategoryRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class CategoryPersistenceRepository implements CategoryRepository {

  private final CategoryJpaRepository jpaRepository;
  private final CategoryMapper mapper;

  public CategoryPersistenceRepository(
      CategoryJpaRepository jpaRepository,
      CategoryMapper mapper
  ) {
    this.jpaRepository = jpaRepository;
    this.mapper = mapper;
  }

  @Override
  public Category save(Category category) {
    CategoryEntity entity = mapper.toEntity(category);

    CategoryEntity savedEntity = jpaRepository.save(entity);

    return mapper.toDomain(savedEntity);
  }

  @Override
  public Optional<Category> findById(UUID id) {
    return jpaRepository.findById(id)
        .map(mapper::toDomain);
  }

  @Override
  public List<Category> findAll() {
    return jpaRepository.findAll()
        .stream()
        .map(mapper::toDomain)
        .toList();
  }

  @Override
  public void delete(UUID id) {
    jpaRepository.deleteById(id);
  }
}
