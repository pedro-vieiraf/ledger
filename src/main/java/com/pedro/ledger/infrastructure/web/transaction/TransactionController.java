package com.pedro.ledger.infrastructure.web.transaction;

import com.pedro.ledger.application.transaction.TransactionApplicationService;
import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.Transaction;
import java.util.Currency;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
}
