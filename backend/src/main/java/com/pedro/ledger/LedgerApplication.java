package com.pedro.ledger;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main entry point for the Ledger application.
 */
@SpringBootApplication
@EnableScheduling
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