package com.pedro.ledger.infrastructure.web.account;

import com.pedro.ledger.application.account.AccountApplicationService;
import com.pedro.ledger.domain.account.Account;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
}