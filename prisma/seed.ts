import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_USER = "admin+clerk_test@iaw.com";
const RIDER_1 = "rider+clerk_test@iaw.com";
const RIDER_2 = "rider2+clerk_test@iaw.com";
const RIDER_CREDIT = "rider_credit+clerk_test@iaw.com";
const RIDER_DENIED = "rider_denied+clerk_test@iaw.com";
const DRIVER_1 = "driver+clerk_test@iaw.com";
const DRIVER_2 = "driver2+clerk_test@iaw.com";

const CURRENCY = "ARS";

function money(value: string) {
  return new Prisma.Decimal(value);
}

async function resetDatabase() {
  console.log("Limpiando base de datos...");
  await prisma.creditMovement.deleteMany();
  await prisma.charge.deleteMany();
  await prisma.checkoutSession.deleteMany();
  await prisma.poolPriceFinalizationJob.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.creditAccount.deleteMany();
  await prisma.payoutAccount.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.connectionTest.deleteMany();
}

async function seedPricingRules() {
  console.log("Inyectando pricing rules...");

  await prisma.pricingRule.createMany({
    data: [
      {
        id: "pr_gen_1_4",
        destinationId: null,
        basePrice: money("4800.00"),
        minPassengers: 1,
        maxPassengers: 4,
        discountType: "FIXED_AMOUNT",
        discountValue: money("0.00"),
        active: true,
      },
      {
        id: "pr_gen_5_8",
        destinationId: null,
        basePrice: money("4800.00"),
        minPassengers: 5,
        maxPassengers: 8,
        discountType: "PERCENTAGE",
        discountValue: money("12.00"),
        active: true,
      },
      {
        id: "pr_dest_polo_1_4",
        destinationId: "dest_polo_petroquimico",
        basePrice: money("5800.00"),
        minPassengers: 1,
        maxPassengers: 4,
        discountType: "FIXED_AMOUNT",
        discountValue: money("0.00"),
        active: true,
      },
      {
        id: "pr_dest_polo_5_15",
        destinationId: "dest_polo_petroquimico",
        basePrice: money("5800.00"),
        minPassengers: 5,
        maxPassengers: 15,
        discountType: "PERCENTAGE",
        discountValue: money("18.00"),
        active: true,
      },
      {
        id: "pr_dest_parque_1_15",
        destinationId: "dest_parque_industrial",
        basePrice: money("6500.00"),
        minPassengers: 1,
        maxPassengers: 15,
        discountType: "PERCENTAGE",
        discountValue: money("10.00"),
        active: true,
      },
      {
        id: "pr_inactive_old",
        destinationId: null,
        basePrice: money("3500.00"),
        minPassengers: 1,
        maxPassengers: 10,
        discountType: "PERCENTAGE",
        discountValue: money("5.00"),
        active: false,
      },
    ],
  });
}

async function seedCreditAccounts() {
  console.log("Inyectando cuentas de saldo a favor...");

  await prisma.creditAccount.createMany({
    data: [
      {
        id: "ca_rider_1",
        userId: RIDER_1,
        balance: money("1044.00"),
        currency: CURRENCY,
      },
      {
        id: "ca_rider_2",
        userId: RIDER_2,
        balance: money("6044.00"),
        currency: CURRENCY,
      },
      {
        id: "ca_rider_credit",
        userId: RIDER_CREDIT,
        balance: money("0.00"),
        currency: CURRENCY,
      },
      {
        id: "ca_rider_denied",
        userId: RIDER_DENIED,
        balance: money("0.00"),
        currency: CURRENCY,
      },
      {
        id: "ca_admin_demo",
        userId: ADMIN_USER,
        balance: money("0.00"),
        currency: CURRENCY,
      },
    ],
  });
}

