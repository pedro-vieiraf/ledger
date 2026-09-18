package com.pedro.ledger;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main entry point for the Ledger application.
 */
@SpringBootApplication
public class LedgerApplication {

  /**
   * Starts the Ledger application.
   *
   * @param args application command-line arguments
   */
  public static void main(String[] args) {
    SpringApplication.run(LedgerApplication.class, args);
  }
}