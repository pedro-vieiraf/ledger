package com.pedro.ledger.infrastructure.web.account;

import com.pedro.ledger.application.account.AccountApplicationService;
import com.pedro.ledger.domain.account.Account;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller responsible for account endpoints.
 */
@RestController
@RequestMapping("/accounts")
public class AccountController {

  private final AccountApplicationService accountApplicationService;

  /**
   * Creates an account controller.
   *
   * @param accountApplicationService service responsible for account use cases
   */
  public AccountController(
      AccountApplicationService accountApplicationService
  ) {
    this.accountApplicationService = accountApplicationService;
  }

  /**
   * Creates a new account.
   *
   * @param request request containing the account data
   * @return the created account with HTTP status 201
   */
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

  /**
   * Retrieves all accounts.
   *
   * @return a list of all accounts with HTTP status 200
   */
  @GetMapping
  public ResponseEntity<List<AccountResponse>> getAll() {
    List<AccountResponse> accounts = accountApplicationService.findAll()
        .stream()
        .map(AccountResponse::from)
        .toList();

    return ResponseEntity.ok(accounts);
  }

  /**
   * Retrieves an account by its identifier.
   *
   * @param id account identifier
   * @return the account if found, otherwise HTTP status 404
   */
  @GetMapping("/{id}")
  public ResponseEntity<AccountResponse> getById(
      @PathVariable UUID id
  ) {
    return accountApplicationService.findById(id)
        .map(AccountResponse::from)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /**
   * Updates an account's editable information.
   *
   * @param id account identifier
   * @param request request containing the updated account data
   * @return the updated account with HTTP status 200
   */
  @PatchMapping("/{id}")
  public ResponseEntity<AccountResponse> update(
      @PathVariable UUID id,
      @RequestBody UpdateAccountRequest request
  ) {
    Account updatedAccount = accountApplicationService.update(
        id,
        request.name(),
        request.type()
    );

    return ResponseEntity.ok(AccountResponse.from(updatedAccount));
  }
}