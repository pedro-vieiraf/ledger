# Ledger

Ledger is a personal finance management application designed to provide a simple and structured way to manage accounts, categories, and financial transactions.

The project is being developed as a portfolio project with a strong focus on backend engineering, domain modeling, clean architecture, automated testing, and maintainability.

The current version focuses on a fully manual financial management workflow.

---

## Status

**Current version: V1.0.0**

The V1.0 backend is complete and provides the core functionality required to manually manage personal finances through a REST API.

The current release does not include Open Finance integration, mobile-specific functionality, recurring transactions, notifications, or a frontend.

The next development phase is focused on building a basic frontend that can be used both on desktop and mobile devices.

---

## Goals

The main goals of Ledger are:

- Manage personal financial accounts.
- Track income, expenses, and transfers.
- Organize transactions using categories.
- Keep account balances synchronized with transactions.
- Provide a clear and consistent domain model.
- Maintain financial history.
- Provide a REST API that can be consumed by different clients.
- Serve as a practical backend engineering portfolio project.
- Eventually provide a convenient interface for both desktop and mobile use.

---

## Current Features

### Accounts

Accounts represent financial sources such as bank accounts, cash, savings accounts, and other financial accounts.

Current functionality:

- Create an account.
- List accounts.
- Find an account by ID.
- Update account name and type.
- Deactivate an account.
- Maintain the account balance.
- Support different currencies at the domain level.
- Prevent operations on inactive accounts.

Account deletion is implemented as deactivation rather than physical deletion.

This preserves the historical relationship between accounts and their transactions.

---

### Categories

Categories are used to organize transactions.

Current functionality:

- Create a category.
- List categories.
- Find a category by ID.
- Rename a category.
- Delete a category.

Examples:

- Food
- Transportation
- Housing
- Entertainment
- Salary
- Investments

Categories are optional for transactions.

---

### Transactions

Transactions represent financial movements associated with accounts.

The current system supports three transaction types:

- `EXPENSE`
- `INCOME`
- `TRANSFER`

#### Expense

An expense decreases the balance of an account.

Example:

```text
Account balance: R$ 1,000.00
Expense:         R$   100.00
New balance:     R$   900.00
```

#### Income

An income increases the balance of an account.

Example:

```text
Account balance: R$ 1,000.00
Income:          R$   500.00
New balance:     R$ 1,500.00
```

#### Transfer

A transfer moves money between two accounts.

Example:

```text
Checking Account: R$ 1,000.00
Savings Account:  R$   500.00

Transfer:         R$   200.00

Checking Account: R$   800.00
Savings Account:  R$   700.00
```

Transfers cannot have a category.

A transfer to another person is represented as an expense rather than as a transfer between Ledger accounts.

---

### Transaction Updates

Manual transactions can be updated after creation.

Currently supported:

- Change amount.
- Change description.
- Change category.

When the amount of a transaction changes, the affected account balance is adjusted accordingly.

For example:

```text
Original expense: R$ 100.00
Updated expense:  R$ 150.00

Additional balance impact: -R$ 50.00
```

Transactions imported from Open Finance are not currently implemented, but the domain model already distinguishes manual transactions from Open Finance transactions.

---

### Transaction Deletion

Deleting a transaction also reverses its financial effect before removing the transaction from persistence.

For example:

```text
Account balance: R$ 900.00
Existing expense: R$ 100.00

Delete expense

Account balance: R$ 1,000.00
Transaction: removed
```

For transfers, both affected accounts are restored.

This prevents an account balance from retaining a financial effect that is no longer represented by an existing transaction.

---

## Architecture

Ledger follows a layered architecture centered around the domain model.

```text
src/main/java/com/pedro/ledger
│
├── application
│   ├── account
│   ├── category
│   └── transaction
│
├── domain
│   ├── account
│   ├── category
│   ├── money
│   ├── recurrence
│   └── transaction
│
└── infrastructure
    ├── persistence
    │   ├── account
    │   ├── category
    │   └── transaction
    │
    └── web
        ├── account
        ├── category
        ├── exception
        └── transaction
```

