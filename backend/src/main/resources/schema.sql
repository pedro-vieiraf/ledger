-- Hibernate's ddl-auto=update does not alter existing check constraints when
-- an enum gains a new value. Keep the account status constraint in sync with
-- AccountStatus here. The statements are idempotent and safe to run on every
-- startup, including against a freshly created schema.
ALTER TABLE IF EXISTS accounts
  DROP CONSTRAINT IF EXISTS accounts_status_check;

ALTER TABLE IF EXISTS accounts
  ADD CONSTRAINT accounts_status_check
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'DELETED'));

-- Recurrence support. Hibernate creates the tables and columns from the
-- entities; these idempotent statements keep existing databases in sync and
-- add the indexes used by the scheduler and by idempotency checks.
ALTER TABLE IF EXISTS transactions
  ADD COLUMN IF NOT EXISTS recurrence_id UUID;

ALTER TABLE IF EXISTS transactions
  ADD COLUMN IF NOT EXISTS occurrence_date DATE;

CREATE UNIQUE INDEX IF NOT EXISTS uk_transactions_recurrence_occurrence
  ON transactions (recurrence_id, occurrence_date);

CREATE INDEX IF NOT EXISTS idx_recurrences_due
  ON recurrences (status, next_occurrence);
