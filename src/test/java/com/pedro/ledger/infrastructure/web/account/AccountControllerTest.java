package com.pedro.ledger.infrastructure.web.account;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

import com.pedro.ledger.application.account.AccountApplicationService;
import com.pedro.ledger.domain.account.Account;
import com.pedro.ledger.domain.account.AccountType;
import com.pedro.ledger.domain.money.Money;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AccountController.class)
class AccountControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private AccountApplicationService accountApplicationService;

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