The main dependency direction is:

```text
Web
 ↓
Application
 ↓
Domain
 ↑
Infrastructure
```

The domain contains the core business rules and does not depend on Spring, JPA, HTTP, or PostgreSQL.

---

## Domain Model

### Money

Financial amounts are represented using `BigDecimal` through the `Money` value object.

`Money` is responsible for:

- Monetary precision.
- Currency.
- Addition.
- Subtraction.
- Multiplication.
- Division.
- Comparison.
- Currency compatibility.
- Zero and negative-value checks.

Amounts are restricted to two decimal places.

Example:

```java
Money money = Money.of("1000.00");
```

The default currency is BRL.

The model also supports explicit currencies:

```java
Money money = Money.of(
    new BigDecimal("1000.00"),
    Currency.getInstance("USD")
);
```

Currency conversion is not currently implemented.

---

### Account

An account contains:

- UUID
- Name
- Account type
- Status
- Balance

Account statuses currently include:

```text
ACTIVE
INACTIVE
```

Account balances can be modified through domain operations such as credit and debit.

The domain prevents financial operations against inactive accounts.

---

### Transaction

A transaction contains:

- UUID
- Amount
- Type
- Status
- Description
- Timestamp
- Source
- Account ID
- Destination account ID
- Category ID

Transaction types:

```text
EXPENSE
INCOME
TRANSFER
```

Transaction statuses:

```text
ACTIVE
REVERSED
```

Transaction sources:

```text
MANUAL
OPEN_FINANCE
```

The `OPEN_FINANCE` source exists in the domain model to establish a clear distinction between manually created transactions and future imported transactions.

Open Finance integration itself is not part of V1.0.

---

## Business Rules

Some of the main rules currently enforced by the domain include:

### Amounts

- Transaction amounts must be greater than zero.
- Monetary values support two decimal places.
- Operations involving different currencies are rejected.
- Account and transaction currencies must be compatible.

### Accounts

- Account names cannot be blank.
- Accounts have a type and status.
- Inactive accounts cannot perform financial operations.
- Deactivating an account does not remove its transaction history.

### Transactions

- Every transaction must have an account.
- Transfers require a destination account.
- A transfer cannot use the same account as both source and destination.
- Transfers cannot have categories.
- Descriptions are normalized.
- Manual transaction amounts can be changed.
- Open Finance transaction amounts cannot be changed.
- Reversed transactions cannot be modified.

---

## REST API

The backend exposes a REST API.

### Accounts

```text
POST   /accounts
GET    /accounts
GET    /accounts/{id}
PATCH  /accounts/{id}
DELETE /accounts/{id}
```

### Categories

```text
POST   /categories
GET    /categories
GET    /categories/{id}
PATCH  /categories/{id}
DELETE /categories/{id}
```

### Transactions

```text
POST   /transactions
GET    /transactions
GET    /transactions/{id}
PATCH  /transactions/{id}
DELETE /transactions/{id}
```

---

## Example Requests

### Create Account

```http
POST /accounts
Content-Type: application/json
```

```json
{
  "name": "Checking Account",
  "type": "CHECKING",
  "openingBalance": 1000.00,
  "currency": "BRL"
}
```

---

### Create Category

```http
POST /categories
Content-Type: application/json
```

```json
{
  "name": "Food"
}
```

---

### Create Expense

```http
POST /transactions
Content-Type: application/json
```

```json
{
  "amount": 50.00,
  "currency": "BRL",
  "type": "EXPENSE",
  "description": "Lunch",
  "accountId": "ACCOUNT_UUID",
  "categoryId": "CATEGORY_UUID"
}
```

---

### Create Income

```http
POST /transactions
Content-Type: application/json
```

