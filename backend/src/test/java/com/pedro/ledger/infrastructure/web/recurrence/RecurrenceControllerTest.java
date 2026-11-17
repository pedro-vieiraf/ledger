package com.pedro.ledger.infrastructure.web.recurrence;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pedro.ledger.application.recurrence.RecurrenceApplicationService;
import com.pedro.ledger.domain.money.Money;
import com.pedro.ledger.domain.recurrence.Recurrence;
import com.pedro.ledger.domain.recurrence.RecurrenceFrequency;
import com.pedro.ledger.domain.recurrence.RecurrenceStatus;
import com.pedro.ledger.domain.transaction.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDate;
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

@WebMvcTest(RecurrenceController.class)
class RecurrenceControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private RecurrenceApplicationService service;

  private Recurrence recurrence(UUID accountId) {
    return Recurrence.create(
        Money.of("100.00"),
        TransactionType.EXPENSE,
        "Netflix",
        accountId,
        null,
        RecurrenceFrequency.MONTHLY,
        LocalDate.of(2026, 8, 21)
    );
  }

  @Nested
  class Create {

    @Test
    void shouldCreateRecurrence() throws Exception {
      UUID accountId = UUID.randomUUID();
      Recurrence recurrence = recurrence(accountId);

      when(service.create(
          eq(new BigDecimal("100.00")),
          eq("BRL"),
          eq(TransactionType.EXPENSE),
          eq("Netflix"),
          eq(accountId),
          eq(null),
          eq(RecurrenceFrequency.MONTHLY),
          eq(LocalDate.of(2026, 8, 21))
      )).thenReturn(recurrence);

      mockMvc.perform(
              post("/recurrences")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                      {
                        "amount": 100.00,
                        "currency": "BRL",
                        "type": "EXPENSE",
                        "description": "Netflix",
                        "accountId": "%s",
                        "frequency": "MONTHLY",
                        "startDate": "2026-08-21"
                      }
                      """.formatted(accountId))
          )
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.id")
              .value(recurrence.getId().toString()))
          .andExpect(jsonPath("$.amount").value(100.00))
          .andExpect(jsonPath("$.currency").value("BRL"))
          .andExpect(jsonPath("$.type").value("EXPENSE"))
          .andExpect(jsonPath("$.frequency").value("MONTHLY"))
          .andExpect(jsonPath("$.startDate").value("2026-08-21"))
          .andExpect(jsonPath("$.nextOccurrence").value("2026-08-21"))
          .andExpect(jsonPath("$.status").value("ACTIVE"));

      verify(service).create(
          eq(new BigDecimal("100.00")),
          eq("BRL"),
          eq(TransactionType.EXPENSE),
          eq("Netflix"),
          eq(accountId),
          eq(null),
          eq(RecurrenceFrequency.MONTHLY),
          eq(LocalDate.of(2026, 8, 21))
      );
    }

    @Test
    void shouldRejectTransferRecurrence() throws Exception {
      UUID accountId = UUID.randomUUID();

      when(service.create(
          any(),
          any(),
          eq(TransactionType.TRANSFER),
          any(),
          eq(accountId),
          any(),
          any(),
          any()
      )).thenThrow(new IllegalArgumentException(
          "Recurrence cannot have transfer type"
      ));

      mockMvc.perform(
              post("/recurrences")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                      {
                        "amount": 100.00,
                        "type": "TRANSFER",
                        "accountId": "%s",
                        "frequency": "MONTHLY",
                        "startDate": "2026-08-21"
                      }
                      """.formatted(accountId))
          )
          .andExpect(status().isBadRequest());
    }
  }

  @Nested
  class Read {

    @Test
    void shouldListRecurrences() throws Exception {
      Recurrence recurrence = recurrence(UUID.randomUUID());

      when(service.findAll()).thenReturn(List.of(recurrence));

      mockMvc.perform(get("/recurrences"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$[0].id")
              .value(recurrence.getId().toString()));
    }

    @Test
    void shouldFindRecurrenceById() throws Exception {
      Recurrence recurrence = recurrence(UUID.randomUUID());

      when(service.findById(recurrence.getId()))
          .thenReturn(Optional.of(recurrence));

      mockMvc.perform(get("/recurrences/{id}", recurrence.getId()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id")
              .value(recurrence.getId().toString()));
    }

    @Test
    void shouldReturnNotFound() throws Exception {
      UUID id = UUID.randomUUID();

      when(service.findById(id)).thenReturn(Optional.empty());

      mockMvc.perform(get("/recurrences/{id}", id))
          .andExpect(status().isNotFound());
    }
  }

  @Nested
  class Update {

    @Test
    void shouldUpdateRecurrence() throws Exception {
      Recurrence recurrence = recurrence(UUID.randomUUID());

      when(service.update(
          eq(recurrence.getId()),
          eq(new BigDecimal("120.00")),
          eq("Netflix Premium"),
          eq(null)
      )).thenReturn(recurrence);

      mockMvc.perform(
              patch("/recurrences/{id}", recurrence.getId())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("""
                      {
                        "amount": 120.00,
                        "description": "Netflix Premium"
                      }
                      """)
          )
          .andExpect(status().isOk());
    }
  }

  @Nested
  class CancelAndActivate {

    @Test
    void shouldCancelRecurrence() throws Exception {
      Recurrence recurrence = recurrence(UUID.randomUUID());
      recurrence.deactivate();

      when(service.cancel(recurrence.getId()))
          .thenReturn(recurrence);

      mockMvc.perform(
              post("/recurrences/{id}/cancel", recurrence.getId())
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.status").value("INACTIVE"));
    }

    @Test
    void shouldActivateRecurrence() throws Exception {
      Recurrence recurrence = recurrence(UUID.randomUUID());

      when(service.activate(recurrence.getId()))
          .thenReturn(recurrence);

      mockMvc.perform(
              post("/recurrences/{id}/activation", recurrence.getId())
          )
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.status").value(
              RecurrenceStatus.ACTIVE.name()
          ));
    }
  }

  @Nested
  class Delete {

    @Test
    void shouldDeleteRecurrence() throws Exception {
      UUID id = UUID.randomUUID();

      mockMvc.perform(delete("/recurrences/{id}", id))
          .andExpect(status().isNoContent());

      verify(service).delete(id);
    }
  }
}