async function seedPayoutAccounts() {
  console.log("Inyectando payout accounts...");

  await prisma.payoutAccount.createMany({
    data: [
      {
        id: "po_driver1",
        driverUserId: DRIVER_1,
        provider: "MERCADO_PAGO",
        accountReference: "mp_acc_driver_01",
        alias: "driver.principal.mp",
        status: "ACTIVE",
      },
      {
        id: "po_driver2",
        driverUserId: DRIVER_2,
        provider: "MERCADO_PAGO",
        accountReference: "mp_acc_driver_02",
        alias: "driver.secundario.mp",
        status: "ACTIVE",
      },
      {
        id: "po_driver2_old",
        driverUserId: DRIVER_2,
        provider: "MERCADO_PAGO",
        accountReference: "mp_acc_driver_02_old",
        alias: "driver.secundario.old",
        status: "INACTIVE",
      },
    ],
  });
}

async function seedCheckoutSessions() {
  console.log("Inyectando checkout sessions...");

  const now = new Date();

  await prisma.checkoutSession.createMany({
    data: [
      {
        id: "chk_paid_001",
        reservationId: "res_paid_001",
        poolId: "pool_demo_checkout_01",
        passengerUserId: RIDER_1,
        maxPrice: money("5800.00"),
        availableCreditAtCreation: money("0.00"),
        creditApplied: money("0.00"),
        amountToCharge: money("5800.00"),
        currency: CURRENCY,
        status: "PAID",
        provider: "MERCADO_PAGO",
        paymentUrl: "https://sandbox.mercadopago.com/checkout/chk_paid_001",
        providerCheckoutReference: "mp_chk_paid_001",
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 11 * 60 * 60 * 1000),
      },
      {
        id: "chk_paid_credit_001",
        reservationId: "res_paid_credit_001",
        poolId: "pool_demo_checkout_01",
        passengerUserId: RIDER_CREDIT,
        maxPrice: money("5800.00"),
        availableCreditAtCreation: money("1200.00"),
        creditApplied: money("1200.00"),
        amountToCharge: money("4600.00"),
        currency: CURRENCY,
        status: "PAID",
        provider: "MERCADO_PAGO",
        paymentUrl: "https://sandbox.mercadopago.com/checkout/chk_paid_credit_001",
        providerCheckoutReference: "mp_chk_paid_credit_001",
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 9 * 60 * 60 * 1000),
      },
      {
        id: "chk_paid_full_credit_001",
        reservationId: "res_paid_full_credit_001",
        poolId: "pool_demo_checkout_02",
        passengerUserId: RIDER_CREDIT,
        maxPrice: money("2500.00"),
        availableCreditAtCreation: money("2500.00"),
        creditApplied: money("2500.00"),
        amountToCharge: money("0.00"),
        currency: CURRENCY,
        status: "PAID",
        provider: "MERCADO_PAGO",
        paymentUrl: null,
        providerCheckoutReference: "credit_only_chk_001",
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      },
      {
        id: "chk_denied_001",
        reservationId: "res_denied_001",
        poolId: "pool_demo_checkout_02",
        passengerUserId: RIDER_DENIED,
        maxPrice: money("4800.00"),
        availableCreditAtCreation: money("0.00"),
        creditApplied: money("0.00"),
        amountToCharge: money("4800.00"),
        currency: CURRENCY,
        status: "DENIED",
        provider: "MERCADO_PAGO",
        paymentUrl: "https://sandbox.mercadopago.com/checkout/chk_denied_001",
        providerCheckoutReference: "mp_chk_denied_001",
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 7 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      },
      {
        id: "chk_canceled_001",
        reservationId: "res_canceled_001",
        poolId: "pool_demo_checkout_02",
        passengerUserId: RIDER_1,
        maxPrice: money("4800.00"),
        availableCreditAtCreation: money("0.00"),
        creditApplied: money("0.00"),
        amountToCharge: money("4800.00"),
        currency: CURRENCY,
        status: "CANCELED",
        provider: "MERCADO_PAGO",
        paymentUrl: "https://sandbox.mercadopago.com/checkout/chk_canceled_001",
        providerCheckoutReference: "mp_chk_canceled_001",
        expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
      {
        id: "chk_expired_001",
        reservationId: "res_expired_001",
        poolId: "pool_demo_checkout_02",
        passengerUserId: RIDER_2,
        maxPrice: money("5000.00"),
        availableCreditAtCreation: money("0.00"),
        creditApplied: money("0.00"),
        amountToCharge: money("5000.00"),
        currency: CURRENCY,
        status: "EXPIRED",
        provider: "MERCADO_PAGO",
        paymentUrl: "https://sandbox.mercadopago.com/checkout/chk_expired_001",
        providerCheckoutReference: "mp_chk_expired_001",
        expiresAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    ],
  });
}

