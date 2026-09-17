-- How many times we have asked Stripe for this charge.
--
-- A failed charge has to be retryable: a card is fixed, or a run is invoked
-- again to reconcile. Stripe caches a result against an idempotency key, so
-- a retry needs a key of its own or it is handed back the original failure.

alter table charges add column attempts integer not null default 0;
