package com.pedro.ledger.domain.transaction;

public class TransactionNotFoundException extends RuntimeException {

  public TransactionNotFoundException() {
    super("Transaction not found");
  }
}