async function seedPoolPriceFinalizationJobs() {
  console.log("Inyectando pool price finalization jobs...");

  const now = new Date();

  await prisma.poolPriceFinalizationJob.createMany({
    data: [
      {
        id: "ppfj_locked_001",
        poolId: "pool_demo_locked_01",
        reason: "POOL_LOCKED",
        currentPassengers: 8,
        pricingRuleId: "pr_dest_polo_5_15",
        basePrice: money("5800.00"),
        finalPrice: money("4756.00"),
        discountType: "OCCUPANCY_DISCOUNT",
        discountValue: money("1044.00"),
        currency: CURRENCY,
        status: "COMPLETED",
        startedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        finishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
      },
      {
        id: "ppfj_no_driver_001",
        poolId: "pool_demo_no_driver_01",
        reason: "NO_DRIVER_ASSIGNED",
        currentPassengers: 0,
        pricingRuleId: null,
        basePrice: money("5000.00"),
        finalPrice: money("0.00"),
        discountType: "NO_DRIVER_CREDIT",
        discountValue: money("5000.00"),
        currency: CURRENCY,
        status: "COMPLETED",
        startedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        finishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
      },
      {
        id: "ppfj_failed_001",
        poolId: "pool_demo_failed_01",
        reason: "POOL_LOCKED",
        currentPassengers: 6,
        pricingRuleId: "pr_gen_5_8",
        basePrice: money("4800.00"),
        finalPrice: null,
        discountType: null,
        discountValue: null,
        currency: CURRENCY,
        status: "FAILED",
        startedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        finishedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      },
    ],
  });
}

