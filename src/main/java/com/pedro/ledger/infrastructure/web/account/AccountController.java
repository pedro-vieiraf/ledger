package com.pedro.ledger.infrastructure.web.account;

import com.pedro.ledger.application.account.AccountApplicationService;
import com.pedro.ledger.domain.account.Account;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/accounts")
public class AccountController {

  private final AccountApplicationService accountApplicationService;

  public AccountController(
      AccountApplicationService accountApplicationService
  ) {
    this.accountApplicationService = accountApplicationService;
  }

  @PostMapping
  public ResponseEntity<AccountResponse> create(
      @RequestBody CreateAccountRequest request
  ) {
    Account account = accountApplicationService.create(
        request.name(),
        request.type(),
        request.openingBalance()
    );

    AccountResponse response = AccountResponse.from(account);

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping()
  public ResponseEntity<List<AccountResponse>> getAll() {
    List<AccountResponse> accounts = accountApplicationService.findAll()
        .stream()
        .map(AccountResponse::from)
        .toList();

    return ResponseEntity.ok(accounts);
  }

  @GetMapping("/{id}")
  public ResponseEntity<AccountResponse> getById(
      @PathVariable UUID id
  ) {
    return accountApplicationService.findById(id)
        .map(AccountResponse::from)
        .map(ResponseEntity::ok)
        .orElseGet(()-> ResponseEntity.notFound().build());
  }
}