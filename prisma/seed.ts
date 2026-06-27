import { Prisma, PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const CURRENCY = "ARS";

function money(value: string | number) {
  return new Prisma.Decimal(typeof value === "number" ? value.toFixed(2) : value);
}

// Helper to split array into chunks for safe DB batch insertion
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Demo users constants
const ADMIN_USER = "admin+clerk_test@iaw.com";
const RIDER_1 = "rider+clerk_test@iaw.com";
const RIDER_2 = "rider2+clerk_test@iaw.com";
const RIDER_CREDIT = "rider_credit+clerk_test@iaw.com";
const RIDER_DENIED = "rider_denied+clerk_test@iaw.com";
const DRIVER_1 = "driver+clerk_test@iaw.com";
const DRIVER_2 = "driver2+clerk_test@iaw.com";

interface ManifestPassenger {
  id: string;
  clerk_user_id: string;
  full_name: string;
  phone: string;
  company_code: string | null;
  status: string;
}

interface ManifestReservation {
  id: string;
  passenger_id: string;
  passenger_user_id: string;
  pool_id: string | null;
  destination_id: string;
  departure_time: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  reservation_status: "CONFIRMED" | "CANCELED";
  payment_status: "PAID";
  max_price: number;
  amount_charged: number;
  credit_applied: number;
  final_trip_price: number | null;
  credit_granted: number;
  currency: string;
  payment_transaction_id: string;
}

async function main() {
  console.log("🌱 Iniciando la precarga de datos (Seeding) consistente para Payments App...");

  // 1. Lectura del seed-manifest.json
  const manifestPath = path.join(__dirname, "../seed-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No se encontró el archivo seed-manifest.json en la ruta: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    passengers: ManifestPassenger[];
    reservations: ManifestReservation[];
  };
  const { passengers = [], reservations = [] } = manifest;

  console.log(`📖 Manifiesto leído: ${passengers.length} pasajeros, ${reservations.length} reservas.`);

  // 2. Limpieza total de la base de datos
  console.log("🗑️ Limpiando base de datos...");
  await prisma.notification.deleteMany();
  await prisma.creditMovement.deleteMany();
  await prisma.charge.deleteMany();
  await prisma.checkoutSession.deleteMany();
  await prisma.poolPriceFinalizationJob.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.creditAccount.deleteMany();
  await prisma.payoutAccount.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.connectionTest.deleteMany();
  console.log("🗑️ Base de datos limpia.");

  // 3. Inyectar pricing rules estándar
  console.log("📏 Inyectando pricing rules...");
  await prisma.pricingRule.createMany({
    data: Array.from({ length: 15 }, (_, i) => {
      const num = i + 1;
      let discount = 0;
      if (num === 3) discount = 5;
      else if (num === 4) discount = 8;
      else if (num >= 5) discount = 10 + (num - 5) * 2; // pr_occ_5 is 10%, pr_occ_15 is 30%

      return {
        id: `pr_occ_${num}`,
        destinationId: null,
        basePrice: money(0),
        minPassengers: num,
        maxPassengers: num,
        discountType: "PERCENTAGE" as const,
        discountValue: money(discount),
        active: true,
      };
    }),
  });

  // 4. Inyectar configuracion del sistema
  console.log("⚙️ Inyectando configuracion del sistema...");
  await prisma.systemSetting.createMany({
    data: [
      {
        key: "price_per_km",
        value: "35.00",
      },
    ],
  });

  // 5. Preparar conductores (Drivers) idénticos a Driver App
  const driversList: { id: string; clerkUserId: string; fullName: string; status: string }[] = [
    { id: "drv_juliana_01", clerkUserId: "user_3EZoK6pR0SB0EYHvCh3rpEcbNWT", fullName: "Juliana Pagani", status: "ACTIVE" },
    { id: "drv_carlos_02", clerkUserId: "user_driver_01", fullName: "Carlos Gómez", status: "ACTIVE" },
    { id: "drv_pedro_03", clerkUserId: "user_driver_02", fullName: "Pedro Picapiedra", status: "ACTIVE" },
    { id: "drv_john_04", clerkUserId: "user_3EJohyoiSblh2utnRB6SrnhumBH", fullName: "John Sebastien Bass", status: "ACTIVE" },
    { id: "drv_juan_05", clerkUserId: "user_3EYQtdZpi4fPlmXGq4EKEa1onL0", fullName: "Juan Lopez", status: "ACTIVE" }, // Coincide con driver+clerk_test@iaw.com
    { id: "drv_juliana_pag", clerkUserId: "user_3EZBdD7n2UefoPdzP4FS1Unf864", fullName: "Juliana Pag", status: "ACTIVE" }, // Coincide con driver1clerk_test@iaw.com
    { id: "drv_nicolas_gonzalez", clerkUserId: "user_3FNQPo24yXJr7Pc39XREgbA1lfY", fullName: "Nicolas Gonzalez", status: "ACTIVE" }, // Coincide con driver3clerk_test@iaw.com
    { id: "drv_pendiente", clerkUserId: "user_clerk_driver_pendiente_999", fullName: "Carlos Gómez (Chofer Pendiente)", status: "INACTIVE" },
    { id: "drv_rechazado", clerkUserId: "user_clerk_driver_rechazado_000", fullName: "Esteban Quito (Rechazado)", status: "REJECTED" }
  ];

  const additionalNames = [
    'Sofia Rodriguez', 'Mateo Gimenez', 'Valentina Perez', 'Lucas Silva',
    'Martina Diaz', 'Thiago Gonzalez', 'Maria Alvarez', 'Bautista Romero',
    'Zoe Fernandez', 'Joaquin Ruiz', 'Camila Gomez', 'Benjamin Ledesma',
    'Catalina Herrera', 'Felipe Medina', 'Isabella Castro', 'Juan Morales'
  ];

  for (let i = 0; i < additionalNames.length; i++) {
    const num = i + 6;
    const id = `drv_gen_${num.toString().padStart(2, '0')}`;
    const clerkUserId = `user_gen_driver_${num.toString().padStart(2, '0')}`;
    driversList.push({
      id,
      clerkUserId,
      fullName: additionalNames[i],
      status: "ACTIVE"
    });
  }

  // 6. Inyectar payout accounts
  console.log("💳 Inyectando payout accounts para conductores...");
  const payoutAccountsData: Prisma.PayoutAccountCreateManyInput[] = [
    {
      id: "po_driver1",
      driverUserId: DRIVER_1, // driver+clerk_test@iaw.com
      provider: "MERCADO_PAGO" as const,
      accountReference: "mp_acc_driver_01",
      alias: "driver.principal.mp",
      status: "ACTIVE" as const,
    },
    {
      id: "po_driver2",
      driverUserId: DRIVER_2, // driver2+clerk_test@iaw.com
      provider: "MERCADO_PAGO" as const,
      accountReference: "mp_acc_driver_02",
      alias: "driver.secundario.mp",
      status: "ACTIVE" as const,
    },
    {
      id: "po_driver2_old",
      driverUserId: DRIVER_2, // driver2+clerk_test@iaw.com
      provider: "MERCADO_PAGO" as const,
      accountReference: "mp_acc_driver_02_old",
      alias: "driver.secundario.old",
      status: "INACTIVE" as const,
    }
  ];

  for (const d of driversList) {
    const accountRef = `mp_acc_${d.id}`;
    // Evitar colisiones si ya está agregado
    if (!payoutAccountsData.some(pa => pa.driverUserId === d.clerkUserId || pa.accountReference === accountRef)) {
      payoutAccountsData.push({
        id: `po_${d.id}`,
        driverUserId: d.clerkUserId,
        provider: "MERCADO_PAGO" as const,
        accountReference: accountRef,
        alias: `${d.fullName.toLowerCase().replace(/\s+/g, ".")}.mp`,
        status: d.status === "ACTIVE" ? "ACTIVE" : d.status === "INACTIVE" ? "INACTIVE" : "REJECTED",
      });
    }
  }

  await prisma.payoutAccount.createMany({ data: payoutAccountsData });

  // 7. Calcular saldo a favor por pasajero del manifiesto mediante simulación cronológica
  console.log("💰 Ejecutando simulación cronológica de saldos a favor (Credits) para pasajeros del manifiesto...");
  
  const runningBalances: Record<string, number> = {};
  for (const p of passengers) {
    runningBalances[p.clerk_user_id] = 0;
  }

  // Ordenar reservas cronológicamente por departure_time
  const sortedReservations = [...reservations].sort((a, b) => {
    return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
  });

  const manifestCheckoutSessions: Prisma.CheckoutSessionCreateManyInput[] = [];
  const manifestCharges: Prisma.ChargeCreateManyInput[] = [];
  const manifestCreditMovements: Prisma.CreditMovementCreateManyInput[] = [];

  for (const r of sortedReservations) {
    const depTime = new Date(r.departure_time);
    const isConfirmed = r.reservation_status === "CONFIRMED";
    const poolId = isConfirmed ? r.pool_id! : "pool_canceled_unassigned";
    const passengerUserId = r.passenger_user_id;

    // 1. Fase de Checkout / Charge
    const balanceBefore = runningBalances[passengerUserId] || 0;
    const maxPriceVal = r.max_price || 3500;
    const creditAppliedVal = Math.min(balanceBefore, maxPriceVal);
    const amountToChargeVal = maxPriceVal - creditAppliedVal;

    // Actualizar balance
    runningBalances[passengerUserId] = balanceBefore - creditAppliedVal;

    // CheckoutSession
    manifestCheckoutSessions.push({
      id: `chk_${r.id}`,
      reservationId: r.id,
      poolId: poolId,
      passengerUserId: passengerUserId,
      maxPrice: money(maxPriceVal),
      availableCreditAtCreation: money(balanceBefore),
      creditApplied: money(creditAppliedVal),
      amountToCharge: money(amountToChargeVal),
      currency: CURRENCY,
      status: "PAID" as const,
      provider: "MERCADO_PAGO" as const,
      checkoutUrl: `https://payments-app.local/checkout/chk_${r.id}`,
      mercadoPagoPreferenceId: `mp_pref_${r.id}`,
      mercadoPagoInitPoint: `https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=mp_pref_${r.id}`,
      expiresAt: new Date(depTime.getTime() + 60 * 60 * 1000),
      createdAt: new Date(depTime.getTime() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(depTime.getTime() - 2 * 60 * 60 * 1000),
    });

    // Charge
    manifestCharges.push({
      id: `chg_${r.id}`,
      transactionId: r.payment_transaction_id,
      checkoutSessionId: `chk_${r.id}`,
      poolPriceFinalizationJobId: isConfirmed ? `ppfj_${poolId}` : null,
      poolId: poolId,
      reservationId: r.id,
      passengerUserId: passengerUserId,
      maxPrice: money(maxPriceVal),
      creditApplied: money(creditAppliedVal),
      amountCharged: money(amountToChargeVal),
      finalTripPrice: isConfirmed ? money(r.final_trip_price || 3000) : null,
      creditGranted: isConfirmed ? money(r.credit_granted || 500) : money(0),
      currency: CURRENCY,
      status: "PAID" as const,
      provider: "MERCADO_PAGO" as const,
      rejectionReason: null,
      processedAt: new Date(depTime.getTime() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
      createdAt: new Date(depTime.getTime() - 2 * 60 * 60 * 1000),
    });

    // Movimiento de crédito aplicado (solo si se usó saldo a favor)
    if (creditAppliedVal > 0) {
      manifestCreditMovements.push({
        id: `cm_applied_${r.id}`,
        creditAccountId: `ca_${passengerUserId}`,
        userId: passengerUserId,
        type: "CREDIT_APPLIED" as const,
        amount: money(creditAppliedVal),
        currency: CURRENCY,
        reservationId: r.id,
        poolId: poolId,
        chargeId: `chg_${r.id}`,
        poolPriceFinalizationJobId: null,
        description: "Saldo a favor aplicado en checkout.",
        createdAt: new Date(depTime.getTime() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
      });
    }

    // 2. Fase de Cierre (Finalización de Pool - solo confirmados)
    if (isConfirmed) {
      const creditGrantedVal = r.credit_granted || 500;
      runningBalances[passengerUserId] = (runningBalances[passengerUserId] || 0) + creditGrantedVal;

      manifestCreditMovements.push({
        id: `cm_granted_${r.id}`,
        creditAccountId: `ca_${passengerUserId}`,
        userId: passengerUserId,
        type: "CREDIT_GRANTED" as const,
        amount: money(creditGrantedVal),
        currency: CURRENCY,
        reservationId: r.id,
        poolId: poolId,
        chargeId: `chg_${r.id}`,
        poolPriceFinalizationJobId: `ppfj_${poolId}`,
        description: "Saldo a favor generado por descuento de ocupación al cierre T-1h.",
        createdAt: new Date(depTime.getTime() - 60 * 60 * 1000 + 5 * 60 * 1000),
      });
    }
  }

  // Crear CreditAccounts
  const creditAccountsData = [
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
    }
  ];

  // Cargar los saldos finales de los pasajeros del manifiesto según la simulación
  for (const [userId, balance] of Object.entries(runningBalances)) {
    if (!creditAccountsData.some(ca => ca.userId === userId)) {
      creditAccountsData.push({
        id: `ca_${userId}`,
        userId,
        balance: money(balance),
        currency: CURRENCY,
      });
    }
  }

  await prisma.creditAccount.createMany({ data: creditAccountsData });

  // 8. Agrupar reservas del manifiesto por pool para los jobs de precio final y choferes
  const confirmedReservations = reservations.filter(
    (r) => r.pool_id && r.reservation_status === "CONFIRMED"
  );

  const reservationsByPool: Record<string, ManifestReservation[]> = {};
  for (const r of confirmedReservations) {
    const poolId = r.pool_id!;
    if (!reservationsByPool[poolId]) {
      reservationsByPool[poolId] = [];
    }
    reservationsByPool[poolId].push(r);
  }

  const poolIds = Object.keys(reservationsByPool);

  // Replicar algoritmo de asignacion de conductores de seedAppDriver.ts
  const juanDriver = { driver_id: "drv_juan_05" };
  const eligibleOtherDrivers = [
    { driver_id: "drv_juliana_01" },
    { driver_id: "drv_carlos_02" },
    { driver_id: "drv_pedro_03" },
    { driver_id: "drv_john_04" },
    { driver_id: "drv_juliana_pag" },
    { driver_id: "drv_nicolas_gonzalez" }
  ];

  for (let i = 0; i < 13; i++) {
    const num = i + 6;
    eligibleOtherDrivers.push({
      driver_id: `drv_gen_${num.toString().padStart(2, "0")}`
    });
  }

  let juanPoolsCount = 0;
  const poolToDriverMap: Record<string, string> = {};

  for (let idx = 0; idx < poolIds.length; idx++) {
    const poolId = poolIds[idx];
    let driverId;
    if (idx % 10 === 0 && juanPoolsCount < 30) {
      driverId = juanDriver.driver_id;
      juanPoolsCount++;
    } else {
      const otherIdx = (idx - juanPoolsCount) % eligibleOtherDrivers.length;
      driverId = eligibleOtherDrivers[otherIdx].driver_id;
    }
    poolToDriverMap[poolId] = driverId;
  }

  // 9. Crear CheckoutSessions, Charges y CreditMovements
  console.log("🛒 Creando CheckoutSessions y Charges para las reservas del manifiesto...");

  const checkoutSessionsToCreate: Prisma.CheckoutSessionCreateManyInput[] = [];
  const chargesToCreate: Prisma.ChargeCreateManyInput[] = [];
  const creditMovementsToCreate: Prisma.CreditMovementCreateManyInput[] = [];
  const finalizationJobsToCreate: Prisma.PoolPriceFinalizationJobCreateManyInput[] = [];

  // A. Demo CheckoutSessions
  const now = new Date();
  checkoutSessionsToCreate.push(
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
      status: "PAID" as const,
      provider: "MERCADO_PAGO" as const,
      checkoutUrl: "https://payments-app.local/checkout/chk_paid_001",
      mercadoPagoPreferenceId: "mp_pref_paid_001",
      mercadoPagoInitPoint: "https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=mp_pref_paid_001",
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
      status: "PAID" as const,
      provider: "MERCADO_PAGO" as const,
      checkoutUrl: "https://payments-app.local/checkout/chk_paid_credit_001",
      mercadoPagoPreferenceId: "mp_pref_paid_credit_001",
      mercadoPagoInitPoint: "https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=mp_pref_paid_credit_001",
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
      status: "PAID" as const,
      provider: "MERCADO_PAGO" as const,
      checkoutUrl: null,
      mercadoPagoPreferenceId: null,
      mercadoPagoInitPoint: null,
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
      status: "DENIED" as const,
      provider: "MERCADO_PAGO" as const,
      checkoutUrl: "https://payments-app.local/checkout/chk_denied_001",
      mercadoPagoPreferenceId: "mp_pref_denied_001",
      mercadoPagoInitPoint: "https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=mp_pref_denied_001",
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
      status: "CANCELED" as const,
      provider: "MERCADO_PAGO" as const,
      checkoutUrl: "https://payments-app.local/checkout/chk_canceled_001",
      mercadoPagoPreferenceId: "mp_pref_canceled_001",
      mercadoPagoInitPoint: "https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=mp_pref_canceled_001",
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
      status: "EXPIRED" as const,
      provider: "MERCADO_PAGO" as const,
      checkoutUrl: "https://payments-app.local/checkout/chk_expired_001",
      mercadoPagoPreferenceId: "mp_pref_expired_001",
      mercadoPagoInitPoint: "https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=mp_pref_expired_001",
      expiresAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    }
  );

  // B. Demo Finalization Jobs
  finalizationJobsToCreate.push(
    {
      id: "ppfj_locked_001",
      poolId: "pool_demo_locked_01",
      reason: "POOL_LOCKED" as const,
      currentPassengers: 8,
      pricingRuleId: "pr_occ_8",
      basePrice: money("5800.00"),
      finalPrice: money("4756.00"),
      discountType: "OCCUPANCY_DISCOUNT" as const,
      discountValue: money("1044.00"),
      currency: CURRENCY,
      status: "COMPLETED" as const,
      startedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      finishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
    },
    {
      id: "ppfj_no_driver_001",
      poolId: "pool_demo_no_driver_01",
      reason: "NO_DRIVER_ASSIGNED" as const,
      currentPassengers: 0,
      pricingRuleId: null,
      basePrice: money("5000.00"),
      finalPrice: money("0.00"),
      discountType: "NO_DRIVER_CREDIT" as const,
      discountValue: money("5000.00"),
      currency: CURRENCY,
      status: "COMPLETED" as const,
      startedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      finishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
    },
    {
      id: "ppfj_failed_001",
      poolId: "pool_demo_failed_01",
      reason: "POOL_LOCKED" as const,
      currentPassengers: 6,
      pricingRuleId: "pr_occ_6",
      basePrice: money("4800.00"),
      finalPrice: null,
      discountType: null,
      discountValue: null,
      currency: CURRENCY,
      status: "FAILED" as const,
      startedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      finishedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
    }
  );

  // C. Demo Charges
  chargesToCreate.push(
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
      status: "PAID" as const,
      provider: "MERCADO_PAGO" as const,
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
      status: "PAID" as const,
      provider: "MERCADO_PAGO" as const,
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
      status: "PAID" as const,
      provider: "MERCADO_PAGO" as const,
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
      status: "DENIED" as const,
      provider: "MERCADO_PAGO" as const,
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
      status: "PAID" as const,
      provider: "MERCADO_PAGO" as const,
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
      status: "PAID" as const,
      provider: "MERCADO_PAGO" as const,
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
      status: "PAID" as const,
      provider: "MERCADO_PAGO" as const,
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
      status: "PAID" as const,
      provider: "MERCADO_PAGO" as const,
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
      status: "PAID" as const,
      provider: "MERCADO_PAGO" as const,
      rejectionReason: null,
      processedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 - 10 * 60 * 1000),
    }
  );

  // D. Demo Credit Movements
  creditMovementsToCreate.push(
    {
      id: "cm_manual_001",
      creditAccountId: "ca_rider_credit",
      userId: RIDER_CREDIT,
      type: "MANUAL_ADJUSTMENT" as const,
      amount: money("3700.00"),
      currency: CURRENCY,
      reservationId: null,
      poolId: null,
      chargeId: null,
      poolPriceFinalizationJobId: null,
      description: "Ajuste manual de saldo para casos demo de checkout.",
      createdAt: new Date(now.getTime() - 11 * 60 * 60 * 1000),
    },
    {
      id: "cm_applied_001",
      creditAccountId: "ca_rider_credit",
      userId: RIDER_CREDIT,
      type: "CREDIT_APPLIED" as const,
      amount: money("1200.00"),
      currency: CURRENCY,
      reservationId: "res_paid_credit_001",
      poolId: "pool_demo_checkout_01",
      chargeId: "chg_paid_credit_001",
      poolPriceFinalizationJobId: null,
      description: "Saldo a favor aplicado en checkout con cobro parcial.",
      createdAt: new Date(now.getTime() - 9 * 60 * 60 * 1000),
    },
    {
      id: "cm_applied_002",
      creditAccountId: "ca_rider_credit",
      userId: RIDER_CREDIT,
      type: "CREDIT_APPLIED" as const,
      amount: money("2500.00"),
      currency: CURRENCY,
      reservationId: "res_paid_full_credit_001",
      poolId: "pool_demo_checkout_02",
      chargeId: "chg_paid_full_credit_001",
      poolPriceFinalizationJobId: null,
      description: "Saldo a favor aplicado en checkout cubierto al 100% por credito.",
      createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
    },
    {
      id: "cm_granted_locked_001",
      creditAccountId: "ca_rider_1",
      userId: RIDER_1,
      type: "CREDIT_GRANTED" as const,
      amount: money("1044.00"),
      currency: CURRENCY,
      reservationId: "res_locked_credit_001",
      poolId: "pool_demo_locked_01",
      chargeId: "chg_locked_credit_001",
      poolPriceFinalizationJobId: "ppfj_locked_001",
      description: "Saldo a favor generado por descuento de ocupacion al cierre T-1h.",
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
    },
    {
      id: "cm_granted_locked_002",
      creditAccountId: "ca_rider_2",
      userId: RIDER_2,
      type: "CREDIT_GRANTED" as const,
      amount: money("1044.00"),
      currency: CURRENCY,
      reservationId: "res_locked_credit_002",
      poolId: "pool_demo_locked_01",
      chargeId: "chg_locked_credit_002",
      poolPriceFinalizationJobId: "ppfj_locked_001",
      description: "Saldo a favor generado por descuento de ocupacion al cierre T-1h.",
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
    },
    {
      id: "cm_granted_no_driver_001",
      creditAccountId: "ca_rider_2",
      userId: RIDER_2,
      type: "CREDIT_GRANTED" as const,
      amount: money("5000.00"),
      currency: CURRENCY,
      reservationId: "res_no_driver_001",
      poolId: "pool_demo_no_driver_01",
      chargeId: "chg_no_driver_001",
      poolPriceFinalizationJobId: "ppfj_no_driver_001",
      description: "Saldo a favor total por pool cancelado sin conductor asignado.",
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
    }
  );

  // E. Crear los Jobs de precio final para todos los pools del manifiesto
  console.log("🚌 Creando PoolPriceFinalizationJobs para los pools del manifiesto...");
  for (const poolId of poolIds) {
    const poolRes = reservationsByPool[poolId];
    const currentPassengers = poolRes.length;
    const pricingRuleId = currentPassengers > 0 && currentPassengers <= 15 ? `pr_occ_${currentPassengers}` : null;
    const depTime = new Date(poolRes[0].departure_time);

    finalizationJobsToCreate.push({
      id: `ppfj_${poolId}`,
      poolId: poolId,
      reason: "POOL_LOCKED" as const,
      currentPassengers,
      pricingRuleId,
      basePrice: money(currentPassengers * 3500),
      finalPrice: money(currentPassengers * 3000),
      discountType: "OCCUPANCY_DISCOUNT" as const,
      discountValue: money(currentPassengers * 500),
      currency: CURRENCY,
      status: "COMPLETED" as const,
      startedAt: new Date(depTime.getTime() - 60 * 60 * 1000),
      finishedAt: new Date(depTime.getTime() - 60 * 60 * 1000 + 5 * 60 * 1000),
    });
  }

  // F. Cargar reservas del manifiesto
  checkoutSessionsToCreate.push(...manifestCheckoutSessions);
  chargesToCreate.push(...manifestCharges);
  creditMovementsToCreate.push(...manifestCreditMovements);

  // G. Escribir los registros en la DB
  console.log("💾 Escribiendo CheckoutSessions, Jobs, Charges y CreditMovements en DB...");

  // Inyectar PoolPriceFinalizationJobs
  const jobChunks = chunkArray(finalizationJobsToCreate, 500);
  for (const chunk of jobChunks) {
    await prisma.poolPriceFinalizationJob.createMany({ data: chunk });
  }

  // Inyectar CheckoutSessions
  const sessionChunks = chunkArray(checkoutSessionsToCreate, 500);
  for (const chunk of sessionChunks) {
    await prisma.checkoutSession.createMany({ data: chunk });
  }

  // Inyectar Charges
  const chargeChunks = chunkArray(chargesToCreate, 500);
  for (const chunk of chargeChunks) {
    await prisma.charge.createMany({ data: chunk });
  }

  // Inyectar CreditMovements
  const movementChunks = chunkArray(creditMovementsToCreate, 500);
  for (const chunk of movementChunks) {
    await prisma.creditMovement.createMany({ data: chunk });
  }

  // 10. Crear Settlements consistentes para todos los pools finalizados del manifiesto
  console.log("💸 Creando Settlements consistentes para conductores...");

  const settlementsToCreate: Prisma.SettlementCreateManyInput[] = [
    {
      id: "st_completed_001",
      poolId: "pool_demo_locked_01",
      driverUserId: DRIVER_1, // driver+clerk_test@iaw.com
      payoutAccountId: "po_driver1",
      amount: money("9512.00"),
      currency: CURRENCY,
      status: "COMPLETED" as const,
      settledAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    },
    {
      id: "st_pending_001",
      poolId: "pool_demo_settlement_01",
      driverUserId: DRIVER_2, // driver2+clerk_test@iaw.com
      payoutAccountId: "po_driver2",
      amount: money("5850.00"),
      currency: CURRENCY,
      status: "PENDING" as const,
      settledAt: null,
    },
    {
      id: "st_failed_001",
      poolId: "pool_demo_settlement_02",
      driverUserId: DRIVER_2, // driver2+clerk_test@iaw.com
      payoutAccountId: "po_driver2",
      amount: money("4800.00"),
      currency: CURRENCY,
      status: "FAILED" as const,
      settledAt: null,
    }
  ];

  // Ordenamos los pools para consistencia en la distribucion de estados de liquidacion
  const sortedPoolIds = [...poolIds].sort();

  for (let idx = 0; idx < sortedPoolIds.length; idx++) {
    const poolId = sortedPoolIds[idx];
    const poolRes = reservationsByPool[poolId];
    const currentPassengers = poolRes.length;
    const depTime = new Date(poolRes[0].departure_time);

    // Resolver conductor
    const driverId = poolToDriverMap[poolId];
    const driverObj = driversList.find(d => d.id === driverId);
    if (!driverObj) continue;

    // Calcular monto: finalTripPrice * cantidad pasajeros (3000 * passengers)
    const amount = currentPassengers * 3000;

    // Distribuir status: 380 completadas, 10 pendientes, 6 falladas
    let status: "PENDING" | "COMPLETED" | "FAILED" = "COMPLETED";
    let settledAt: Date | null = new Date(depTime.getTime() + 2 * 60 * 60 * 1000);

    if (idx >= 380 && idx < 390) {
      status = "PENDING" as const;
      settledAt = null;
    } else if (idx >= 390) {
      status = "FAILED" as const;
      settledAt = null;
    }

    settlementsToCreate.push({
      id: `st_${poolId}`,
      poolId: poolId,
      driverUserId: driverObj.clerkUserId,
      payoutAccountId: `po_${driverId}`,
      amount: money(amount),
      currency: CURRENCY,
      status,
      settledAt,
    });
  }

  await prisma.settlement.createMany({ data: settlementsToCreate });

  // 11. Inyectar Connection Test record
  console.log("🔗 Inyectando conexión de test...");
  await prisma.connectionTest.create({
    data: { label: "ok" },
  });

  // Resumen final de la precarga
  console.log(`
=========================================
Payments seed completed successfully!
=========================================
Reservations linked: ${reservations.length}
Checkouts created: ${checkoutSessionsToCreate.length}
Charges created: ${chargesToCreate.length}
Credit accounts created: ${creditAccountsData.length}
Credit movements created: ${creditMovementsToCreate.length}
Settlements created: ${settlementsToCreate.length}
Skipped records: 0
Warnings: 0
=========================================
  `);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("❌ Error durante la ejecución del seed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
