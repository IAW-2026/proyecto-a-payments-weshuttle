import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.chargeDiscount.deleteMany();
  await prisma.charge.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.autoChargeJob.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.payoutAccount.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.connectionTest.deleteMany();

  await prisma.connectionTest.create({
    data: {
      id: "seed-connection-test",
      label: "ok",
    },
  });

  await prisma.paymentMethod.createMany({
    data: [
      {
        id: "pm_apro_visa_credit",
        clerkUserId: "user_rider_apro_01",
        provider: "MERCADO_PAGO",
        providerToken: "tok_test_mp_visa_450995_xxxx_3704",
        holderName: "APRO",
        cardBrand: "VISA",
        cardBin: "450995",
        cardLast4: "3704",
        paymentType: "CREDIT_CARD",
        status: "ACTIVE",
      },
      {
        id: "pm_fund_mc_credit",
        clerkUserId: "user_rider_fund_01",
        provider: "MERCADO_PAGO",
        providerToken: "tok_test_mp_mc_503175_xxxx_0604",
        holderName: "FUND",
        cardBrand: "MASTERCARD",
        cardBin: "503175",
        cardLast4: "0604",
        paymentType: "CREDIT_CARD",
        status: "ACTIVE",
      },
      {
        id: "pm_cont_visa_debit",
        clerkUserId: "user_rider_cont_01",
        provider: "MERCADO_PAGO",
        providerToken: "tok_test_mp_visa_400276_xxxx_5619",
        holderName: "CONT",
        cardBrand: "VISA",
        cardBin: "400276",
        cardLast4: "5619",
        paymentType: "DEBIT_CARD",
        status: "ACTIVE",
      },
    ],
  });

  await prisma.pricingRule.createMany({
    data: [
      {
        id: "pr_general_1_4",
        destinationId: null,
        basePrice: new Prisma.Decimal("5000.00"),
        minPassengers: 1,
        maxPassengers: 4,
        discountType: "FIXED_AMOUNT",
        discountValue: new Prisma.Decimal("0.00"),
        active: true,
      },
      {
        id: "pr_general_5_8",
        destinationId: null,
        basePrice: new Prisma.Decimal("5000.00"),
        minPassengers: 5,
        maxPassengers: 8,
        discountType: "PERCENTAGE",
        discountValue: new Prisma.Decimal("10.00"),
        active: true,
      },
      {
        id: "pr_dest_polo_9_15",
        destinationId: "dest_polo_petroquimico",
        basePrice: new Prisma.Decimal("5200.00"),
        minPassengers: 9,
        maxPassengers: 15,
        discountType: "PERCENTAGE",
        discountValue: new Prisma.Decimal("18.00"),
        active: true,
      },
    ],
  });

  await prisma.autoChargeJob.createMany({
    data: [
      {
        id: "acj_pool_abc123",
        poolId: "pool_abc123",
        requestedBy: "DRIVER_APP",
        currentPassengers: 8,
        status: "COMPLETED",
        startedAt: new Date("2026-06-10T07:00:00Z"),
        finishedAt: new Date("2026-06-10T07:06:00Z"),
      },
      {
        id: "acj_pool_xyz789",
        poolId: "pool_xyz789",
        requestedBy: "DRIVER_APP",
        currentPassengers: 6,
        status: "STARTED",
        startedAt: new Date("2026-06-11T07:00:00Z"),
        finishedAt: null,
      },
    ],
  });

  await prisma.charge.createMany({
    data: [
      {
        id: "chg_paid_apro",
        transactionId: "txn_100001",
        autoChargeJobId: "acj_pool_abc123",
        poolId: "pool_abc123",
        reservationId: "res_100001",
        passengerUserId: "user_rider_apro_01",
        paymentMethodId: "pm_apro_visa_credit",
        maxPrice: new Prisma.Decimal("5000.00"),
        effectivePrice: new Prisma.Decimal("4200.00"),
        currency: "ARS",
        status: "PAID",
        rejectionReason: null,
        processedAt: new Date("2026-06-10T07:01:10Z"),
      },
      {
        id: "chg_denied_fund",
        transactionId: "txn_100002",
        autoChargeJobId: "acj_pool_abc123",
        poolId: "pool_abc123",
        reservationId: "res_100002",
        passengerUserId: "user_rider_fund_01",
        paymentMethodId: "pm_fund_mc_credit",
        maxPrice: new Prisma.Decimal("5000.00"),
        effectivePrice: null,
        currency: "ARS",
        status: "DENIED",
        rejectionReason: "Rechazado por importe insuficiente (FUND)",
        processedAt: new Date("2026-06-10T07:01:40Z"),
      },
      {
        id: "chg_pending_cont",
        transactionId: "txn_100003",
        autoChargeJobId: "acj_pool_xyz789",
        poolId: "pool_xyz789",
        reservationId: "res_100003",
        passengerUserId: "user_rider_cont_01",
        paymentMethodId: "pm_cont_visa_debit",
        maxPrice: new Prisma.Decimal("5200.00"),
        effectivePrice: null,
        currency: "ARS",
        status: "PENDING",
        rejectionReason: null,
        processedAt: null,
      },
    ],
  });

  await prisma.chargeDiscount.createMany({
    data: [
      {
        id: "cd_occ_apro_1",
        chargeId: "chg_paid_apro",
        type: "OCCUPANCY_DISCOUNT",
        amount: new Prisma.Decimal("800.00"),
        description: "Descuento por ocupacion al cierre T-1h",
      },
      {
        id: "cd_promo_apro_2",
        chargeId: "chg_paid_apro",
        type: "PROMOTIONAL_ADJUSTMENT",
        amount: new Prisma.Decimal("0.00"),
        description: "Ajuste promocional sin impacto",
      },
    ],
  });

  await prisma.payoutAccount.createMany({
    data: [
      {
        id: "po_driver_01",
        driverUserId: "user_driver_01",
        provider: "MERCADO_PAGO",
        accountReference: "mp_acc_driver_01",
        alias: "driver01-cvu",
        status: "ACTIVE",
      },
      {
        id: "po_driver_02",
        driverUserId: "user_driver_02",
        provider: "MERCADO_PAGO",
        accountReference: "mp_acc_driver_02",
        alias: "driver02-cvu",
        status: "ACTIVE",
      },
    ],
  });

  await prisma.settlement.createMany({
    data: [
      {
        id: "st_pool_abc123",
        poolId: "pool_abc123",
        driverUserId: "user_driver_01",
        payoutAccountId: "po_driver_01",
        amount: new Prisma.Decimal("30400.00"),
        currency: "ARS",
        status: "COMPLETED",
        settledAt: new Date("2026-06-10T09:10:00Z"),
      },
      {
        id: "st_pool_xyz789",
        poolId: "pool_xyz789",
        driverUserId: "user_driver_02",
        payoutAccountId: "po_driver_02",
        amount: new Prisma.Decimal("21600.00"),
        currency: "ARS",
        status: "PENDING",
        settledAt: null,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
