package com.pedro.ledger.infrastructure.web.exception;

import com.pedro.ledger.domain.account.AccountInactiveException;
import com.pedro.ledger.domain.account.AccountNotFoundException;
import com.pedro.ledger.domain.category.CategoryNotFoundException;
import com.pedro.ledger.domain.transaction.TransactionNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(AccountNotFoundException.class)
  public ResponseEntity<Void> handleAccountNotFound(
      AccountNotFoundException exception
  ) {
    return ResponseEntity.notFound().build();
  }

  @ExceptionHandler(AccountInactiveException.class)
  public ResponseEntity<Void> handleAccountInactive(
      AccountInactiveException exception
  ) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
  }

  @ExceptionHandler(CategoryNotFoundException.class)
  public ResponseEntity<Void> handleCategoryNotFound(
      CategoryNotFoundException exception
  ) {
    return ResponseEntity.notFound().build();
  }

  @ExceptionHandler(TransactionNotFoundException.class)
  public ResponseEntity<Void> handleTransactionNotFound(
      TransactionNotFoundException exception
  ) {
    return ResponseEntity.notFound().build();
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Void> handleValidation(
      MethodArgumentNotValidException exception
  ) {
    return ResponseEntity.badRequest().build();
  }
}