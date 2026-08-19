# Ledger — Project & Domain Specification

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-08-19

---

# 1. Project Vision

Ledger is a personal finance management application designed to centralize
and organize the user's financial life in a single system.

The primary goal is to provide a clear and reliable view of the user's
financial situation while minimizing the amount of manual data entry required.

Ledger should allow the user to understand:

- How much money they currently have.
- Where their money is.
- How much they spend.
- Where they spend it.
- How they organize their expenses.
- How much they are expected to spend in the future.
- How much they owe through credit cards and other obligations.
- How their financial situation changes over time.
- How their accounts, credit cards, investments, and other financial assets
  are related.

The system should initially support manual financial management while being
architecturally prepared for future integration with Open Finance providers.

The project is primarily personal but will also serve as a professional
software engineering portfolio project.

---

# 2. Goals

## 2.1 Primary Goals

Ledger should:

- Centralize financial information from multiple accounts and institutions.
- Track income, expenses, transfers, purchases, payments, and other
  financial movements.
- Provide an accurate representation of the user's current financial
  position.
- Support credit card management.
- Support invoices and installment purchases.
- Support recurring financial operations.
- Support refunds and cancellations.
- Organize financial transactions using categories.
- Provide financial reports and visualizations.
- Maintain an auditable history of important financial operations.
- Minimize manual data entry when automated financial integrations become
  available.
- Be architecturally prepared for future Open Finance integration.
- Continue operating correctly without requiring the user to keep the
  application open.
- Eventually support notifications and background synchronization.

## 2.2 Engineering Goals

The project should also serve as a practical exercise in professional
software engineering.

The system should emphasize:

- Domain modeling.
- Clean and maintainable code.
- Automated testing.
- Test-Driven Development (TDD).
- Appropriate architectural boundaries.
- Security.
- Observability.
- Maintainability.
- Containerized development.
- API documentation.
- Clear architectural decisions.
- Production-oriented engineering practices.

The system should avoid unnecessary complexity and premature optimization.

---

# 3. Scope

## 3.1 Initial Scope

The initial version of Ledger will focus on:

- Financial accounts.
- Transactions.
- Income.
- Expenses.
- Transfers.
- Categories.
- Credit cards.
- Credit card invoices.
- Installment purchases.
- Recurring transactions.
- Refunds.
- Cancellations.
- Current balances.
- Financial reports.
- Audit history.

## 3.2 Future Scope

The following capabilities are intentionally planned for future versions:

- Open Finance integration.
- Automatic transaction synchronization.
- Automatic invoice synchronization.
- Automatic account balance synchronization.
- Automatic transaction categorization.
- Notifications.
- Mobile application.
- Desktop application capabilities.
- Multi-currency support.
- Advanced financial analytics.
- Potential AI-assisted financial categorization and insights.

## 3.3 Out of Scope for the Initial Version

The initial version will not attempt to implement:

- Full accounting software.
- Double-entry bookkeeping.
- Currency conversion.
- A public multi-user financial platform.
- Complex tax management.
- Enterprise financial management.
- Complex investment trading functionality.

The system may be extended in the future if requirements change.

---

# 4. Functional Requirements

## 4.1 Account Management

The system must allow the user to manage multiple financial accounts.

An account represents a financial location where money can be held or
managed.

Examples include:

- Checking accounts.
- Savings accounts.
- Digital bank accounts.
- Investment accounts.
- Other financial accounts.

Each account should maintain its own balance and financial history.

---

## 4.2 Transaction Management

The system must support financial transactions representing movements or
financial events.

Transactions may represent:

- Income.
- Expenses.
- Transfers.
- Purchases.
- Payments.
- Refunds.
- Other relevant financial events.

Transactions must contain sufficient information to determine their
financial effect and allow them to be categorized and analyzed.

---

## 4.3 Income

The system must support income transactions.

Examples:

- Salary.
- Freelance income.
- Investment income.
- Other incoming funds.

Income must increase the balance of the relevant account when the
transaction is considered settled.

---

## 4.4 Expenses

The system must support expense transactions.

Examples:

- Groceries.
- Restaurants.
- Rent.
- Transportation.
- Bills.
- Purchases.
- Transfers to other people.

Expenses must decrease the balance of the relevant account when the
transaction is considered settled.

---

## 4.5 Transfers

The system must distinguish between transfers involving the user's own
accounts and transfers to third parties.

### Internal Transfer

A transfer between two accounts belonging to the user:

```text
Account A
   |
   | - R$ 1,000
   v
Account B
   |
   | + R$ 1,000
```

An internal transfer must not be considered income or expense.

### External Transfer

