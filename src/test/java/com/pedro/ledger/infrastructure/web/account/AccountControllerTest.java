package com.pedro.ledger.infrastructure.web.account;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pedro.ledger.application.account.AccountApplicationService;
import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountStatus;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.Money;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AccountController.class)
class AccountControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private AccountApplicationService accountApplicationService;

  @Nested
  class CreateAccount {

    @Test
    void shouldCreateAccount() throws Exception {
      Account account = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      when(accountApplicationService.create(
          "Checking Account",
          AccountType.CHECKING,
          new BigDecimal("1000.00")
      )).thenReturn(account);

      mockMvc.perform(
              post("/accounts")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                    {
                      "name": "Checking Account",
                      "type": "CHECKING",
                      "openingBalance": 1000.00
                    }
                    """)
          )
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.id").value(account.getId().toString()))
          .andExpect(jsonPath("$.name").value("Checking Account"))
          .andExpect(jsonPath("$.type").value("CHECKING"))
          .andExpect(jsonPath("$.status").value("ACTIVE"))
          .andExpect(jsonPath("$.balance").value(1000.00));

      verify(accountApplicationService).create(
          eq("Checking Account"),
          eq(AccountType.CHECKING),
          eq(new BigDecimal("1000.00"))
      );
    }

    @Test
    void shouldReturnBadRequestWhenOpeningBalanceIsNotANumber()
        throws Exception {

      mockMvc.perform(
              post("/accounts")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                    {
                      "name": "Checking Account",
                      "type": "CHECKING",
                      "openingBalance": "invalid"
                    }
                    """)
          )
          .andExpect(status().isBadRequest());

      verifyNoInteractions(accountApplicationService);
    }

    @Test
    void shouldReturnBadRequestWhenRequestBodyIsInvalidJson()
        throws Exception {

      mockMvc.perform(
              post("/accounts")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                    {
                      "name": "Checking Account",
                      "type": "CHECKING",
                      "openingBalance": 1000.00
                """)
          )
          .andExpect(status().isBadRequest());

      verifyNoInteractions(accountApplicationService);
    }
  }

  @Nested
  class FindAccountById {

    @Test
    void shouldFindAccountById() throws Exception {
      UUID id = UUID.randomUUID();

      Account account = Account.restore(
          id,
          "Checking Account",
          AccountType.CHECKING,
          AccountStatus.ACTIVE,
          Money.of("1000.00")
      );

      when(accountApplicationService.findById(id))
          .thenReturn(Optional.of(account));

      mockMvc.perform(
              get("/accounts/{id}", id)
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id").value(id.toString()))
          .andExpect(jsonPath("$.name").value("Checking Account"))
          .andExpect(jsonPath("$.type").value("CHECKING"))
          .andExpect(jsonPath("$.status").value("ACTIVE"))
          .andExpect(jsonPath("$.balance").value(1000.00));

      verify(accountApplicationService)
          .findById(id);
    }

    @Test
    void shouldReturnNotFoundWhenAccountDoesNotExist()
        throws Exception {

      UUID id = UUID.randomUUID();

      when(accountApplicationService.findById(id))
          .thenReturn(Optional.empty());

      mockMvc.perform(
              get("/accounts/{id}", id)
          )
          .andExpect(status().isNotFound());

      verify(accountApplicationService)
          .findById(id);
    }
  }

  @Nested
  class FindAllAccounts {

    @Test
    void shouldFindAllAccounts() throws Exception {
      Account checkingAccount = Account.open(
          "Checking Account",
          AccountType.CHECKING,
          Money.of("1000.00")
      );

      Account savingsAccount = Account.open(
          "Savings Account",
          AccountType.SAVINGS,
          Money.of("2500.00")
      );

      when(accountApplicationService.findAll())
          .thenReturn(List.of(
              checkingAccount,
              savingsAccount
          ));

      mockMvc.perform(
              get("/accounts")
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.length()").value(2))
          .andExpect(jsonPath("$[0].id")
              .value(checkingAccount.getId().toString()))
          .andExpect(jsonPath("$[0].name")
              .value("Checking Account"))
          .andExpect(jsonPath("$[0].type")
              .value("CHECKING"))
          .andExpect(jsonPath("$[0].status")
              .value("ACTIVE"))
          .andExpect(jsonPath("$[0].balance")
              .value(1000.00))
          .andExpect(jsonPath("$[1].id")
              .value(savingsAccount.getId().toString()))
          .andExpect(jsonPath("$[1].name")
              .value("Savings Account"))
          .andExpect(jsonPath("$[1].type")
              .value("SAVINGS"))
          .andExpect(jsonPath("$[1].status")
              .value("ACTIVE"))
          .andExpect(jsonPath("$[1].balance")
              .value(2500.00));

      verify(accountApplicationService)
          .findAll();
    }

    @Test
    void shouldReturnEmptyListWhenThereAreNoAccounts()
        throws Exception {

      when(accountApplicationService.findAll())
          .thenReturn(List.of());

      mockMvc.perform(
              get("/accounts")
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.length()").value(0));

              verify(accountApplicationService)
                  .findAll();
    }
  }

  @Nested
  class UpdateAccount {

    @Test
    void shouldUpdateNameAndType() throws Exception {
      UUID id = UUID.randomUUID();

      Account account = Account.restore(
          id,
          "Updated Account",
          AccountType.CHECKING,
          AccountStatus.ACTIVE,
          Money.of("1000.00")
      );

      when(accountApplicationService.update(
          id,
          "Updated Account",
          AccountType.CHECKING
      )).thenReturn(account);

      mockMvc.perform(
              patch("/accounts/{id}", id)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                    {
                      "name": "Updated Account",
                      "type": "CHECKING"
                    }
                    """)
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id").value(id.toString()))
          .andExpect(jsonPath("$.name").value("Updated Account"))
          .andExpect(jsonPath("$.type").value("CHECKING"))
          .andExpect(jsonPath("$.status").value("ACTIVE"))
          .andExpect(jsonPath("$.balance").value(1000.00));

      verify(accountApplicationService).update(
          eq(id),
          eq("Updated Account"),
          eq(AccountType.CHECKING)
      );
    }

    @Test
    void shouldUpdateOnlyName() throws Exception {
      UUID id = UUID.randomUUID();

      Account account = Account.restore(
          id,
          "Updated Account",
          AccountType.CHECKING,
          AccountStatus.ACTIVE,
          Money.of("1000.00")
      );

      when(accountApplicationService.update(
          id,
          "Updated Account",
          null
      )).thenReturn(account);

      mockMvc.perform(
              patch("/accounts/{id}", id)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                    {
                      "name": "Updated Account"
                    }
                    """)
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.name").value("Updated Account"))
          .andExpect(jsonPath("$.type").value("CHECKING"));

      verify(accountApplicationService).update(
          eq(id),
          eq("Updated Account"),
          eq(null)
      );
    }

    @Test
    void shouldUpdateOnlyType() throws Exception {
      UUID id = UUID.randomUUID();

      Account account = Account.restore(
          id,
          "Checking Account",
          AccountType.SAVINGS,
          AccountStatus.ACTIVE,
          Money.of("1000.00")
      );

      when(accountApplicationService.update(
          id,
          null,
          AccountType.SAVINGS
      )).thenReturn(account);

      mockMvc.perform(
              patch("/accounts/{id}", id)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                    {
                      "type": "SAVINGS"
                    }
                    """)
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.name").value("Checking Account"))
          .andExpect(jsonPath("$.type").value("SAVINGS"));

      verify(accountApplicationService).update(
          eq(id),
          eq(null),
          eq(AccountType.SAVINGS)
      );
    }

    @Test
    void shouldReturnNotFoundWhenAccountDoesNotExist()
        throws Exception {

      UUID id = UUID.randomUUID();

      when(accountApplicationService.update(
          id,
          "Updated Account",
          AccountType.CHECKING
      )).thenThrow(
          new IllegalArgumentException("Account not found")
      );

      mockMvc.perform(
              patch("/accounts/{id}", id)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                    {
                      "name": "Updated Account",
                      "type": "CHECKING"
                    }
                    """)
          )
          .andExpect(status().isNotFound());

      verify(accountApplicationService).update(
          eq(id),
          eq("Updated Account"),
          eq(AccountType.CHECKING)
      );
    }

    @Test
    void shouldReturnBadRequestWhenNameIsInvalid()
        throws Exception {

      when(accountApplicationService.update(
          any(UUID.class),
          eq("   "),
          eq(null)
      )).thenThrow(
          new IllegalArgumentException(
              "Account name cannot be null or blank"
          )
      );

      UUID id = UUID.randomUUID();

      mockMvc.perform(
              patch("/accounts/{id}", id)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                    {
                      "name": "   "
                    }
                    """)
          )
          .andExpect(status().isBadRequest());

      verify(accountApplicationService).update(
          eq(id),
          eq("   "),
          eq(null)
      );
    }

    @Test
    void shouldReturnBadRequestWhenRequestBodyIsInvalidJson()
        throws Exception {

      UUID id = UUID.randomUUID();

      mockMvc.perform(
              patch("/accounts/{id}", id)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                    {
                      "name": "Updated Account",
                      "type":
                """)
          )
          .andExpect(status().isBadRequest());

      verifyNoInteractions(accountApplicationService);
    }
  }

  @Nested
  class Delete {

    @Test
    void shouldDeactivateAccount() throws Exception {
      UUID id = UUID.randomUUID();

      doNothing()
          .when(accountApplicationService)
          .deactivate(id);

      mockMvc.perform(delete("/accounts/{id}", id))
          .andExpect(status().isNoContent());

      verify(accountApplicationService).deactivate(id);
    }
  }
}