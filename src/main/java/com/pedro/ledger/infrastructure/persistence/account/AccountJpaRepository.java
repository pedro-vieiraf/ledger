package com.pedro.ledger.infrastructure.persistence.account;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountJpaRepository
    extends JpaRepository<AccountEntity, UUID> {
}