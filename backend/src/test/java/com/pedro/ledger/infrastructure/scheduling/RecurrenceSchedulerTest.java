package com.pedro.ledger.infrastructure.scheduling;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pedro.ledger.application.recurrence.RecurrenceApplicationService;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class RecurrenceSchedulerTest {

  private static final ZoneId ZONE_ID = ZoneId.of("UTC");

  @Mock
  private RecurrenceApplicationService service;

  private RecurrenceScheduler scheduler;

  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);

    scheduler = new RecurrenceScheduler(service, ZONE_ID.getId());
  }

  @Test
  void shouldProcessEveryDueRecurrence() {
    UUID first = UUID.randomUUID();
    UUID second = UUID.randomUUID();

    when(service.findDueRecurrenceIds(any(LocalDate.class)))
        .thenReturn(List.of(first, second));

    scheduler.generateDueTransactions();

    verify(service).generatePendingOccurrences(
        eq(first),
        any(LocalDate.class),
        eq(ZONE_ID)
    );

    verify(service).generatePendingOccurrences(
        eq(second),
        any(LocalDate.class),
        eq(ZONE_ID)
    );
  }

  @Test
  void shouldContinueWhenOneRecurrenceFails() {
    UUID failing = UUID.randomUUID();
    UUID healthy = UUID.randomUUID();

    when(service.findDueRecurrenceIds(any(LocalDate.class)))
        .thenReturn(List.of(failing, healthy));

    doThrow(new RuntimeException("generation failed"))
        .when(service)
        .generatePendingOccurrences(
            eq(failing),
            any(LocalDate.class),
            eq(ZONE_ID)
        );

    scheduler.generateDueTransactions();

    verify(service).generatePendingOccurrences(
        eq(healthy),
        any(LocalDate.class),
        eq(ZONE_ID)
    );
  }

  @Test
  void shouldNotThrowWhenDueRecurrenceLookupFails() {
    when(service.findDueRecurrenceIds(any(LocalDate.class)))
        .thenThrow(new RuntimeException("database unavailable"));

    scheduler.generateDueTransactions();
  }
}
