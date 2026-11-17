package com.pedro.ledger.domain.recurrence;

/**
 * Thrown when a recurrence cannot be found.
 */
public class RecurrenceNotFoundException extends RuntimeException {

  public RecurrenceNotFoundException() {
    super("Recurrence not found");
  }
}
