-- CreateEnum
CREATE TYPE "CheckoutSessionStatus" AS ENUM ('CREATED', 'PENDING', 'PAID', 'DENIED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CreditMovementType" AS ENUM ('CREDIT_GRANTED', 'CREDIT_APPLIED', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PoolPriceFinalizationJobReason" AS ENUM ('POOL_LOCKED', 'NO_DRIVER_ASSIGNED');

-- CreateEnum
CREATE TYPE "PoolPriceFinalizationJobStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PoolPriceFinalizationDiscountType" AS ENUM ('OCCUPANCY_DISCOUNT', 'NO_DRIVER_CREDIT');

-- AlterEnum
ALTER TYPE "ChargeStatus" ADD VALUE 'CANCELED';
ALTER TYPE "ChargeStatus" ADD VALUE 'EXPIRED';

-- CreateTable
CREATE TABLE "checkout_sessions" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "pool_id" TEXT NOT NULL,
    "passenger_user_id" TEXT NOT NULL,
    "max_price" DECIMAL(10,2) NOT NULL,
    "available_credit_at_creation" DECIMAL(10,2) NOT NULL,
    "credit_applied" DECIMAL(10,2) NOT NULL,
    "amount_to_charge" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "CheckoutSessionStatus" NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "payment_url" TEXT,
    "provider_checkout_reference" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_movements" (
    "id" TEXT NOT NULL,
    "credit_account_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "CreditMovementType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "reservation_id" TEXT,
    "pool_id" TEXT,
    "charge_id" TEXT,
    "pool_price_finalization_job_id" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_price_finalization_jobs" (
    "id" TEXT NOT NULL,
    "pool_id" TEXT NOT NULL,
    "reason" "PoolPriceFinalizationJobReason" NOT NULL,
    "current_passengers" INTEGER NOT NULL,
    "pricing_rule_id" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "final_price" DECIMAL(10,2),
    "discount_type" "PoolPriceFinalizationDiscountType",
    "discount_value" DECIMAL(10,2),
    "currency" TEXT NOT NULL,
    "status" "PoolPriceFinalizationJobStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "pool_price_finalization_jobs_pkey" PRIMARY KEY ("id")
);

-- DropForeignKey
ALTER TABLE "charge_discounts" DROP CONSTRAINT "charge_discounts_charge_id_fkey";

-- DropForeignKey
ALTER TABLE "charges" DROP CONSTRAINT "charges_auto_charge_job_id_fkey";

-- DropForeignKey
ALTER TABLE "charges" DROP CONSTRAINT "charges_payment_method_id_fkey";

-- DropIndex
DROP INDEX "charges_auto_charge_job_id_idx";

-- DropIndex
DROP INDEX "charges_payment_method_id_idx";

-- DropIndex
DROP INDEX "charges_reservation_id_key";

-- AlterTable
ALTER TABLE "charges"
    ADD COLUMN "amount_charged" DECIMAL(10,2),
    ADD COLUMN "checkout_session_id" TEXT,
    ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "credit_applied" DECIMAL(10,2),
    ADD COLUMN "credit_granted" DECIMAL(10,2),
    ADD COLUMN "final_trip_price" DECIMAL(10,2),
    ADD COLUMN "pool_price_finalization_job_id" TEXT,
    ADD COLUMN "provider" "PaymentProvider";

-- Data migration for legacy charges so the new schema can be applied over existing demo data.
UPDATE "charges"
SET
    "amount_charged" = COALESCE("effective_price", 0.00),
    "credit_applied" = 0.00,
    "credit_granted" = 0.00,
    "final_trip_price" = "effective_price",
    "provider" = 'MERCADO_PAGO';

ALTER TABLE "charges"
    ALTER COLUMN "amount_charged" SET NOT NULL,
    ALTER COLUMN "credit_applied" SET NOT NULL,
    ALTER COLUMN "credit_granted" SET NOT NULL,
    ALTER COLUMN "provider" SET NOT NULL;

ALTER TABLE "charges"
    DROP COLUMN "auto_charge_job_id",
    DROP COLUMN "effective_price",
    DROP COLUMN "payment_method_id";

-- DropTable
DROP TABLE "auto_charge_jobs";

-- DropTable
DROP TABLE "charge_discounts";

-- DropTable
DROP TABLE "payment_methods";

-- DropEnum
DROP TYPE "AutoChargeJobRequestedBy";

-- DropEnum
DROP TYPE "AutoChargeJobStatus";

-- DropEnum
DROP TYPE "PaymentMethodStatus";

-- DropEnum
DROP TYPE "PaymentMethodType";

-- CreateIndex
CREATE INDEX "checkout_sessions_reservation_id_status_idx" ON "checkout_sessions"("reservation_id", "status");

-- CreateIndex
CREATE INDEX "checkout_sessions_passenger_user_id_status_idx" ON "checkout_sessions"("passenger_user_id", "status");

-- CreateIndex
CREATE INDEX "checkout_sessions_pool_id_idx" ON "checkout_sessions"("pool_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_accounts_user_id_key" ON "credit_accounts"("user_id");

-- CreateIndex
CREATE INDEX "credit_movements_credit_account_id_idx" ON "credit_movements"("credit_account_id");

-- CreateIndex
CREATE INDEX "credit_movements_user_id_created_at_idx" ON "credit_movements"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "credit_movements_reservation_id_idx" ON "credit_movements"("reservation_id");

-- CreateIndex
CREATE INDEX "credit_movements_pool_id_idx" ON "credit_movements"("pool_id");

-- CreateIndex
CREATE INDEX "credit_movements_charge_id_idx" ON "credit_movements"("charge_id");

-- CreateIndex
CREATE INDEX "credit_movements_pool_price_finalization_job_id_idx" ON "credit_movements"("pool_price_finalization_job_id");

-- CreateIndex
CREATE INDEX "pool_price_finalization_jobs_pool_id_status_idx" ON "pool_price_finalization_jobs"("pool_id", "status");

-- CreateIndex
CREATE INDEX "pool_price_finalization_jobs_pool_id_reason_idx" ON "pool_price_finalization_jobs"("pool_id", "reason");

-- CreateIndex
CREATE INDEX "pool_price_finalization_jobs_pricing_rule_id_idx" ON "pool_price_finalization_jobs"("pricing_rule_id");

-- CreateIndex
CREATE INDEX "charges_reservation_id_status_idx" ON "charges"("reservation_id", "status");

-- CreateIndex
CREATE INDEX "charges_checkout_session_id_idx" ON "charges"("checkout_session_id");

-- CreateIndex
CREATE INDEX "charges_pool_price_finalization_job_id_idx" ON "charges"("pool_price_finalization_job_id");

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_pool_price_finalization_job_id_fkey" FOREIGN KEY ("pool_price_finalization_job_id") REFERENCES "pool_price_finalization_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_movements" ADD CONSTRAINT "credit_movements_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "credit_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_movements" ADD CONSTRAINT "credit_movements_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_movements" ADD CONSTRAINT "credit_movements_pool_price_finalization_job_id_fkey" FOREIGN KEY ("pool_price_finalization_job_id") REFERENCES "pool_price_finalization_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_price_finalization_jobs" ADD CONSTRAINT "pool_price_finalization_jobs_pricing_rule_id_fkey" FOREIGN KEY ("pricing_rule_id") REFERENCES "pricing_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
