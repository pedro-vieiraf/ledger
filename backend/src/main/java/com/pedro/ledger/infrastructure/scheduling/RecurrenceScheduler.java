package com.pedro.ledger.infrastructure.scheduling;

import com.pedro.ledger.application.recurrence.RecurrenceApplicationService;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodically generates transactions for due recurrences.
 */
@Component
@ConditionalOnProperty(
    prefix = "ledger.recurrence",
    name = "scheduler-enabled",
    havingValue = "true",
    matchIfMissing = true
)
public class RecurrenceScheduler {

  private static final Logger LOGGER =
      LoggerFactory.getLogger(RecurrenceScheduler.class);

  private final RecurrenceApplicationService recurrenceApplicationService;
  private final ZoneId zoneId;

  public RecurrenceScheduler(
      RecurrenceApplicationService recurrenceApplicationService,
      @Value("${ledger.recurrence.zone-id:America/Sao_Paulo}")
      String zoneId
  ) {
    this.recurrenceApplicationService = recurrenceApplicationService;
    this.zoneId = ZoneId.of(zoneId);
  }

  /**
   * Processes every recurrence due on or before the current local date.
   *
   * <p>Each recurrence is processed in its own transaction by the application
   * service. A failure in one recurrence is logged and does not prevent the
   * others from being processed; the failed recurrence is retried on the next
   * execution.
   */
  @Scheduled(
      fixedDelayString = "${ledger.recurrence.scheduler-delay-ms:60000}",
      initialDelayString = "${ledger.recurrence.scheduler-initial-delay-ms:15000}"
  )
  public void generateDueTransactions() {
    LocalDate today = LocalDate.now(zoneId);
    List<UUID> dueRecurrenceIds;

    try {
      dueRecurrenceIds =
          recurrenceApplicationService.findDueRecurrenceIds(today);
    } catch (RuntimeException exception) {
      LOGGER.error(
          "Failed to load due recurrences for {}",
          today,
          exception
      );
      return;
    }

    for (UUID recurrenceId : dueRecurrenceIds) {
      try {
        recurrenceApplicationService.generatePendingOccurrences(
            recurrenceId,
            today,
            zoneId
        );
      } catch (RuntimeException exception) {
        LOGGER.error(
            "Failed to generate occurrences for recurrence {}",
            recurrenceId,
            exception
        );
      }
    }
  }
}
