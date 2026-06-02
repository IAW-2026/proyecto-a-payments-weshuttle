-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MERCADO_PAGO');

-- CreateEnum
CREATE TYPE "PaymentMethodStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "PayoutAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "PricingRuleDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "AutoChargeJobRequestedBy" AS ENUM ('DRIVER_APP');

-- CreateEnum
CREATE TYPE "AutoChargeJobStatus" AS ENUM ('STARTED', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'PAID', 'DENIED', 'FAILED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_token" TEXT NOT NULL,
    "status" "PaymentMethodStatus" NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_accounts" (
    "id" TEXT NOT NULL,
    "driver_user_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "account_reference" TEXT NOT NULL,
    "alias" TEXT,
    "status" "PayoutAccountStatus" NOT NULL,

    CONSTRAINT "payout_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "destination_id" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "min_passengers" INTEGER NOT NULL,
    "max_passengers" INTEGER NOT NULL,
    "discount_type" "PricingRuleDiscountType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_charge_jobs" (
    "id" TEXT NOT NULL,
    "pool_id" TEXT NOT NULL,
    "requested_by" "AutoChargeJobRequestedBy" NOT NULL,
    "current_passengers" INTEGER NOT NULL,
    "status" "AutoChargeJobStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "auto_charge_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "auto_charge_job_id" TEXT,
    "pool_id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "passenger_user_id" TEXT NOT NULL,
    "payment_method_id" TEXT,
    "max_price" DECIMAL(10,2) NOT NULL,
    "effective_price" DECIMAL(10,2),
    "currency" TEXT NOT NULL,
    "status" "ChargeStatus" NOT NULL,
    "rejection_reason" TEXT,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_discounts" (
    "id" TEXT NOT NULL,
    "charge_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,

    CONSTRAINT "charge_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "pool_id" TEXT NOT NULL,
    "driver_user_id" TEXT NOT NULL,
    "payout_account_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "SettlementStatus" NOT NULL,
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_provider_token_key" ON "payment_methods"("provider_token");

-- CreateIndex
CREATE INDEX "payment_methods_clerk_user_id_status_idx" ON "payment_methods"("clerk_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payout_accounts_account_reference_key" ON "payout_accounts"("account_reference");

-- CreateIndex
CREATE INDEX "payout_accounts_driver_user_id_status_idx" ON "payout_accounts"("driver_user_id", "status");

-- CreateIndex
CREATE INDEX "pricing_rules_destination_id_active_min_passengers_max_pass_idx" ON "pricing_rules"("destination_id", "active", "min_passengers", "max_passengers");

-- CreateIndex
CREATE INDEX "pricing_rules_active_idx" ON "pricing_rules"("active");

-- CreateIndex
CREATE UNIQUE INDEX "auto_charge_jobs_pool_id_key" ON "auto_charge_jobs"("pool_id");

-- CreateIndex
CREATE INDEX "auto_charge_jobs_status_idx" ON "auto_charge_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "charges_transaction_id_key" ON "charges"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "charges_reservation_id_key" ON "charges"("reservation_id");

-- CreateIndex
CREATE INDEX "charges_pool_id_status_idx" ON "charges"("pool_id", "status");

-- CreateIndex
CREATE INDEX "charges_passenger_user_id_status_idx" ON "charges"("passenger_user_id", "status");

-- CreateIndex
CREATE INDEX "charges_auto_charge_job_id_idx" ON "charges"("auto_charge_job_id");

-- CreateIndex
CREATE INDEX "charges_payment_method_id_idx" ON "charges"("payment_method_id");

-- CreateIndex
CREATE INDEX "charge_discounts_charge_id_idx" ON "charge_discounts"("charge_id");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_pool_id_key" ON "settlements"("pool_id");

-- CreateIndex
CREATE INDEX "settlements_driver_user_id_status_idx" ON "settlements"("driver_user_id", "status");

-- CreateIndex
CREATE INDEX "settlements_payout_account_id_idx" ON "settlements"("payout_account_id");

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_auto_charge_job_id_fkey" FOREIGN KEY ("auto_charge_job_id") REFERENCES "auto_charge_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_discounts" ADD CONSTRAINT "charge_discounts_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_payout_account_id_fkey" FOREIGN KEY ("payout_account_id") REFERENCES "payout_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
