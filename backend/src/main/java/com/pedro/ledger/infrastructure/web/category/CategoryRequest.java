package com.pedro.ledger.infrastructure.web.category;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO for create category request.
 */
public record CategoryRequest(
    @NotBlank
    String name
) {

}