async function seedCharges() {
  console.log("Inyectando charges...");

  const now = new Date();

  await prisma.charge.createMany({
    data: [
      {
        id: "chg_paid_001",
        transactionId: "txn_paid_001",
        checkoutSessionId: "chk_paid_001",
        poolId: "pool_demo_checkout_01",
        reservationId: "res_paid_001",
        passengerUserId: RIDER_1,
        maxPrice: money("5800.00"),
        creditApplied: money("0.00"),
        amountCharged: money("5800.00"),
        finalTripPrice: null,
        creditGranted: money("0.00"),
        currency: CURRENCY,
        status: "PAID",
        provider: "MERCADO_PAGO",
        rejectionReason: null,
        processedAt: new Date(now.getTime() - 11 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
      {
        id: "chg_paid_credit_001",
        transactionId: "txn_paid_credit_001",
        checkoutSessionId: "chk_paid_credit_001",
        poolId: "pool_demo_checkout_01",
        reservationId: "res_paid_credit_001",
        passengerUserId: RIDER_CREDIT,
        maxPrice: money("5800.00"),
        creditApplied: money("1200.00"),
        amountCharged: money("4600.00"),
        finalTripPrice: null,
        creditGranted: money("0.00"),
        currency: CURRENCY,
        status: "PAID",
        provider: "MERCADO_PAGO",
        rejectionReason: null,
        processedAt: new Date(now.getTime() - 9 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      },
      {
        id: "chg_paid_full_credit_001",
        transactionId: "txn_paid_full_credit_001",
        checkoutSessionId: "chk_paid_full_credit_001",
        poolId: "pool_demo_checkout_02",
        reservationId: "res_paid_full_credit_001",
        passengerUserId: RIDER_CREDIT,
        maxPrice: money("2500.00"),
        creditApplied: money("2500.00"),
        amountCharged: money("0.00"),
        finalTripPrice: null,
        creditGranted: money("0.00"),
        currency: CURRENCY,
        status: "PAID",
        provider: "MERCADO_PAGO",
        rejectionReason: null,
        processedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      },
      {
        id: "chg_denied_001",
        transactionId: "txn_denied_001",
        checkoutSessionId: "chk_denied_001",
        poolId: "pool_demo_checkout_02",
        reservationId: "res_denied_001",
        passengerUserId: RIDER_DENIED,
        maxPrice: money("4800.00"),
        creditApplied: money("0.00"),
        amountCharged: money("0.00"),
        finalTripPrice: null,
        creditGranted: money("0.00"),
        currency: CURRENCY,
        status: "DENIED",
        provider: "MERCADO_PAGO",
        rejectionReason: "INSUFFICIENT_FUNDS",
        processedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 7 * 60 * 60 * 1000),
      },
      {
        id: "chg_locked_credit_001",
        transactionId: "txn_locked_credit_001",
        poolPriceFinalizationJobId: "ppfj_locked_001",
        poolId: "pool_demo_locked_01",
        reservationId: "res_locked_credit_001",
        passengerUserId: RIDER_1,
        maxPrice: money("5800.00"),
        creditApplied: money("0.00"),
        amountCharged: money("5800.00"),
        finalTripPrice: money("4756.00"),
        creditGranted: money("1044.00"),
        currency: CURRENCY,
        status: "PAID",
        provider: "MERCADO_PAGO",
        rejectionReason: null,
        processedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000),
      },
      {
        id: "chg_locked_credit_002",
        transactionId: "txn_locked_credit_002",
        poolPriceFinalizationJobId: "ppfj_locked_001",
        poolId: "pool_demo_locked_01",
        reservationId: "res_locked_credit_002",
        passengerUserId: RIDER_2,
        maxPrice: money("5800.00"),
        creditApplied: money("0.00"),
        amountCharged: money("5800.00"),
        finalTripPrice: money("4756.00"),
        creditGranted: money("1044.00"),
        currency: CURRENCY,
        status: "PAID",
        provider: "MERCADO_PAGO",
        rejectionReason: null,
        processedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 - 25 * 60 * 1000),
      },
      {
        id: "chg_no_driver_001",
        transactionId: "txn_no_driver_001",
        poolPriceFinalizationJobId: "ppfj_no_driver_001",
        poolId: "pool_demo_no_driver_01",
        reservationId: "res_no_driver_001",
        passengerUserId: RIDER_2,
        maxPrice: money("5000.00"),
        creditApplied: money("0.00"),
        amountCharged: money("5000.00"),
        finalTripPrice: money("0.00"),
        creditGranted: money("5000.00"),
        currency: CURRENCY,
        status: "PAID",
        provider: "MERCADO_PAGO",
        rejectionReason: null,
        processedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 - 20 * 60 * 1000),
      },
      {
        id: "chg_settlement_pending_001",
        transactionId: "txn_settlement_pending_001",
        poolId: "pool_demo_settlement_01",
        reservationId: "res_settlement_pending_001",
        passengerUserId: RIDER_1,
        maxPrice: money("6500.00"),
        creditApplied: money("0.00"),
        amountCharged: money("6500.00"),
        finalTripPrice: money("5850.00"),
        creditGranted: money("650.00"),
        currency: CURRENCY,
        status: "PAID",
        provider: "MERCADO_PAGO",
        rejectionReason: null,
        processedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000),
      },
      {
        id: "chg_settlement_failed_001",
        transactionId: "txn_settlement_failed_001",
        poolId: "pool_demo_settlement_02",
        reservationId: "res_settlement_failed_001",
        passengerUserId: RIDER_CREDIT,
        maxPrice: money("4800.00"),
        creditApplied: money("0.00"),
        amountCharged: money("4800.00"),
        finalTripPrice: money("4800.00"),
        creditGranted: money("0.00"),
        currency: CURRENCY,
        status: "PAID",
        provider: "MERCADO_PAGO",
        rejectionReason: null,
        processedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 - 10 * 60 * 1000),
      },
    ],
  });
}