```json
{
  "amount": 3000.00,
  "currency": "BRL",
  "type": "INCOME",
  "description": "Salary",
  "accountId": "ACCOUNT_UUID"
}
```

---

### Create Transfer

```http
POST /transactions
Content-Type: application/json
```

```json
{
  "amount": 500.00,
  "currency": "BRL",
  "type": "TRANSFER",
  "description": "Move money to savings",
  "accountId": "SOURCE_ACCOUNT_UUID",
  "destinationAccountId": "DESTINATION_ACCOUNT_UUID"
}
```

---

## Validation and Error Handling

Request validation is handled using Jakarta Bean Validation.

Examples include:

- Required fields.
- Non-blank names.
- Positive transaction amounts.
- Valid account types.
- Valid transaction types.

Domain and application exceptions are translated into HTTP responses through a global exception handler.

Current examples include:

```text
400 Bad Request
403 Forbidden
404 Not Found
```

---

## Persistence

Ledger uses:

- PostgreSQL
- Spring Data JPA
- Hibernate

Persistence is separated from the domain through entities, mappers, and repository implementations.

The domain model is therefore not directly coupled to JPA entities.

The general persistence flow is:

```text
Domain Object
     ↓
Mapper
     ↓
JPA Entity
     ↓
Repository
     ↓
PostgreSQL
```

And in the opposite direction:

```text
PostgreSQL
     ↓
JPA Entity
     ↓
Mapper
     ↓
Domain Object
```

---

## Database

The application is designed to run with PostgreSQL through Docker Compose.

The Docker environment contains:

```text
ledger-app
postgres
```

PostgreSQL is used as the application's persistent relational database.

---

## Docker

The backend uses a multi-stage Docker build.

The build environment uses:

```text
Maven 3.9.16
Eclipse Temurin Java 21
```

The runtime image uses:

```text
Eclipse Temurin 21 JRE
```

The project also includes Docker Compose for running the application together with PostgreSQL.

---

## Technology Stack

### Backend

- Java 21
- Spring Boot 4.0.7
- Spring Web
- Spring Validation
- Spring Data JPA
- Hibernate
- PostgreSQL

### Testing

- JUnit 5
- AssertJ
- Mockito
- Spring Boot Test
- Testcontainers

### Build

- Maven 3.9.16

### Infrastructure

- Docker
- Docker Compose

---

## Testing

The project uses automated tests at multiple levels.

```text
src/test/java/com/pedro/ledger
│
├── application
│   ├── account
│   ├── category
│   └── transaction
│
├── domain
│   ├── account
│   ├── category
│   ├── money
│   ├── recurrence
│   └── transaction
│
└── infrastructure
    ├── persistence
    │   ├── account
    │   ├── category
    │   └── transaction
    │
    └── web
        ├── account
        ├── category
        └── transaction
```

The test suite covers:

- Domain rules.
- Money operations.
- Account behavior.
- Category behavior.
- Transaction behavior.
- Transaction processing.
- Application services.
- Persistence mappings.
- Persistence repositories.
- REST controllers.
- Request validation.

Run the complete test suite with:

```bash
mvn verify
```

---

## Running Locally

### Requirements

Install:

- Java 21
- Maven 3.9+
- Docker
- Docker Compose

---

### Clone the repository

```bash
git clone <repository-url>
cd ledger
```

---

### Run the tests

```bash
mvn verify
```

---

### Run with Maven

```bash
mvn spring-boot:run
```

---

### Run with Docker Compose

```bash
docker compose up --build
```

To run in the background:

```bash
docker compose up --build -d
```

To stop the containers:

```bash
docker compose down
```

---

## Project Structure

The project separates business logic from infrastructure concerns.

### `domain`

Contains the business model and business rules.

This layer should remain independent of frameworks and external infrastructure.

### `application`

Contains application use cases.

Application services coordinate domain objects and repositories to execute operations requested by the outside world.

### `infrastructure`

