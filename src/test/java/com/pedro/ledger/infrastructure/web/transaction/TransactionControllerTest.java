package com.pedro.ledger.infrastructure.web.transaction;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pedro.ledger.application.transaction.TransactionApplicationService;
import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionSource;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.time.Instant;
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

@WebMvcTest(TransactionController.class)
class TransactionControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private TransactionApplicationService service;

  @Nested
  class Create {

    @Test
    void shouldCreateTransaction() throws Exception {
      UUID accountId = UUID.randomUUID();
      UUID categoryId = UUID.randomUUID();

      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          accountId,
          null,
          categoryId
      );

      when(service.create(
          eq(Money.of("100.00")),
          eq(TransactionType.EXPENSE),
          eq("Groceries"),
          eq(accountId),
          eq(null),
          eq(categoryId)
      )).thenReturn(transaction);

      mockMvc.perform(
              post("/transactions")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                  {
                    "amount": 100.00,
                    "currency": "BRL",
                    "type": "EXPENSE",
                    "description": "Groceries",
                    "accountId": "%s",
                    "destinationAccountId": null,
                    "categoryId": "%s"
                  }
                  """.formatted(accountId, categoryId))
          )
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.id")
              .value(transaction.getId().toString()))
          .andExpect(jsonPath("$.amount")
              .value(100.00))
          .andExpect(jsonPath("$.currency")
              .value("BRL"))
          .andExpect(jsonPath("$.type")
              .value("EXPENSE"))
          .andExpect(jsonPath("$.description")
              .value("Groceries"))
          .andExpect(jsonPath("$.source")
              .value("MANUAL"))
          .andExpect(jsonPath("$.accountId")
              .value(accountId.toString()))
          .andExpect(jsonPath("$.destinationAccountId")
              .isEmpty())
          .andExpect(jsonPath("$.categoryId")
              .value(categoryId.toString()));

      verify(service).create(
          eq(Money.of("100.00")),
          eq(TransactionType.EXPENSE),
          eq("Groceries"),
          eq(accountId),
          eq(null),
          eq(categoryId)
      );
    }
  }

  @Nested
  class FindAll {

    @Test
    void shouldReturnAllTransactions() throws Exception {
      UUID accountId = UUID.randomUUID();

      Transaction transaction1 = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          accountId,
          null,
          null
      );

      Transaction transaction2 = Transaction.create(
          Money.of("2500.00"),
          TransactionType.INCOME,
          "Salary",
          Instant.now(),
          TransactionSource.MANUAL,
          accountId,
          null,
          null
      );

      when(service.findAll())
          .thenReturn(List.of(transaction1, transaction2));

      mockMvc.perform(
              get("/transactions")
                  .contentType(MediaType.APPLICATION_JSON)
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isArray())
          .andExpect(jsonPath("$.length()").value(2))
          .andExpect(jsonPath("$[0].id")
              .value(transaction1.getId().toString()))
          .andExpect(jsonPath("$[0].amount")
              .value(100.00))
          .andExpect(jsonPath("$[0].type")
              .value("EXPENSE"))
          .andExpect(jsonPath("$[1].id")
              .value(transaction2.getId().toString()))
          .andExpect(jsonPath("$[1].amount")
              .value(2500.00))
          .andExpect(jsonPath("$[1].type")
              .value("INCOME"));

      verify(service).findAll();
    }

    @Test
    void shouldReturnEmptyListWhenThereAreNoTransactions()
        throws Exception {
      when(service.findAll())
          .thenReturn(List.of());

      mockMvc.perform(
              get("/transactions")
                  .contentType(MediaType.APPLICATION_JSON)
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isArray())
          .andExpect(jsonPath("$.length()").value(0));

      verify(service).findAll();
    }
  }

  @Nested
  class FindById {

    @Test
    void shouldReturnTransactionById() throws Exception {
      UUID transactionId = UUID.randomUUID();
      UUID accountId = UUID.randomUUID();

      Transaction transaction = Transaction.create(
          Money.of("100.00"),
          TransactionType.EXPENSE,
          "Groceries",
          Instant.now(),
          TransactionSource.MANUAL,
          accountId,
          null,
          null
      );

      when(service.findById(transactionId))
          .thenReturn(Optional.of(transaction));

      mockMvc.perform(
              get("/transactions/{id}", transactionId)
                  .contentType(MediaType.APPLICATION_JSON)
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id")
              .value(transaction.getId().toString()))
          .andExpect(jsonPath("$.amount")
              .value(100.00))
          .andExpect(jsonPath("$.currency")
              .value("BRL"))
          .andExpect(jsonPath("$.type")
              .value("EXPENSE"))
          .andExpect(jsonPath("$.description")
              .value("Groceries"))
          .andExpect(jsonPath("$.source")
              .value("MANUAL"))
          .andExpect(jsonPath("$.accountId")
              .value(accountId.toString()));

      verify(service).findById(transactionId);
    }

    @Test
    void shouldReturnNotFoundWhenTransactionDoesNotExist()
        throws Exception {
      UUID transactionId = UUID.randomUUID();

      when(service.findById(transactionId))
          .thenReturn(Optional.empty());

      mockMvc.perform(
              get("/transactions/{id}", transactionId)
                  .contentType(MediaType.APPLICATION_JSON)
          )
          .andExpect(status().isNotFound());

      verify(service).findById(transactionId);
    }
  }
}