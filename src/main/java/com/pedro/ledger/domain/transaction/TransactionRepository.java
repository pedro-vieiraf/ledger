package com.pedro.ledger.domain.transaction;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository {

  Transaction save(Transaction transaction);

  Optional<Transaction> findById(UUID id);

  List<Transaction> findAll();

  void delete(UUID id);

}