Contains implementations that interact with external systems.

This currently includes:

- REST controllers.
- HTTP DTOs.
- Exception handling.
- JPA entities.
- Repository implementations.
- Database mapping.

---

## Current Limitations

V1.0 intentionally keeps the scope limited.

The following are not implemented yet:

- Open Finance integration.
- Automatic bank transaction imports.
- Recurring transaction generation.
- Notifications.
- Mobile application.
- Dedicated frontend.
- Multi-user authentication.
- Authorization.
- Advanced reporting.
- Budget management.
- Automatic category detection.
- Currency conversion.
- Bank synchronization.
- Advanced audit history.
- Automated financial reconciliation.

These are possible future features and are not required for the V1.0 manual workflow.

---

## Roadmap

### V1.0 — Manual Finance Management

**Status: Complete**

Core backend functionality:

- [x] Money domain
- [x] Account domain
- [x] Category domain
- [x] Transaction domain
- [x] Transaction processing
- [x] Persistence
- [x] Application services
- [x] REST API
- [x] Validation
- [x] Exception handling
- [x] Automated tests
- [x] Docker environment

---

### V1.1 — Basic User Interface

The next phase will focus on creating a basic frontend for actual daily use.

Initial goals:

- [ ] Account dashboard
- [ ] Account creation and editing
- [ ] Category management
- [ ] Transaction creation
- [ ] Transaction editing
- [ ] Transaction deletion
- [ ] Transaction list
- [ ] Basic balance visualization
- [ ] Responsive layout
- [ ] Mobile-friendly interface

The frontend will communicate with the existing REST API.

---

### Mobile

The long-term goal is to make Ledger practical to use on a smartphone as well as a computer.

The first approach will be to make the frontend responsive and potentially installable as a Progressive Web App (PWA).

The intended architecture is:

```text
                    ┌──────────────────┐
                    │   Web Frontend   │
                    │ React + TypeScript│
                    └────────┬─────────┘
                             │
                             │ REST API
                             │
                    ┌────────▼─────────┐
                    │   Ledger API     │
                    │ Java + Spring    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   PostgreSQL     │
                    └──────────────────┘
```

The same frontend can then be used from:

```text
Desktop browser
       │
       ├──────────────┐
       │              │
       ▼              ▼
   Computer        Smartphone
```

A dedicated native mobile application can be considered later if the project needs capabilities that a responsive web application or PWA cannot provide conveniently.

---

## Future Architecture

The backend is intentionally structured so that future clients can consume the same API.

Possible clients include:

```text
                 ┌───────────────┐
                 │  Web Frontend │
                 └───────┬───────┘
                         │
                 ┌───────▼───────┐
                 │               │
                 │  Ledger API   │
                 │               │
                 └───────┬───────┘
                         │
              ┌──────────┴──────────┐
              │                     │
       ┌──────▼──────┐       ┌──────▼──────┐
       │ PostgreSQL  │       │ Future APIs │
       └─────────────┘       └─────────────┘
```

The separation between frontend and backend means that the UI can evolve independently from the core financial domain.

---

## Design Principles

Ledger is being developed with the following principles:

### Domain-first design

Business rules should live in the domain model rather than being scattered across controllers or persistence code.

### Separation of concerns

The application separates:

- Domain logic.
- Application orchestration.
- HTTP concerns.
- Persistence concerns.

### Explicit business rules

Financial operations such as credit, debit, transfers, amount changes, and reversals are represented explicitly instead of relying on controllers to manipulate balances directly.

### Automated testing

Business rules and application behavior should be covered by automated tests.

### Incremental development

Features are introduced incrementally instead of attempting to build the entire financial platform at once.

---

## Versioning

The project follows semantic versioning:

```text
MAJOR.MINOR.PATCH
```

The current release is:

```text
1.0.0
```

---

## License

This project is currently a personal portfolio project.

License information can be added when the project is prepared for public distribution.