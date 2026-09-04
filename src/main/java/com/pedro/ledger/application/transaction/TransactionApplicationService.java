package com.pedro.ledger.application.transaction;

import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionRepository;
import com.pedro.ledger.domain.transaction.TransactionSource;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class TransactionApplicationService {

  private final TransactionRepository transactionRepository;

  public TransactionApplicationService(TransactionRepository transactionRepository) {
    this.transactionRepository = transactionRepository;
  }

  public Transaction create(
      Money amount,
      TransactionType type,
      String description,
      UUID accountId,
      UUID destinationAccountId,
      UUID categoryId
  ) {
    Instant timestamp = Instant.now();

    Transaction transaction = Transaction.create(
        amount,
        type,
        description,
        timestamp,
        TransactionSource.MANUAL,
        accountId,
        destinationAccountId,
        categoryId
    );

    return transactionRepository.save(transaction);
  }

  public List<Transaction> findAll() {
    return transactionRepository.findAll();
  }

  public Optional<Transaction> findById(UUID transactionId) {
    return transactionRepository.findById(transactionId);
  }

  public Transaction update(UUID id, Money amount, String description, UUID categoryId) {
    Transaction transaction = transactionRepository.findById(id)
        .orElseThrow(() ->
            new IllegalArgumentException("Transaction not found")
        );

    transaction.changeAmount(amount);
    transaction.changeDescription(description);
    transaction.changeCategory(categoryId);

    return transactionRepository.save(transaction);
  }
}