A transfer from the user's account to another person or external recipient
is considered an expense.

Example:

```text
User Account
   |
   | - R$ 500
   v
Third Party
```

This must be represented as an expense for financial analysis purposes.

---

# 5. Credit Card Domain

## 5.1 Credit Card Purchases

Credit card purchases represent financial commitments but do not immediately
decrease the balance of the user's bank account.

Example:

```text
Current bank balance:
R$ 5,000

Credit card purchase:
R$ 500
```

After the purchase:

```text
Bank balance:
R$ 5,000

Credit card obligation:
R$ 500
```

The purchase must appear in financial expense reports, but it must not be
deducted from the bank account balance at the time of purchase.

---

## 5.2 Invoice

An invoice represents a credit card billing period and consolidates the
purchases and installment amounts that belong to that billing period.

An invoice should contain information such as:

- Billing period.
- Closing date.
- Due date.
- Total amount.
- Payment status.
- Associated credit card.
- Included purchases or installments.

Example:

```text
August Invoice

Groceries        R$ 200
Uber              R$ 30
Restaurant        R$ 80
Amazon           R$ 300
------------------------
Total            R$ 610
```

---

## 5.3 Invoice Payment

Paying an invoice represents the settlement of the credit card obligation.

When the user pays an invoice:

```text
Bank Account
    |
    | - R$ 610
    v
Credit Card Invoice
    |
    | settled
```

The payment must decrease the balance of the source bank account.

The invoice payment must not create a second expense, because the purchases
included in the invoice have already been recorded as expenses.

---

## 5.4 Installments

An installment represents one portion of a purchase that has been divided
into multiple payments.

Example:

```text
Laptop
Total: R$ 2,400
12 installments of R$ 200
```

This represents one purchase with twelve installments:

```text
1/12 -> R$ 200
2/12 -> R$ 200
3/12 -> R$ 200
...
12/12 -> R$ 200
```

Each installment may belong to a different credit card invoice.

An installment is not an independent purchase.

---

# 6. Recurring Transactions

Ledger must support recurring financial operations.

Examples:

- Salary.
- Rent.
- Internet.
- Streaming subscriptions.
- Gym membership.
- Other periodic financial operations.

A recurring transaction differs from an installment.

### Installment

Has a defined number of occurrences:

```text
1/12
2/12
...
12/12
```

### Recurring Transaction

Continues according to a recurrence rule until it is stopped or otherwise
terminated.

The recurrence model should support common frequencies such as:

- Monthly.
- Weekly.
- Yearly.
- Other frequencies when required.

The exact recurrence rule model is TBD.

---

# 7. Refunds and Cancellations

Ledger must distinguish between cancellations and refunds.

## 7.1 Cancellation

A cancelled financial operation is an operation that should no longer be
considered valid or effective.

Cancellation must not be treated as a normal new income transaction.

## 7.2 Refund

A refund occurs when a previously completed financial operation is reversed
and money is returned to the user.

Example:

```text
Original purchase:
Amazon
- R$ 500

Refund:
Amazon
+ R$ 500
```

A refund must be associated with the original transaction whenever possible.

Refunds are not ordinary income for financial analysis purposes.

The system should preserve the relationship between the original operation
and its refund.

---

# 8. Balance Model

## 8.1 Current Balance

The system must provide the user's current balance for each relevant
financial account.

The current balance must represent money that is actually available or
held in the account according to the system's settlement rules.

Credit card purchases must not immediately decrease the bank account's
current balance.

Debit, PIX, account withdrawals, and other settled movements must affect
the appropriate account balance.

---

## 8.2 Calculated Balance

Ledger should be capable of calculating an account balance based on the
financial movements recorded by the system.

Conceptually:

```text
Initial Balance
+ Settled Income
- Settled Expenses
+/- Other Settled Movements
= Calculated Balance
```

The exact calculation rules will be defined as the domain model evolves.

---

## 8.3 External Bank Balance

When Open Finance integration becomes available, the system may receive an
externally reported balance from the financial institution.

Example:

```text
Ledger calculated balance:
R$ 5,000

Bank reported balance:
R$ 5,000
```

Ideally these values should match.

However, Ledger must not assume that they will always be identical.

If a discrepancy exists:

```text
Calculated:
R$ 5,000

Bank:
R$ 4,950

Difference:
-R$ 50
```

the system should detect and expose the discrepancy.

This process is part of financial reconciliation.

Possible causes include:

- Missing transactions.
- Duplicated transactions.
- Pending transactions.
- Bank adjustments.
- Fees.
- Synchronization delays.
- Import failures.

The reconciliation mechanism will be developed alongside the Open Finance
integration.

