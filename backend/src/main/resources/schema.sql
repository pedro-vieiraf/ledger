-- Hibernate's ddl-auto=update does not alter existing check constraints when
-- an enum gains a new value. Keep the account status constraint in sync with
-- AccountStatus here. The statements are idempotent and safe to run on every
-- startup, including against a freshly created schema.
ALTER TABLE IF EXISTS accounts
  DROP CONSTRAINT IF EXISTS accounts_status_check;

ALTER TABLE IF EXISTS accounts
  ADD CONSTRAINT accounts_status_check
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'DELETED'));
