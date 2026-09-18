# Ledger

Personal finance management application for tracking accounts, transactions,
credit cards, investments, and financial insights.

## Overview

Ledger is a personal finance management system designed to centralize
financial information from multiple accounts and institutions while
providing tools to understand, organize, and analyze financial activity.

The project is being developed with a focus on software engineering
principles, domain modeling, automated testing, maintainability, and
eventual Open Finance integration.

## Current Status

🚧 In development

### Implemented

- Account management
    - Create accounts
    - Retrieve accounts
    - Update accounts
    - Deactivate accounts
    - Account domain validation
    - Account persistence

- Transaction management
    - Create transactions
    - Retrieve transactions
    - Update transactions
    - Delete transactions
    - Transaction domain validation
    - Transaction persistence
    - Manual transaction source

### In Progress

- Transaction processing
    - Apply income and expense transactions to account balances
    - Process account transfers
    - Ensure transactional consistency between transactions and accounts

### Planned

- Transaction cancellation and reversal
- Categories
- Credit card management
- Credit card invoices and payments
- Investments
- Financial insights and reports
- Open Finance integration
- Import and synchronization of bank transactions
- Auditing and financial history

## Architecture

Ledger follows a layered architecture inspired by Domain-Driven Design
and Hexagonal Architecture (Ports and Adapters).

```text
src/
├── main/
│   └── java/
│       └── com/pedro/ledger/
│           ├── domain/
│           │   ├── account/
│           │   ├── money/
│           │   └── transaction/
│           │
│           ├── application/
│           │   └── transaction/
│           │
│           └── infrastructure/
│               ├── persistence/
│               │   ├── account/
│               │   └── transaction/
│               │
│               └── web/
│                   ├── account/
│                   └── transaction/
│
└── test/
```

### Domain

Contains the core business model and rules.

The domain layer is independent from frameworks and infrastructure
concerns whenever possible.

### Application

Contains application services responsible for orchestrating use cases
and coordinating domain objects and ports.

### Infrastructure

Contains technical implementations such as:

- REST controllers
- JPA entities
- Spring Data repositories
- Persistence adapters
- Mappers
- External integrations

## Technology Stack

- Java 21
- Spring Boot
- Spring Data JPA
- PostgreSQL
- Maven
- Docker
- JUnit 5
- AssertJ
- Mockito
- Testcontainers

## Domain Concepts

### Account

Represents a financial account such as a checking or savings account.

An account contains:

- Identifier
- Name
- Type
- Status
- Balance
- Currency

### Transaction

Represents a financial movement associated with an account.

Supported transaction types:

- `INCOME`
- `EXPENSE`
- `TRANSFER`

Transactions also identify their source:

- `MANUAL`
- `OPEN_FINANCE`

Transfers additionally reference a destination account.

### Money

`Money` is a domain value object responsible for representing monetary
amounts together with their currency.

The application uses `BigDecimal` for monetary precision and currently
supports two decimal places.

## Testing

The project uses automated tests at different levels:

- Domain unit tests
- Application service unit tests
- Controller tests
- Persistence integration tests

Persistence integration tests use Testcontainers with PostgreSQL to
validate the interaction between the application and a real database
engine.

## Development

The project is currently under active development.

Features are implemented incrementally, with domain modeling and
automated tests being developed alongside application functionality.