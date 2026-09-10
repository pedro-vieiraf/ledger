package com.pedro.ledger.application.transaction;

import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountNotFoundException;
import com.pedro.ledger.domain.account.AccountRepository;
import com.pedro.ledger.domain.category.Category;
import com.pedro.ledger.domain.category.CategoryNotFoundException;
import com.pedro.ledger.domain.category.CategoryRepository;
import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionNotFoundException;
import com.pedro.ledger.domain.transaction.TransactionProcessor;
import com.pedro.ledger.domain.transaction.TransactionRepository;
import com.pedro.ledger.domain.transaction.TransactionSource;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.math.BigDecimal;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class TransactionApplicationService {

  private final TransactionRepository transactionRepository;

  private final AccountRepository accountRepository;

  private final CategoryRepository categoryRepository;

  public TransactionApplicationService(
      TransactionRepository transactionRepository,
      AccountRepository accountRepository,
      CategoryRepository categoryRepository
  ) {
    this.transactionRepository = transactionRepository;
    this.accountRepository = accountRepository;
    this.categoryRepository = categoryRepository;
  }

  @Transactional
  public Transaction create(
      Money amount,
      TransactionType type,
      String description,
      UUID accountId,
      UUID destinationAccountId,
      UUID categoryId
  ) {
    validateCategory(categoryId);

    Transaction transaction = Transaction.create(
        amount,
        type,
        description,
        Instant.now(),
        TransactionSource.MANUAL,
        accountId,
        destinationAccountId,
        categoryId
    );

    if (type == TransactionType.TRANSFER) {
      Account sourceAccount = accountRepository.findById(accountId)
          .orElseThrow(() ->
              new AccountNotFoundException("Account not found")
          );

      Account destinationAccount = accountRepository
          .findById(destinationAccountId)
          .orElseThrow(() ->
              new AccountNotFoundException("Destination account not found")
          );

      TransactionProcessor.process(
          transaction,
          sourceAccount,
          destinationAccount
      );

      accountRepository.save(sourceAccount);
      accountRepository.save(destinationAccount);
    } else {
      Account account = accountRepository.findById(accountId)
          .orElseThrow(() ->
              new AccountNotFoundException("Account not found")
          );

      TransactionProcessor.process(
          transaction,
          account
      );

      accountRepository.save(account);
    }

    return transactionRepository.save(transaction);
  }

  public List<Transaction> findAll() {
    return transactionRepository.findAll();
  }

  public Optional<Transaction> findById(UUID transactionId) {
    return transactionRepository.findById(transactionId);
  }

  @Transactional
  public Transaction update(
      UUID id,
      BigDecimal amount,
      String description,
      UUID categoryId
  ) {
    Transaction transaction = getByIdOrThrow(id);

    validateCategory(categoryId);

    Account account = null;

    if (amount != null) {
      account = accountRepository.findById(
          transaction.getAccountId()
      ).orElseThrow(() ->
          new AccountNotFoundException("Account not found")
      );

      TransactionProcessor.changeAmount(
          transaction,
          Money.of(amount, transaction.getAmount().currency()),
          account
      );

      accountRepository.save(account);
    }

    transaction.changeDescription(description);
    transaction.changeCategory(categoryId);

    return transactionRepository.save(transaction);
  }

  @Transactional
  public void delete(UUID id) {
    Transaction transaction = transactionRepository.findById(id)
        .orElseThrow(() ->
            new TransactionNotFoundException()
        );

    if (transaction.getType().equals(TransactionType.TRANSFER)) {

      Account sourceAccount = accountRepository
          .findById(transaction.getAccountId())
          .orElseThrow(() ->
              new AccountNotFoundException("Account not found")
          );

      Account destinationAccount = accountRepository
          .findById(transaction.getDestinationAccountId())
          .orElseThrow(() ->
              new AccountNotFoundException("Destination account not found")
          );

      TransactionProcessor.reverse(
          transaction,
          sourceAccount,
          destinationAccount
      );

      accountRepository.save(sourceAccount);
      accountRepository.save(destinationAccount);
    } else {
      Account account = accountRepository
          .findById(transaction.getAccountId())
          .orElseThrow(() ->
              new AccountNotFoundException("Account not found")
          );

      TransactionProcessor.reverse(
          transaction,
          account
      );

      accountRepository.save(account);
    }

    transactionRepository.delete(id);
  }

  private Transaction getByIdOrThrow(UUID id) {
    return transactionRepository.findById(id)
        .orElseThrow(() ->
            new TransactionNotFoundException()
        );
  }

  private void validateCategory(UUID categoryId) {
    if (categoryId == null) {
      return;
    }

    categoryRepository.findById(categoryId)
        .orElseThrow(() ->
            new CategoryNotFoundException()
        );
  }
}
