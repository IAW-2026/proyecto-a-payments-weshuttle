/*
  Warnings:

  - Added the required column `card_bin` to the `payment_methods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `card_brand` to the `payment_methods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `card_last4` to the `payment_methods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `holder_name` to the `payment_methods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_type` to the `payment_methods` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CREDIT_CARD', 'DEBIT_CARD');

-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN     "card_bin" TEXT NOT NULL,
ADD COLUMN     "card_brand" TEXT NOT NULL,
ADD COLUMN     "card_last4" TEXT NOT NULL,
ADD COLUMN     "holder_name" TEXT NOT NULL,
ADD COLUMN     "payment_type" "PaymentMethodType" NOT NULL;

-- CreateIndex
CREATE INDEX "payment_methods_card_brand_card_last4_idx" ON "payment_methods"("card_brand", "card_last4");
