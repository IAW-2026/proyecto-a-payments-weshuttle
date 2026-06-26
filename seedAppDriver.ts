import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

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
  reservation_status: 'CONFIRMED' | 'CANCELED';
  payment_status: 'PAID';
  max_price: number;
  amount_charged: number;
  credit_applied: number;
  final_trip_price: number | null;
  credit_granted: number;
  currency: string;
  payment_transaction_id: string;
}

async function main() {
  console.log('🌱 Iniciando la precarga de datos (Seeding) consistente...');

  // 1. Lectura del seed-manifest.json
  const manifestPath = path.join(__dirname, '../seed-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No se encontró el archivo seed-manifest.json en la ruta: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    passengers: ManifestPassenger[];
    reservations: ManifestReservation[];
  };
  const { passengers = [], reservations = [] } = manifest;

  console.log(`📖 Manifiesto leído: ${passengers.length} pasajeros, ${reservations.length} reservas.`);

  // 2. Limpieza total de la base de datos (con orden estricto de claves foráneas)
  await prisma.operationalManifestSnapshotPassenger.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.pool.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.driver.deleteMany({});

  console.log('🗑️ Base de datos limpia.');

  // 3. Creación de Conductores
  const driversToCreate: Prisma.DriverCreateManyInput[] = [
    {
      id: 'drv_juliana_01',
      clerk_user_id: 'user_3EZoK6pR0SB0EYHvCh3rpEcbNWT', // Cuenta del usuario
      email: 'juliana@weshuttle.com',
      full_name: 'Juliana Pagani',
      phone: '291-4567890',
      status: 'ACTIVE',
      verification_status: 'APPROVED',
    },
    {
      id: 'drv_carlos_02',
      clerk_user_id: 'user_driver_01', // Coincide con Carlos Gómez / Conductor de Prueba
      email: 'carlos@weshuttle.com',
      full_name: 'Carlos Gómez',
      phone: '291-1111111',
      status: 'ACTIVE',
      verification_status: 'APPROVED',
    },
    {
      id: 'drv_pedro_03',
      clerk_user_id: 'user_driver_02', // Coincide con Pedro Picapiedra
      email: 'pedro@weshuttle.com',
      full_name: 'Pedro Picapiedra',
      phone: '291-2222222',
      status: 'ACTIVE',
      verification_status: 'APPROVED',
    },
    {
      id: 'drv_john_04',
      clerk_user_id: 'user_3EJohyoiSblh2utnRB6SrnhumBH', // Coincide con John Sebastien Bass
      email: 'john@weshuttle.com',
      full_name: 'John Sebastien Bass',
      phone: '291-3333333',
      status: 'ACTIVE',
      verification_status: 'APPROVED',
    },
    {
      id: 'drv_juan_05',
      clerk_user_id: 'user_3EYQtdZpi4fPlmXGq4EKEa1onL0', // Coincide con Juan Lopez
      email: 'driver+clerk_test@iaw.com',
      full_name: 'Juan Lopez',
      phone: '291-4444444',
      status: 'ACTIVE',
      verification_status: 'APPROVED',
    },
    {
      id: 'drv_juliana_pag',
      clerk_user_id: 'user_3EZBdD7n2UefoPdzP4FS1Unf864',
      email: 'driver1clerk_test@iaw.com',
      full_name: 'Juliana Pag',
      phone: '291-666601',
      status: 'ACTIVE',
      verification_status: 'APPROVED',
    },
    {
      id: 'drv_nicolas_gonzalez',
      clerk_user_id: 'user_3FNQPo24yXJr7Pc39XREgbA1lfY',
      email: 'driver3clerk_test@iaw.com',
      full_name: 'Nicolas Gonzalez',
      phone: '291-666602',
      status: 'ACTIVE',
      verification_status: 'APPROVED',
    },
    {
      id: 'drv_pendiente',
      clerk_user_id: 'user_clerk_driver_pendiente_999',
      email: 'pendiente@weshuttle.com',
      full_name: 'Carlos Gómez (Chofer Pendiente)',
      phone: '291-5555555',
      status: 'ACTIVE',
      verification_status: 'PENDING',
    },
    {
      id: 'drv_rechazado',
      clerk_user_id: 'user_clerk_driver_rechazado_000',
      email: 'rechazado@weshuttle.com',
      full_name: 'Esteban Quito (Rechazado)',
      phone: '291-9876543',
      status: 'INACTIVE',
      verification_status: 'REJECTED',
    }
  ];

  // Generamos 16 conductores adicionales (para tener un total de 25)
  const additionalNames = [
    'Sofia Rodriguez', 'Mateo Gimenez', 'Valentina Perez', 'Lucas Silva',
    'Martina Diaz', 'Thiago Gonzalez', 'Maria Alvarez', 'Bautista Romero',
    'Zoe Fernandez', 'Joaquin Ruiz', 'Camila Gomez', 'Benjamin Ledesma',
    'Catalina Herrera', 'Felipe Medina', 'Isabella Castro', 'Juan Morales'
  ];

  for (let i = 0; i < additionalNames.length; i++) {
    const num = i + 6;
    const id = `drv_gen_${num.toString().padStart(2, '0')}`;
    const clerk_user_id = `user_gen_driver_${num.toString().padStart(2, '0')}`;
    const name = additionalNames[i];
    const email = `${name.toLowerCase().replace(/\s+/g, '')}@weshuttle.com`;

    driversToCreate.push({
      id,
      clerk_user_id,
      email,
      full_name: name,
      phone: `291-5555${num.toString().padStart(2, '0')}`,
      status: 'ACTIVE',
      verification_status: 'APPROVED',
    });
  }

  for (const driverData of driversToCreate) {
    await prisma.driver.create({ data: driverData });
  }
  console.log(`👤 Conductores creados (${driversToCreate.length} en total).`);

  // 4. Creación de Vehículos para conductores verificados
  const vehiclesToCreate = [
    {
      id: 'veh_sprinter_01',
      driver_id: 'drv_juliana_01',
      brand: 'Mercedes-Benz',
      model: 'Sprinter',
      license_plate: 'AF123JK',
      capacity: 15,
      status: 'ACTIVE',
    },
    {
      id: 'veh_master_02',
      driver_id: 'drv_carlos_02',
      brand: 'Renault',
      model: 'Master',
      license_plate: 'AE987UI',
      capacity: 15,
      status: 'ACTIVE',
    },
    {
      id: 'veh_transit_03',
      driver_id: 'drv_pedro_03',
      brand: 'Ford',
      model: 'Transit',
      license_plate: 'AG456JK',
      capacity: 15,
      status: 'ACTIVE',
    },
    {
      id: 'veh_boxer_04',
      driver_id: 'drv_john_04',
      brand: 'Peugeot',
      model: 'Boxer',
      license_plate: 'AH789UI',
      capacity: 15,
      status: 'ACTIVE',
    },
    {
      id: 'veh_ducato_05',
      driver_id: 'drv_juan_05',
      brand: 'Fiat',
      model: 'Ducato',
      license_plate: 'AI012UI',
      capacity: 15,
      status: 'ACTIVE',
    },
    {
      id: 'veh_juliana_pag',
      driver_id: 'drv_juliana_pag',
      brand: 'Mercedes-Benz',
      model: 'Sprinter',
      license_plate: 'AF666JP',
      capacity: 15,
      status: 'ACTIVE',
    },
    {
      id: 'veh_nicolas_gonzalez',
      driver_id: 'drv_nicolas_gonzalez',
      brand: 'Renault',
      model: 'Master',
      license_plate: 'AF777NG',
      capacity: 15,
      status: 'ACTIVE',
    }
  ];

  // Generamos vehículos para los choferes adicionales
  const brands = ['Renault', 'Mercedes-Benz', 'Ford', 'Fiat', 'Peugeot', 'Toyota', 'Hyundai'];
  const models = ['Master', 'Sprinter', 'Transit', 'Ducato', 'Boxer', 'Hiace', 'H1'];

  for (let i = 0; i < additionalNames.length; i++) {
    const num = i + 6;
    const driverId = `drv_gen_${num.toString().padStart(2, '0')}`;
    const brandIdx = i % brands.length;

    vehiclesToCreate.push({
      id: `veh_gen_${num.toString().padStart(2, '0')}`,
      driver_id: driverId,
      brand: brands[brandIdx],
      model: models[brandIdx],
      license_plate: `GEN${num.toString().padStart(2, '0')}WS`,
      capacity: 15,
      status: 'ACTIVE',
    });
  }

  for (const vehicleData of vehiclesToCreate) {
    await prisma.vehicle.create({ data: vehicleData });
  }
  console.log(`🚘 Vehículos creados (${vehiclesToCreate.length} en total).`);

  // 5. Creación de los Pools Únicos y Mapeo de Reservas
  // Obtenemos todas las reservas CONFIRMED del manifiesto que tienen pool_id
  const confirmedReservations = reservations.filter(
    (r) => r.pool_id && r.reservation_status === 'CONFIRMED'
  );

  // Agrupamos las reservas CONFIRMED por pool_id
  const reservationsByPool: Record<string, ManifestReservation[]> = {};
  for (const r of confirmedReservations) {
    const poolId = r.pool_id!;
    if (!reservationsByPool[poolId]) {
      reservationsByPool[poolId] = [];
    }
    reservationsByPool[poolId].push(r);
  }

  // Obtenemos todos los pool IDs únicos representados en las reservas
  const poolIds = Object.keys(reservationsByPool);
  console.log(`🚌 Creando ${poolIds.length} pools únicos e inyectando manifiesto operativo...`);

  // Choferes y vehículos activos para la distribución
  const juanDriver = { driver_id: 'drv_juan_05', vehicle_id: 'veh_ducato_05' };

  // Choferes elegibles para los pools restantes (excluyendo a Juan Lopez)
  const eligibleOtherDrivers = [
    { driver_id: 'drv_juliana_01', vehicle_id: 'veh_sprinter_01' },
    { driver_id: 'drv_carlos_02', vehicle_id: 'veh_master_02' },
    { driver_id: 'drv_pedro_03', vehicle_id: 'veh_transit_03' },
    { driver_id: 'drv_john_04', vehicle_id: 'veh_boxer_04' },
    { driver_id: 'drv_juliana_pag', vehicle_id: 'veh_juliana_pag' },
    { driver_id: 'drv_nicolas_gonzalez', vehicle_id: 'veh_nicolas_gonzalez' }
  ];

  // Agregamos a la lista los primeros 13 choferes generados
  // Dejando drv_gen_19, drv_gen_20, drv_gen_21 (los últimos 3) sin viajes asignados
  for (let i = 0; i < 13; i++) {
    const num = i + 6;
    const driverId = `drv_gen_${num.toString().padStart(2, '0')}`;
    eligibleOtherDrivers.push({
      driver_id: driverId,
      vehicle_id: `veh_gen_${num.toString().padStart(2, '0')}`
    });
  }

  let juanPoolsCount = 0;

  for (let idx = 0; idx < poolIds.length; idx++) {
    const poolId = poolIds[idx];

    // Juan Lopez recibe exactamente 30 pools distribuidos cada 10 pools
    let mapping;
    if (idx % 10 === 0 && juanPoolsCount < 30) {
      mapping = juanDriver;
      juanPoolsCount++;
    } else {
      // Los otros choferes activos se dividen los pools restantes
      const otherIdx = (idx - juanPoolsCount) % eligibleOtherDrivers.length;
      mapping = eligibleOtherDrivers[otherIdx];
    }

    // Obtenemos las reservas para este pool ID
    const poolReservations = reservationsByPool[poolId];

    // Para determinar la fecha del viaje y el destino, tomamos la primera reserva asociada
    let departureTime = new Date('2026-06-20T08:00:00Z');
    let destinationId = 'dest_polo_petroquimico';

    if (poolReservations.length > 0) {
      departureTime = new Date(poolReservations[0].departure_time);
      destinationId = poolReservations[0].destination_id;
    }

    // Crear el Pool
    await prisma.pool.create({
      data: {
        id: poolId,
        destination_id: destinationId,
        departure_time: departureTime,
        status: 'COMPLETED', // Todos en el pasado
        driver_id: mapping.driver_id,
        vehicle_id: mapping.vehicle_id,
        current_passengers: poolReservations.length,
        max_capacity: 15
      }
    });

    // Inyectar los pasajeros en el manifest snapshot local
    const passengerSnapshots = poolReservations.map((r, orderIdx) => {
      // Encontrar el nombre del pasajero en la lista
      const pass = passengers.find((p) => p.id === r.passenger_id);
      const passengerName = pass ? pass.full_name : 'Pasajero';

      return {
        pool_id: poolId,
        reservation_id: r.id,
        passenger_user_id: r.passenger_user_id,
        passenger_name: passengerName,
        pickup_address: r.pickup_address,
        pickup_lat: r.pickup_lat,
        pickup_lng: r.pickup_lng,
        pickup_order: orderIdx + 1,
        passenger_status: 'COMPLETED'
      };
    });

    await prisma.operationalManifestSnapshotPassenger.createMany({
      data: passengerSnapshots
    });

    if ((idx + 1) % 50 === 0 || idx === poolIds.length - 1) {
      console.log(`✔️ Procesados ${idx + 1}/${poolIds.length} pools...`);
    }
  }

  console.log(`🎉 Seeding finalizado con éxito total! (Juan Lopez asignado a ${juanPoolsCount} pools).`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });