package com.pedro.ledger.infrastructure.web.transaction;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pedro.ledger.application.transaction.TransactionApplicationService;
import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.transaction.Transaction;
import com.pedro.ledger.domain.transaction.TransactionSource;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.time.Instant;
import java.util.UUID;
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
        .andExpect(jsonPath("$.id").value(transaction.getId().toString()))
        .andExpect(jsonPath("$.amount").value(100.00))
        .andExpect(jsonPath("$.currency").value("BRL"))
        .andExpect(jsonPath("$.type").value("EXPENSE"))
        .andExpect(jsonPath("$.description").value("Groceries"))
        .andExpect(jsonPath("$.source").value("MANUAL"))
        .andExpect(jsonPath("$.accountId").value(accountId.toString()))
        .andExpect(jsonPath("$.destinationAccountId").isEmpty())
        .andExpect(jsonPath("$.categoryId").value(categoryId.toString()));

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