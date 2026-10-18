package com.pedro.ledger.infrastructure.web.transaction;

import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionSource;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Represents the response returned for a transaction.
 *
 * @param id transaction identifier
 * @param amount transaction amount
 * @param currency transaction currency
 * @param type transaction type
 * @param description transaction description
 * @param timestamp transaction timestamp
 * @param source transaction source
 * @param accountId source account identifier
 * @param destinationAccountId destination account identifier
 * @param categoryId category identifier
 */
public record TransactionResponse(
    UUID id,
    BigDecimal amount,
    String currency,
    TransactionType type,
    String description,
    Instant timestamp,
    TransactionSource source,
    UUID accountId,
    UUID destinationAccountId,
    UUID categoryId
) {

  public static TransactionResponse from(Transaction transaction) {
    return new TransactionResponse(
        transaction.getId(),
        transaction.getAmount().amount(),
        transaction.getAmount().currency().getCurrencyCode(),
        transaction.getType(),
        transaction.getDescription(),
        transaction.getTimestamp(),
        transaction.getSource(),
        transaction.getAccountId(),
        transaction.getDestinationAccountId(),
        transaction.getCategoryId()
    );
  }
}