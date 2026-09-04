package com.pedro.ledger.infrastructure.web.transaction;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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

  @Nested
  class Update {

    @Test
    void shouldUpdateTransaction() throws Exception {
      UUID transactionId = UUID.randomUUID();
      UUID accountId = UUID.randomUUID();
      UUID categoryId = UUID.randomUUID();
      UUID newCategoryId = UUID.randomUUID();

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

      Transaction updatedTransaction = Transaction.create(
          Money.of("150.00"),
          TransactionType.EXPENSE,
          "Groceries and household items",
          transaction.getTimestamp(),
          TransactionSource.MANUAL,
          accountId,
          null,
          newCategoryId
      );

      when(service.update(
          eq(transactionId),
          eq(Money.of("150.00")),
          eq("Groceries and household items"),
          eq(newCategoryId)
      )).thenReturn(updatedTransaction);

      mockMvc.perform(
              patch("/transactions/{id}", transactionId)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                {
                  "amount": 150.00,
                  "currency": "BRL",
                  "description": "Groceries and household items",
                  "categoryId": "%s"
                }
                """.formatted(newCategoryId))
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id")
              .value(updatedTransaction.getId().toString()))
          .andExpect(jsonPath("$.amount")
              .value(150.00))
          .andExpect(jsonPath("$.currency")
              .value("BRL"))
          .andExpect(jsonPath("$.type")
              .value("EXPENSE"))
          .andExpect(jsonPath("$.description")
              .value("Groceries and household items"))
          .andExpect(jsonPath("$.source")
              .value("MANUAL"))
          .andExpect(jsonPath("$.accountId")
              .value(accountId.toString()))
          .andExpect(jsonPath("$.categoryId")
              .value(newCategoryId.toString()));

      verify(service).update(
          eq(transactionId),
          eq(Money.of("150.00")),
          eq("Groceries and household items"),
          eq(newCategoryId)
      );
    }

    @Test
    void shouldReturnNotFoundWhenTransactionDoesNotExist()
        throws Exception {
      UUID transactionId = UUID.randomUUID();

      when(service.update(
          eq(transactionId),
          eq(Money.of("150.00")),
          eq("Updated description"),
          eq(null)
      )).thenThrow(
          new IllegalArgumentException("Transaction not found")
      );

      mockMvc.perform(
              patch("/transactions/{id}", transactionId)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                {
                  "amount": 150.00,
                  "currency": "BRL",
                  "description": "Updated description",
                  "categoryId": null
                }
                """)
          )
          .andExpect(status().isNotFound());

      verify(service).update(
          eq(transactionId),
          eq(Money.of("150.00")),
          eq("Updated description"),
          eq(null)
      );
    }
  }

  @Nested
  class Delete {

    @Test
    void shouldDeleteTransaction() throws Exception {
      UUID transactionId = UUID.randomUUID();

      doNothing().when(service).delete(transactionId);

      mockMvc.perform(
              delete("/transactions/{id}", transactionId)
          )
          .andExpect(status().isNoContent());

      verify(service).delete(transactionId);
    }

    @Test
    void shouldReturnNotFoundWhenTransactionDoesNotExist()
        throws Exception {
      UUID transactionId = UUID.randomUUID();

      doThrow(
          new IllegalArgumentException("Transaction not found")
      ).when(service).delete(transactionId);

      mockMvc.perform(
              delete("/transactions/{id}", transactionId)
          )
          .andExpect(status().isNotFound());

      verify(service).delete(transactionId);
    }
  }
}