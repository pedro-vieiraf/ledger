package com.pedro.ledger.infrastructure.web.transaction;

import com.pedro.ledger.application.transaction.TransactionApplicationService;
import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.Transaction;
import java.util.Currency;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/transactions")
public class TransactionController {

  private final TransactionApplicationService service;

  public TransactionController(TransactionApplicationService service) {
    this.service = service;
  }

  @PostMapping
  public ResponseEntity<TransactionResponse> save(
      @RequestBody CreateTransactionRequest request
  ) {
    Transaction transaction = service.create(
        Money.of(
            request.amount(),
            Currency.getInstance(request.currency())
        ),
        request.type(),
        request.description(),
        request.accountId(),
        request.destinationAccountId(),
        request.categoryId()
    );

    TransactionResponse response = TransactionResponse.from(transaction);

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping
  public ResponseEntity<List<TransactionResponse>> findAll() {
    List<TransactionResponse> transactions = service.findAll()
        .stream()
        .map(TransactionResponse::from)
        .toList();

    return ResponseEntity.ok(transactions);
  }

  @GetMapping("/{id}")
  public ResponseEntity<TransactionResponse> findById(
      @PathVariable UUID id
  ) {
    return service.findById(id)
        .map(TransactionResponse::from)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PatchMapping("/{id}")
  public ResponseEntity<TransactionResponse> update(
      @PathVariable UUID id,
      @RequestBody UpdateTransactionRequest request
  ) {
    Money amount = Money.of(
        request.amount(),
        Currency.getInstance(request.currency())
    );

    Transaction updatedTransaction = service.update(
        id,
        amount,
        request.description(),
        request.categoryId()
    );

    TransactionResponse response = TransactionResponse.from(updatedTransaction);

    return ResponseEntity.ok(response);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID id
  ) {
    service.delete(id);

    return ResponseEntity.noContent().build();
  }
}
