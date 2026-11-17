package com.pedro.ledger.infrastructure.web.recurrence;

import com.pedro.ledger.application.recurrence.RecurrenceApplicationService;
import com.pedro.ledger.domain.recurrence.Recurrence;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller responsible for recurrence endpoints.
 */
@RestController
@RequestMapping("/recurrences")
public class RecurrenceController {

  private final RecurrenceApplicationService service;

  public RecurrenceController(RecurrenceApplicationService service) {
    this.service = service;
  }

  @PostMapping
  public ResponseEntity<RecurrenceResponse> create(
      @Valid
      @RequestBody CreateRecurrenceRequest request
  ) {
    Recurrence recurrence = service.create(
        request.amount(),
        request.currency(),
        request.type(),
        request.description(),
        request.accountId(),
        request.categoryId(),
        request.frequency(),
        request.startDate()
    );

    return ResponseEntity
        .status(HttpStatus.CREATED)
        .body(RecurrenceResponse.from(recurrence));
  }

  @GetMapping
  public ResponseEntity<List<RecurrenceResponse>> findAll() {
    List<RecurrenceResponse> recurrences = service.findAll()
        .stream()
        .map(RecurrenceResponse::from)
        .toList();

    return ResponseEntity.ok(recurrences);
  }

  @GetMapping("/{id}")
  public ResponseEntity<RecurrenceResponse> findById(
      @PathVariable UUID id
  ) {
    return service.findById(id)
        .map(RecurrenceResponse::from)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PatchMapping("/{id}")
  public ResponseEntity<RecurrenceResponse> update(
      @PathVariable UUID id,
      @Valid
      @RequestBody UpdateRecurrenceRequest request
  ) {
    Recurrence recurrence = service.update(
        id,
        request.amount(),
        request.description(),
        request.categoryId()
    );

    return ResponseEntity.ok(RecurrenceResponse.from(recurrence));
  }

  @PostMapping("/{id}/cancel")
  public ResponseEntity<RecurrenceResponse> cancel(
      @PathVariable UUID id
  ) {
    Recurrence recurrence = service.cancel(id);

    return ResponseEntity.ok(RecurrenceResponse.from(recurrence));
  }

  @PostMapping("/{id}/activation")
  public ResponseEntity<RecurrenceResponse> activate(
      @PathVariable UUID id
  ) {
    Recurrence recurrence = service.activate(id);

    return ResponseEntity.ok(RecurrenceResponse.from(recurrence));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID id
  ) {
    service.delete(id);

    return ResponseEntity.noContent().build();
  }
}
