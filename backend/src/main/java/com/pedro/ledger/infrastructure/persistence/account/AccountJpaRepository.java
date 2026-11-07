package com.pedro.ledger.infrastructure.persistence.account;

import com.pedro.ledger.domain.account.AccountStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * JPA Repository.
 */
public interface AccountJpaRepository
    extends JpaRepository<AccountEntity, UUID> {

  List<AccountEntity> findAllByStatusNot(AccountStatus status);
}
