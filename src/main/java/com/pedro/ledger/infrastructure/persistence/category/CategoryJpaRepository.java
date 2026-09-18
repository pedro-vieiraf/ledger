package com.pedro.ledger.infrastructure.persistence.category;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * JPA Repository.
 */
public interface CategoryJpaRepository
    extends JpaRepository<CategoryEntity, UUID> {

}