---

# 9. Categories

Transactions must be categorizable.

Categories are essential to financial analysis and reporting.

Examples:

```text
Food
├── Groceries
├── Restaurants
└── Delivery

Transportation
├── Fuel
├── Public Transport
└── Ride Sharing

Housing
├── Rent
├── Electricity
├── Internet
└── Maintenance
```

The system should support hierarchical categories.

Automatic categorization is not required initially.

The user may manually categorize transactions.

Future versions may support:

- Automatic categorization.
- Rule-based categorization.
- AI-assisted categorization.

---

# 10. Multi-Currency

The initial implementation will focus on BRL.

Multi-currency functionality will not be implemented initially.

However, the domain model should avoid unnecessarily coupling the entire
system to a single currency.

Accounts should be designed with the possibility of having an associated
currency in the future.

Currency conversion and exchange-rate management are outside the initial
scope.

---

# 11. Audit & Observability

Ledger must maintain an audit history for important financial operations.

The audit system should be useful for understanding how significant
changes occurred without becoming an unnecessarily complex event logging
system.

Potential audit events include:

- Transaction created.
- Transaction modified.
- Transaction cancelled.
- Transaction refunded.
- Transaction categorized.
- Transaction imported.
- Invoice created.
- Invoice paid.
- Account modified.
- Synchronization performed.

An audit event should contain enough information to identify:

- When the event occurred.
- What action occurred.
- Which entity was affected.
- Which entity instance was affected.
- Who or what performed the action.
- Relevant metadata.

The exact audit implementation is TBD.

---

# 12. Open Finance Integration Strategy

Open Finance is a future capability and must not be required for the initial
application to function.

The architecture should allow financial data obtained from external
institutions to enter the system without requiring a major redesign of the
domain.

Potential future capabilities include:

- Account synchronization.
- Transaction synchronization.
- Credit card synchronization.
- Invoice synchronization.
- Invoice closing date synchronization.
- Invoice due date synchronization.
- External balance synchronization.
- Investment account synchronization.
- Automatic transaction updates.

The system should support identifying externally imported transactions so
that repeated synchronization does not create duplicate financial records.

The exact Open Finance provider, integration protocol, and synchronization
strategy are TBD.

---

# 13. Background Processing

Ledger must not depend on the user opening the application for important
background operations.

Future background operations may include:

- Synchronization.
- Recurring transaction generation.
- Financial reconciliation.
- Invoice status updates.
- Notification generation.
- Other scheduled tasks.

The architecture should therefore support background processing independently
from the user interface.

---

# 14. Notifications

Notifications are a future capability.

Potential notifications include:

- Credit card invoice closing.
- Credit card invoice due date.
- Upcoming recurring expenses.
- Account balance warnings.
- Synchronization failures.
- Reconciliation discrepancies.
- Other relevant financial events.

The notification system must not require the application to remain open.

The initial implementation is TBD.

---

# 15. Financial Reporting

Ledger should provide financial insights and visualizations.

Potential reports include:

- Expenses by category.
- Income vs. expenses.
- Monthly spending.
- Spending over time.
- Credit card spending.
- Upcoming invoice obligations.
- Recurring expenses.
- Account balances.
- Investment balances.
- Financial trends.

The exact report set will be defined as the MVP is designed.

---

# 16. Architecture

The initial backend architecture will use a modular monolith.

The system should maintain clear boundaries between domain areas without
introducing microservices prematurely.

The initial architecture should prioritize:

- High cohesion.
- Low coupling.
- Explicit domain boundaries.
- Testability.
- Maintainability.
- Simplicity.

Microservices are not part of the initial architecture.

The exact module structure is TBD and will be defined during architectural
design.

---

# 17. Technology Stack

## Backend

- Java.
- Spring Boot.
- Spring ecosystem components when justified by project requirements.
- Maven.

## Database

- PostgreSQL.

## Frontend

- React.
- TypeScript.

## Infrastructure

- Docker.
- Docker Compose for local development.

## API Documentation

- OpenAPI / Swagger.

## Testing

The project will use automated testing and Test-Driven Development where
appropriate.

The testing stack will include appropriate Java testing technologies such
as:

- JUnit.
- Mockito.
- AssertJ.
- Integration testing.
- Testcontainers where appropriate.

The exact testing architecture is TBD.

---

# 18. Money Representation

Monetary values must not be represented using floating-point primitive
types such as `double` or `float`.

Java's `BigDecimal` will be used for monetary calculations.

Monetary values must be handled with explicit precision and appropriate
rounding rules.

The exact monetary scale and rounding policies are TBD and will be defined
during domain modeling.

