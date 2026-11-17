package com.pedro.ledger.domain.category;

public class CategoryNotFoundException extends RuntimeException {

  public CategoryNotFoundException() {
    super("Category not found");
  }
}