async function seedCreditMovements() {
  console.log("Inyectando credit movements...");

  await prisma.creditMovement.createMany({
    data: [
      {
        id: "cm_manual_001",
        creditAccountId: "ca_rider_credit",
        userId: RIDER_CREDIT,
        type: "MANUAL_ADJUSTMENT",
        amount: money("3700.00"),
        currency: CURRENCY,
        reservationId: null,
        poolId: null,
        chargeId: null,
        poolPriceFinalizationJobId: null,
        description: "Ajuste manual de saldo para casos demo de checkout.",
      },
      {
        id: "cm_applied_001",
        creditAccountId: "ca_rider_credit",
        userId: RIDER_CREDIT,
        type: "CREDIT_APPLIED",
        amount: money("1200.00"),
        currency: CURRENCY,
        reservationId: "res_paid_credit_001",
        poolId: "pool_demo_checkout_01",
        chargeId: "chg_paid_credit_001",
        poolPriceFinalizationJobId: null,
        description: "Saldo a favor aplicado en checkout con cobro parcial.",
      },
      {
        id: "cm_applied_002",
        creditAccountId: "ca_rider_credit",
        userId: RIDER_CREDIT,
        type: "CREDIT_APPLIED",
        amount: money("2500.00"),
        currency: CURRENCY,
        reservationId: "res_paid_full_credit_001",
        poolId: "pool_demo_checkout_02",
        chargeId: "chg_paid_full_credit_001",
        poolPriceFinalizationJobId: null,
        description: "Saldo a favor aplicado en checkout cubierto al 100% por credito.",
      },
      {
        id: "cm_granted_locked_001",
        creditAccountId: "ca_rider_1",
        userId: RIDER_1,
        type: "CREDIT_GRANTED",
        amount: money("1044.00"),
        currency: CURRENCY,
        reservationId: "res_locked_credit_001",
        poolId: "pool_demo_locked_01",
        chargeId: "chg_locked_credit_001",
        poolPriceFinalizationJobId: "ppfj_locked_001",
        description: "Saldo a favor generado por descuento de ocupacion al cierre T-1h.",
      },
      {
        id: "cm_granted_locked_002",
        creditAccountId: "ca_rider_2",
        userId: RIDER_2,
        type: "CREDIT_GRANTED",
        amount: money("1044.00"),
        currency: CURRENCY,
        reservationId: "res_locked_credit_002",
        poolId: "pool_demo_locked_01",
        chargeId: "chg_locked_credit_002",
        poolPriceFinalizationJobId: "ppfj_locked_001",
        description: "Saldo a favor generado por descuento de ocupacion al cierre T-1h.",
      },
      {
        id: "cm_granted_no_driver_001",
        creditAccountId: "ca_rider_2",
        userId: RIDER_2,
        type: "CREDIT_GRANTED",
        amount: money("5000.00"),
        currency: CURRENCY,
        reservationId: "res_no_driver_001",
        poolId: "pool_demo_no_driver_01",
        chargeId: "chg_no_driver_001",
        poolPriceFinalizationJobId: "ppfj_no_driver_001",
        description: "Saldo a favor total por pool cancelado sin conductor asignado.",
      },
    ],
  });
}

async function seedSettlements() {
  console.log("Inyectando settlements...");

  const now = new Date();

  await prisma.settlement.createMany({
    data: [
      {
        id: "st_completed_001",
        poolId: "pool_demo_locked_01",
        driverUserId: DRIVER_1,
        payoutAccountId: "po_driver1",
        amount: money("9512.00"),
        currency: CURRENCY,
        status: "COMPLETED",
        settledAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      },
      {
        id: "st_pending_001",
        poolId: "pool_demo_settlement_01",
        driverUserId: DRIVER_2,
        payoutAccountId: "po_driver2",
        amount: money("5850.00"),
        currency: CURRENCY,
        status: "PENDING",
        settledAt: null,
      },
      {
        id: "st_failed_001",
        poolId: "pool_demo_settlement_02",
        driverUserId: DRIVER_2,
        payoutAccountId: "po_driver2",
        amount: money("4800.00"),
        currency: CURRENCY,
        status: "FAILED",
        settledAt: null,
      },
    ],
  });
}

async function seedConnectionTests() {
  await prisma.connectionTest.createMany({
    data: [{ label: "ok" }],
  });
}

async function main() {
  await resetDatabase();
  await seedPricingRules();
  await seedCreditAccounts();
  await seedPayoutAccounts();
  await seedCheckoutSessions();
  await seedPoolPriceFinalizationJobs();
  await seedCharges();
  await seedCreditMovements();
  await seedSettlements();
  await seedConnectionTests();

  console.log("Seeding finalizado correctamente.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Error durante el seeding:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
