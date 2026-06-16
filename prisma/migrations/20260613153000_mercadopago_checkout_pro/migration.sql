-- Rename the internal checkout URL column to distinguish it from Mercado Pago URLs.
ALTER TABLE "checkout_sessions"
RENAME COLUMN "payment_url" TO "checkout_url";

-- Store Mercado Pago Checkout Pro identifiers explicitly.
ALTER TABLE "checkout_sessions"
ADD COLUMN "mercado_pago_preference_id" TEXT,
ADD COLUMN "mercado_pago_init_point" TEXT;

-- Remove the old generic provider reference to avoid ambiguity.
ALTER TABLE "checkout_sessions"
DROP COLUMN "provider_checkout_reference";
