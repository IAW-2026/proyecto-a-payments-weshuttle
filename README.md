# WeShuttle - Payments App (Etapa 3)

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

Esta aplicación, **Payments App**, es un microservicio full-stack desarrollado con Next.js App Router. Su responsabilidad es centralizar la lógica financiera del sistema: calculo de precios, checkouts de reserva, cobros, saldo a favor, movimientos de credito y liquidaciones a conductores.

En la Etapa 3, Payments App ya no debe describirse como un servicio aislado. Los flujos principales deben integrarse con Rider App, Driver App y, cuando corresponda, Feedback App, utilizando los contratos documentados en `docs/03-apis.md`.

El flujo vigente establece que el pasajero paga el precio maximo al momento de reservar. Luego, al cierre T-1h, Payments App calcula el precio final del viaje segun la ocupacion real del pool. Si corresponde, la diferencia entre el precio maximo pagado y el precio final se acredita como saldo a favor para proximos viajes.

## 5. Notas o comentarios para la corrección
### Integracion de Mercado Pago Sandbox

La aplicacion utiliza Mercado Pago Checkout Pro en modo Sandbox para simular pagos sin dinero real.

El flujo de pago se realiza mediante una sesion de checkout asociada a una reserva. Rider App crea el checkout llamando al backend de Payments App y recibe una `checkout_url` interna. Desde esa pantalla, Payments App muestra el resumen del cobro, aplica el saldo a favor disponible del pasajero y luego redirige a Mercado Pago Checkout Pro.

La variable `MERCADOPAGO_TEST_BUYER_EMAIL` es opcional y se usa solo para pruebas Sandbox con tarjeta dentro de Checkout Pro. Si esta definida, Payments App la envia como `payer.email` al crear la `Preference`. Esta variable no reemplaza `MERCADOPAGO_ACCESS_TOKEN` y nunca se expone al frontend.

Las variables `RIDER_APP_URL`, `DRIVER_APP_URL` y `FEEDBACK_APP_URL` deben apuntar a los deploys o entornos reales de las otras apps cuando se recorren flujos integrados. Las variantes `NEXT_PUBLIC_*` siguen siendo utiles para navegacion del frontend, pero no reemplazan la necesidad de integracion real entre servicios.

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
- en ningun caso un resultado no exitoso debe contarse como reserva efectivamente pagada.

---

### Cambio de flujo respecto al cobro automatico

En versiones anteriores del diseno se contemplaba un cobro automatico en T-1h.

Ese flujo fue reemplazado por una alternativa mas simple y demostrable para la defensa:

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

No se modela expiracion de credito en el alcance actual del proyecto.

---

### Reglas de precio y descuento por ocupacion

Las reglas de precio se administran mediante `pricing_rules`.

El descuento por ocupacion se calcula al cierre T-1h dentro del proceso `pool_price_finalization_jobs`.

No se modela una entidad separada de `charge_discounts`, porque el descuento principal depende del pool completo y de su ocupacion final. El resultado individual se refleja en cada `charge` mediante:

- `final_trip_price`;
- `credit_granted`;
- `pool_price_finalization_job_id`.

---

### Integraciones externas y criterio de mocks

En Etapa 3, las integraciones con otras aplicaciones del ecosistema deben usar APIs reales como comportamiento principal.

Contratos principales involucrados:

```http
GET /api/pools/:pool_id/passengers?payment_status=PAID
PATCH /api/reservations/:reservation_id/payment-result
PATCH /api/reservations/:reservation_id/credit-adjustment
POST /api/pools/:pool_id/payment-denied
```

Los datos demo, seeds o herramientas internas de prueba pueden seguir existiendo para verificacion o desarrollo local, pero no deben presentarse como fuente principal de informacion cuando exista una app externa real configurada.

Si una app externa no responde o la integracion no esta disponible, el criterio documental de Etapa 3 es registrar y exponer un error controlado o estado de integracion no disponible. No debe describirse como comportamiento esperado ocultar la falla con mocks silenciosos en produccion.

---

### Busqueda y paginacion por URL

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

### Alcance de la Etapa 3

La aplicacion debe poder demostrar, al menos, un flujo integrado de punta a punta y mantener sus vistas internas de administracion y consulta:

- estimacion de precios;
- creación de checkout;
- pago mediante Mercado Pago Sandbox;
- aplicacion de saldo a favor;
- consulta de saldo a favor;
- calculo de ajustes de credito al cierre T-1h;
- generacion de saldo a favor por cancelacion de pool sin conductor;
- liquidaciones a conductores;
- panel administrativo con datos precargados;
- integracion real con Rider App y Driver App en los flujos principales cuando las URLs externas estan configuradas.

### Relacion con Control Plane y Analytics Dashboard

Control Plane y Analytics Dashboard forman parte de los entregables globales de la Etapa 3, pero son aplicaciones transversales separadas de este repositorio.

Payments App no los reemplaza ni es reemplazada por ellos. Su rol es exponer y consumir la informacion financiera necesaria para que esas aplicaciones puedan operar sobre el sistema completo.
