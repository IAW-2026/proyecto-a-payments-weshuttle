# WeShuttle - Payments App (Etapa 2)

## 1. Link al deploy de producción
https://proyecto-a-payments-weshuttle.vercel.app/

## 2. Listado de usuarios disponibles para pruebas
A continuación, los usuarios configurados en Clerk para probar los distintos roles del sistema. La contraseña para todos es `iawuser#`.

* **Pasajero (Rider):**
  * `rider+clerk_test@iaw.com`

* **Conductor (Driver):**
  * `driver+clerk_test@iaw.com`

* **Administrador (Admin):**
  * `admin+clerk_test@iaw.com`

### Usuarios adicionales para pruebas internas

Estos usuarios pueden utilizarse para recorrer casos alternativos del seed o flujos específicos de prueba.

* **Pasajeros adicionales:**
  * `rider2+clerk_test@iaw.com`
  * `rider_credit+clerk_test@iaw.com` — pasajero con saldo a favor precargado.
  * `rider_denied+clerk_test@iaw.com` — pasajero para simular pago rechazado.

* **Conductores adicionales:**
  * `driver2+clerk_test@iaw.com`

## 3. Instrucciones de uso
1. Clonar el repositorio e ingresar al proyecto.

2. Configurar las variables de entorno copiando el contenido de `.env.example` en un archivo `.env.local` o `.env`.

   Deben configurarse, como mínimo:

   - credenciales de Clerk;
   - URL de conexión a PostgreSQL;
   - `MERCADOPAGO_ACCESS_TOKEN` de Sandbox;
   - variables públicas necesarias para el frontend.

3. Instalar dependencias:

```bash
npm install
```

4. Generar el cliente de Prisma:

```bash
npm run prisma:generate
```

5. Ejecutar las migraciones de base de datos:

```bash
npm run prisma:migrate
```

6. Poblar la base de datos con datos de prueba:

```bash
npm run prisma:seed
```

También puede ejecutarse:

```bash
npx prisma db seed
```

7. Levantar el entorno de desarrollo:

```bash
npm run dev
```

8. Acceder a la aplicación local:

```text
http://localhost:3000
```

## 4. Breve descripción del proyecto

WeShuttle es una plataforma de transporte orientada a empleados que se trasladan hacia nodos industriales mediante viajes compartidos y programados.

Esta aplicación, **Payments App**, es un microservicio full-stack desarrollado con Next.js App Router. Su responsabilidad es centralizar la lógica financiera del sistema: cálculo de precios, checkouts de reserva, cobros, saldo a favor, movimientos de crédito y liquidaciones a conductores.

Durante la Etapa 2, la Payments App funciona de forma aislada. Las demás aplicaciones del ecosistema, como Rider App y Driver App, se simulan mediante mocks o stubs que respetan los contratos de APIs definidos en la documentación del proyecto.

El flujo actualizado establece que el pasajero paga el precio máximo al momento de reservar. Luego, al cierre T-1h, Payments App calcula el precio final del viaje según la ocupación real del pool. Si corresponde, la diferencia entre el precio máximo pagado y el precio final se acredita como saldo a favor para próximos viajes.

## 5. Notas o comentarios para la corrección
### Integración de Mercado Pago Sandbox

La aplicación utiliza Mercado Pago en modo Sandbox para simular pagos sin dinero real.

El flujo de pago se realiza mediante una sesión de checkout asociada a una reserva. Si el pasajero tiene saldo a favor disponible, Payments App lo aplica antes de cobrar la diferencia mediante Mercado Pago.

El resultado del checkout se informa a Rider App reutilizando:

```http
PATCH /api/reservations/:reservation_id/payment-result
```

Los resultados posibles del intento de pago son:

- `PAID`;
- `DENIED`;
- `CANCELED`;
- `EXPIRED`.

Reglas del flujo:

- si el pago es `PAID`, la reserva pasa a formar parte efectiva del pool;
- si el pago es `DENIED`, la reserva permanece en `PENDING_PAYMENT` y puede reintentarse;
- si el checkout es `CANCELED` o `EXPIRED`, la reserva pasa a `CANCELED`;
- en ningun caso no exitoso la reserva forma parte efectiva del pool.

---

### Cambio de flujo respecto al cobro automático

En versiones anteriores del diseño se contemplaba un cobro automático en T-1h.

Ese flujo fue reemplazado por una alternativa más simple y demostrable para la defensa:

1. El pasajero paga al momento de reservar.
2. Payments App cobra el precio máximo.
3. Si el pasajero tiene saldo a favor, lo aplica primero.
4. En T-1h, Payments App calcula el precio final según la ocupación real.
5. Si el precio final es menor al precio máximo pagado, se genera saldo a favor.

Por este motivo, el cierre T-1h se resuelve mediante:

```http
POST /api/payments/pools/:pool_id/credit-adjustments
```

---

### Saldo a favor

Payments App es la fuente de verdad del saldo a favor.

El saldo se modela mediante:

- `credit_accounts`;
- `credit_movements`.

Los movimientos principales son:

```text
CREDIT_GRANTED
CREDIT_APPLIED
MANUAL_ADJUSTMENT
```

No se modela expiración de crédito en esta etapa.

---

### Reglas de precio y descuento por ocupación

Las reglas de precio se administran mediante `pricing_rules`.

El descuento por ocupación se calcula al cierre T-1h dentro del proceso `pool_price_finalization_jobs`.

No se modela una entidad separada de `charge_discounts` en esta etapa, porque el descuento principal depende del pool completo y de su ocupación final. El resultado individual se refleja en cada `charge` mediante:

- `final_trip_price`;
- `credit_granted`;
- `pool_price_finalization_job_id`.

---

### Mocks de APIs externas

Todas las interacciones externas hacia otras aplicaciones del ecosistema se encuentran aisladas y simuladas.

Los mocks o stubs se ubican en el directorio:

```text
src/lib/external-apis/
```

Endpoints externos simulados:

```http
GET /api/pools/:pool_id/passengers?payment_status=PAID
PATCH /api/reservations/:reservation_id/payment-result
PATCH /api/reservations/:reservation_id/credit-adjustment
```

No existe un endpoint separado para `payment-denied` en T-1h, porque en el nuevo flujo no hay pagos automáticos rechazados al cierre del pool. Si el pago falla al momento de reservar, la reserva no queda confirmada y no forma parte efectiva del pool.

---

### Búsqueda y paginación por URL

Los listados principales deben implementar búsqueda, filtros y paginación mediante parámetros en la URL cuando corresponda.

Esto permite navegar los listados del panel administrativo y de las vistas por rol sin perder el estado de búsqueda.

---

### Dashboard financiero

El panel administrativo permite visualizar información financiera relevante, como:

- total cobrado;
- cantidad de cobros exitosos;
- cantidad de cobros rechazados;
- saldo a favor generado;
- saldo a favor aplicado;
- liquidaciones pendientes;
- liquidaciones completadas;
- procesos de finalización de precio del pool.

---

### Alcance de la Etapa 2

La aplicación debe poder demostrar de forma aislada:

- estimación de precios;
- creación de checkout;
- pago mediante Mercado Pago Sandbox;
- aplicación de saldo a favor;
- consulta de saldo a favor;
- cálculo de ajustes de crédito al cierre T-1h;
- generación de saldo a favor por cancelación de pool sin conductor;
- liquidaciones a conductores;
- panel administrativo con datos precargados.
