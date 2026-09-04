package com.pedro.ledger.application.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionRepository;
import com.pedro.ledger.domain.transaction.TransactionSource;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class TransactionApplicationServiceTest {

  @Mock
  private TransactionRepository transactionRepository;

  private TransactionApplicationService transactionApplicationService;

  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);
    transactionApplicationService =
        new TransactionApplicationService(transactionRepository);
  }

  @Test
  void shouldCreateManualTransaction() {
    UUID accountId = UUID.randomUUID();
    Money amount = Money.of("100.00");

    when(transactionRepository.save(
        org.mockito.ArgumentMatchers.any(Transaction.class)
    )).thenAnswer(invocation -> invocation.getArgument(0));

    Transaction result = transactionApplicationService.create(
        amount,
        TransactionType.EXPENSE,
        "Groceries",
        accountId,
        null,
        null
    );

    ArgumentCaptor<Transaction> captor =
        ArgumentCaptor.forClass(Transaction.class);

    verify(transactionRepository).save(captor.capture());

    Transaction savedTransaction = captor.getValue();

    assertThat(savedTransaction.getAmount())
        .isEqualTo(amount);

    assertThat(savedTransaction.getType())
        .isEqualTo(TransactionType.EXPENSE);

    assertThat(savedTransaction.getDescription())
        .isEqualTo("Groceries");

    assertThat(savedTransaction.getSource())
        .isEqualTo(TransactionSource.MANUAL);

    assertThat(savedTransaction.getAccountId())
        .isEqualTo(accountId);

    assertThat(savedTransaction.getDestinationAccountId())
        .isNull();

    assertThat(savedTransaction.getCategoryId())
        .isNull();

    assertThat(savedTransaction.getTimestamp())
        .isNotNull();

    assertThat(result)
        .isEqualTo(savedTransaction);
  }
}