---

# 19. Security

Although Ledger is initially a personal application, security remains an
important engineering concern because the system handles sensitive financial
information.

The system should follow secure software development practices.

Relevant concerns include:

- Authentication.
- Authorization.
- Secure password storage.
- Secret management.
- Input validation.
- Secure API design.
- Protection of sensitive financial information.
- Secure communication.
- Dependency security.

The initial authentication and authorization design is TBD.

---

# 20. MVP

The initial MVP should provide a functional personal finance management
system without requiring external financial integrations.

The MVP should focus on:

- Account management.
- Manual transaction management.
- Income.
- Expenses.
- Internal transfers.
- External transfers.
- Categories.
- Credit cards.
- Credit card invoices.
- Installments.
- Recurring transactions.
- Refunds.
- Cancellations.
- Balance calculation.
- Basic financial reports.
- Audit history.
- Automated tests.
- API documentation.
- Dockerized local development.

Open Finance is not required for the MVP.

---

# 21. Future Roadmap

Potential future development stages include:

## Phase 1 — Core Financial System

- Domain implementation.
- Account management.
- Transactions.
- Categories.
- Credit cards.
- Invoices.
- Installments.
- Recurring transactions.
- Refunds and cancellations.
- Balance calculation.

## Phase 2 — Professionalization

- Comprehensive automated testing.
- Integration testing.
- Testcontainers.
- OpenAPI documentation.
- Observability.
- Audit improvements.
- Security hardening.
- CI/CD.

## Phase 3 — Open Finance

- Financial institution integration.
- Account synchronization.
- Transaction synchronization.
- Credit card synchronization.
- Invoice synchronization.
- Balance reconciliation.
- Duplicate detection.

## Phase 4 — Client Applications

- React web application.
- Mobile application.
- Potential Android application using Kotlin.
- Background synchronization.
- Push notifications.

## Phase 5 — Advanced Features

Potential future capabilities include:

- Automatic categorization.
- AI-assisted financial insights.
- Advanced reporting.
- Multi-currency.
- Investment analytics.
- More advanced financial planning.

The roadmap is intentionally flexible and may change as the project
evolves.

---

# 22. Architectural Decisions

The following decisions have been established during the initial project
planning.

| Decision | Current Direction |
|---|---|
| Repository name | `ledger` |
| Project type | Personal finance management application |
| Primary purpose | Personal use + software engineering portfolio |
| Backend language | Java |
| Backend framework | Spring Boot |
| Build tool | Maven |
| Database | PostgreSQL |
| Local infrastructure | Docker Compose |
| Initial frontend | React + TypeScript |
| Initial architecture | Modular Monolith |
| Money representation | `BigDecimal` |
| Testing approach | TDD + automated testing |
| API documentation | OpenAPI / Swagger |
| Credit card purchases | Do not immediately reduce bank account balance |
| Invoice payment | Reduces source account balance and settles the invoice |
| Internal transfers | Not income or expense |
| Transfers to third parties | Expenses |
| Categories | Required |
| Category assignment | Manual initially |
| Recurring transactions | Supported |
| Installments | Supported |
| Refunds | Supported |
| Cancellations | Supported |
| Audit | Supported |
| Open Finance | Future integration |
| Multi-currency | Future capability, not initial implementation |
| Background processing | Required architectural capability |
| Notifications | Future capability |
| Microservices | Not planned initially |

---

# 23. Open Questions

The following decisions remain to be defined during domain and architectural
design:

- Exact `Transaction` domain model.
- Exact `Account` domain model.
- Whether `Expense` and `Income` are specialized domain concepts or
  transaction types.
- Exact relationship between transactions and credit card purchases.
- Exact invoice lifecycle.
- Invoice states.
- Installment lifecycle.
- Recurrence rule model.
- Refund and cancellation state transitions.
- Pending vs. settled transactions.
- Exact balance calculation algorithm.
- Reconciliation algorithm.
- Category ownership and customization rules.
- Investment domain model.
- Authentication model.
- Authorization model.
- Audit implementation.
- Background job implementation.
- Open Finance provider and integration strategy.
- Exact module boundaries.
- Deployment architecture.
- CI/CD architecture.
- Exact frontend architecture.
- Mobile application architecture.

These decisions should be made before implementing the corresponding
features, rather than being prematurely fixed in the current specification.

---

# 24. Specification Status

This document represents the current understanding of the Ledger project.

The specification is a living document and may evolve as domain modeling,
implementation, testing, and real-world usage reveal new requirements or
better solutions.

Changes to important architectural or domain decisions should be documented
and justified rather than made implicitly.