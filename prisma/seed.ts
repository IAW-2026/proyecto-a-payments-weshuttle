import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Mandatory Test Users
const ADMIN_USER = "admin+clerk_test@iaw.com";
const RIDER_1 = "rider+clerk_test@iaw.com";
const DRIVER_1 = "driver+clerk_test@iaw.com";

// Dummy Users in requested format
const RIDER_2 = "rider2+clerk_test@iaw.com";
const RIDER_3 = "rider3+clerk_test@iaw.com";
const RIDER_FUND = "rider_fund+clerk_test@iaw.com"; // User meant to simulate failed payments (Insufficient Funds)

const DRIVER_2 = "driver2+clerk_test@iaw.com";

async function main() {
  console.log("Limpiando base de datos...");
  await prisma.chargeDiscount.deleteMany();
  await prisma.charge.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.autoChargeJob.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.payoutAccount.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.connectionTest.deleteMany();

  console.log("Inyectando Pricing Rules...");
  await prisma.pricingRule.createMany({
    data: [
      {
        id: "pr_gen_1_4",
        destinationId: null,
        basePrice: new Prisma.Decimal("4800.00"),
        minPassengers: 1,
        maxPassengers: 4,
        discountType: "FIXED_AMOUNT",
        discountValue: new Prisma.Decimal("0.00"),
        active: true,
      },
      {
        id: "pr_gen_5_8",
        destinationId: null,
        basePrice: new Prisma.Decimal("4800.00"),
        minPassengers: 5,
        maxPassengers: 8,
        discountType: "PERCENTAGE",
        discountValue: new Prisma.Decimal("12.00"),
        active: true,
      },
      {
        id: "pr_dest_polo_1_4",
        destinationId: "dest_polo_petroquimico",
        basePrice: new Prisma.Decimal("5800.00"),
        minPassengers: 1,
        maxPassengers: 4,
        discountType: "FIXED_AMOUNT",
        discountValue: new Prisma.Decimal("0.00"),
        active: true,
      },
      {
        id: "pr_dest_polo_5_15",
        destinationId: "dest_polo_petroquimico",
        basePrice: new Prisma.Decimal("5800.00"),
        minPassengers: 5,
        maxPassengers: 15,
        discountType: "PERCENTAGE",
        discountValue: new Prisma.Decimal("18.00"),
        active: true,
      },
      {
        id: "pr_dest_parque_1_15",
        destinationId: "dest_parque_industrial",
        basePrice: new Prisma.Decimal("6500.00"),
        minPassengers: 1,
        maxPassengers: 15,
        discountType: "PERCENTAGE",
        discountValue: new Prisma.Decimal("10.00"),
        active: true,
      },
      {
        id: "pr_inactive_old",
        destinationId: null,
        basePrice: new Prisma.Decimal("3500.00"),
        minPassengers: 1,
        maxPassengers: 10,
        discountType: "PERCENTAGE",
        discountValue: new Prisma.Decimal("5.00"),
        active: false,
      },
    ],
  });

  console.log("Inyectando Payment Methods...");
  await prisma.paymentMethod.createMany({
    data: [
      {
        id: "pm_rider1_visa",
        clerkUserId: RIDER_1,
        provider: "MERCADO_PAGO",
        providerToken: "tok_test_mp_visa_450995_xxxx_3704",
        holderName: "Test Rider Uno",
        cardBrand: "VISA",
        cardBin: "450995",
        cardLast4: "3704",
        paymentType: "CREDIT_CARD",
        status: "ACTIVE",
      },
      {
        id: "pm_rider2_mc",
        clerkUserId: RIDER_2,
        provider: "MERCADO_PAGO",
        providerToken: "tok_test_mp_mc_503175_xxxx_0604",
        holderName: "Test Rider Dos",
        cardBrand: "MASTERCARD",
        cardBin: "503175",
        cardLast4: "0604",
        paymentType: "CREDIT_CARD",
        status: "ACTIVE",
      },
      {
        id: "pm_rider3_debit",
        clerkUserId: RIDER_3,
        provider: "MERCADO_PAGO",
        providerToken: "tok_test_mp_visa_400276_xxxx_5619",
        holderName: "Test Rider Tres",
        cardBrand: "VISA",
        cardBin: "400276",
        cardLast4: "5619",
        paymentType: "DEBIT_CARD",
        status: "ACTIVE",
      },
      {
        id: "pm_rider_fund_fail",
        clerkUserId: RIDER_FUND,
        provider: "MERCADO_PAGO",
        providerToken: "tok_test_mp_fail_000000_xxxx_0000",
        holderName: "FUND", // Mandatory Keyword to trigger mock rejection
        cardBrand: "VISA",
        cardBin: "000000",
        cardLast4: "0000",
        paymentType: "CREDIT_CARD",
        status: "ACTIVE",
      },
    ],
  });

  console.log("Inyectando Payout Accounts...");
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
    ],
  });

  console.log("Inyectando Datos Historicos (Pools, Cargos, Liquidaciones)...");

  // Historical Pool 1: dest_polo_petroquimico, 12 passengers
  const pool1StartedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
  const job1 = await prisma.autoChargeJob.create({
    data: {
      id: "acj_hist_1",
      poolId: "pool_hist_101",
      requestedBy: "DRIVER_APP",
      currentPassengers: 12,
      status: "COMPLETED",
      startedAt: pool1StartedAt,
      finishedAt: new Date(pool1StartedAt.getTime() + 10 * 60000),
    },
  });

  // Successful Charge for RIDER_1 in Pool 1 (with 18% discount)
  const charge1 = await prisma.charge.create({
    data: {
      id: "chg_hist_1_r1",
      transactionId: "txn_mp_hist_1001",
      autoChargeJobId: job1.id,
      poolId: "pool_hist_101",
      reservationId: "res_hist_r1_01",
      passengerUserId: RIDER_1,
      paymentMethodId: "pm_rider1_visa",
      maxPrice: new Prisma.Decimal("5800.00"),
      effectivePrice: new Prisma.Decimal("4756.00"), // 5800 * 0.82
      currency: "ARS",
      status: "PAID",
      processedAt: new Date(pool1StartedAt.getTime() + 2 * 60000),
      discounts: {
        create: {
          type: "OCCUPANCY_DISCOUNT",
          amount: new Prisma.Decimal("1044.00"),
          description: "Descuento por alta ocupacion (12 pasajeros)",
        }
      }
    },
  });

  // Settlement for Pool 1 (DRIVER_1)
  await prisma.settlement.create({
    data: {
      id: "st_hist_1",
      poolId: "pool_hist_101",
      driverUserId: DRIVER_1,
      payoutAccountId: "po_driver1",
      amount: new Prisma.Decimal("57072.00"), // 12 pax * 4756
      currency: "ARS",
      status: "COMPLETED",
      settledAt: new Date(pool1StartedAt.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days later
    },
  });

  // Historical Pool 2: General, 3 passengers
  const pool2StartedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
  const job2 = await prisma.autoChargeJob.create({
    data: {
      id: "acj_hist_2",
      poolId: "pool_hist_202",
      requestedBy: "DRIVER_APP",
      currentPassengers: 3,
      status: "PARTIAL_FAILED",
      startedAt: pool2StartedAt,
      finishedAt: new Date(pool2StartedAt.getTime() + 8 * 60000),
    },
  });

  // Successful Charge for RIDER_2
  await prisma.charge.create({
    data: {
      id: "chg_hist_2_r2",
      transactionId: "txn_mp_hist_2001",
      autoChargeJobId: job2.id,
      poolId: "pool_hist_202",
      reservationId: "res_hist_r2_02",
      passengerUserId: RIDER_2,
      paymentMethodId: "pm_rider2_mc",
      maxPrice: new Prisma.Decimal("4800.00"),
      effectivePrice: new Prisma.Decimal("4800.00"),
      currency: "ARS",
      status: "PAID",
      processedAt: new Date(pool2StartedAt.getTime() + 3 * 60000),
    },
  });

  // Denied Charge for RIDER_FUND
  await prisma.charge.create({
    data: {
      id: "chg_hist_2_fail",
      transactionId: "txn_mp_hist_fail_01",
      autoChargeJobId: job2.id,
      poolId: "pool_hist_202",
      reservationId: "res_hist_rfund_03",
      passengerUserId: RIDER_FUND,
      paymentMethodId: "pm_rider_fund_fail",
      maxPrice: new Prisma.Decimal("4800.00"),
      effectivePrice: null,
      currency: "ARS",
      status: "DENIED",
      rejectionReason: "INSUFFICIENT_FUNDS",
      processedAt: new Date(pool2StartedAt.getTime() + 4 * 60000),
    },
  });

  // Pending Settlement for Pool 2 (DRIVER_2)
  await prisma.settlement.create({
    data: {
      id: "st_hist_2",
      poolId: "pool_hist_202",
      driverUserId: DRIVER_2,
      payoutAccountId: "po_driver2",
      amount: new Prisma.Decimal("9600.00"), // 2 successful pax * 4800
      currency: "ARS",
      status: "PENDING",
      settledAt: null,
    },
  });

  console.log("Inyectando Volumen de Transacciones Recientes para el Dashboard...");
  const recentCharges = [];
  for (let i = 0; i < 20; i++) {
    const hoursAgo = i * 4;
    recentCharges.push({
      id: `chg_rec_${i}`,
      transactionId: `txn_mp_recent_${1000 + i}`,
      poolId: `pool_recent_${Math.floor(i/5)}`,
      reservationId: `res_recent_${5000 + i}`,
      passengerUserId: i % 2 === 0 ? RIDER_1 : RIDER_3,
      paymentMethodId: i % 2 === 0 ? "pm_rider1_visa" : "pm_rider3_debit",
      maxPrice: new Prisma.Decimal("4800.00"),
      effectivePrice: new Prisma.Decimal("4800.00"),
      currency: "ARS",
      status: "PAID" as const,
      processedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
    });
  }
  await prisma.charge.createMany({ data: recentCharges });

  console.log("Seeding Finalizado Correctamente.");
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
