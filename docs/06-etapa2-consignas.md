# 1. Contexto y Objetivo de la Etapa 2
El objetivo de esta etapa es desarrollar la **Payments App** del proyecto WeShuttle (Tipo A) de forma completamente aislada.

Esta aplicación es responsable de:

- calcular precios máximos y estimados;
- crear checkouts de pago para reservas;
- procesar pagos mediante Mercado Pago Sandbox;
- registrar cobros y transacciones;
- aplicar saldo a favor disponible al momento de pagar;
- calcular el precio final del viaje al cierre T-1h;
- generar saldo a favor cuando corresponda;
- gestionar liquidaciones a conductores.

En el flujo actualizado, el pasajero **no deja cargado un método de pago para cobros automáticos**. En cambio, paga directamente el precio máximo de la reserva al momento de reservar.

Luego, al cierre del pool en T-1h, la Payments App calcula el precio final real del viaje según la ocupación del pool. Si el precio final resulta menor al precio máximo pagado, la diferencia se acredita al pasajero como saldo a favor para próximos viajes.

**Regla de Oro para el Agente (OpenCode):** La aplicación debe funcionar por sí sola. Todas las llamadas a APIs externas, como Rider App, Driver App o Feedback App, **DEBEN SER MOCKEADAS o simuladas** devolviendo datos estáticos que respeten los contratos definidos, ya que las otras aplicaciones no estarán conectadas en esta etapa.

## 2. Stack Tecnológico y Configuración Base
El proyecto parte con la siguiente infraestructura ya configurada por el desarrollador:
* **Framework:** Next.js (Frontend / Full-stack).
* **Base de Datos:** PostgreSQL (instancia propia y exclusiva para Payments App).
* **ORM:** Prisma.
* **Autenticación:** Clerk (compartido con las otras apps mediante `clerk_user_id`).
* **Pasarela de Pagos:** Mercado Pago en modo Sandbox (Obligatorio).
* **Estilos:** Tailwind CSS.
* **Deploy:** Vercel.

### Flujo de Trabajo en Git
Todo el desarrollo automatizado y manual se realizará en la rama `develop`. Una vez estabilizadas las features, se unificarán en `release`, y la entrega final para la evaluación de la cátedra se realizará exclusivamente desde la rama `main`.

## 3. Requerimientos Funcionales y de Interfaz
La aplicación debe contar con páginas y componentes reutilizables, manejo de errores, página 404, validación de formularios del lado servidor y buenas prácticas de accesibilidad.

Las vistas principales a desarrollar son:

1. **Panel de Administración (`admin`)**
   - Gestión de reglas de precio (`pricing_rules`).
   - Visualización de cobros y transacciones.
   - Visualización de saldos a favor y movimientos de crédito.
   - Visualización de procesos de finalización de precio de pools.
   - Visualización de liquidaciones a conductores.
   - Listados con búsqueda, filtros y paginación cuando corresponda.

2. **Vista para Pasajero (`rider`)**
   - Visualización del detalle de pago de una reserva.
   - Inicio o simulación de checkout de una reserva.
   - Visualización del saldo a favor disponible.
   - Visualización de pagos realizados.
   - Visualización de créditos generados por descuentos de ocupación o cancelación de pool.

3. **Vista para Conductor (`driver`)**
   - Interfaz para configurar o consultar dónde quiere recibir sus pagos, si corresponde.
   - Visualización de liquidaciones asociadas al conductor.

4. **Flujo de Checkout**
   - Pantalla o flujo para pagar una reserva mediante Mercado Pago Sandbox.
   - Aplicación automática del saldo a favor disponible antes de cobrar.
   - Visualización del resultado del pago.

5. **Flujo de Ajustes de Crédito**
   - Simulación del cierre de un pool en T-1h.
   - Cálculo del precio final según ocupación.
   - Generación de saldo a favor cuando el precio final sea menor al precio máximo pagado.
   - Simulación de notificación a Rider App para informar crédito generado.

*Nota: Debe implementarse búsqueda y paginación mediante parámetros en la URL en los listados que aplique.*

## 4. Modelo de Datos (Esquema de Prisma)
La base de datos de Payments App es dueña absoluta de la información financiera y de precios.

No se deben modelar datos que pertenezcan a otras apps, como Reservas o Pools, sino guardar sus IDs como referencias externas:

- `reservation_id`;
- `pool_id`;
- `passenger_user_id`;
- `driver_user_id`.

Entidades a generar en `schema.prisma`:

### Entidades principales

* `pricing_rules`: Reglas para calcular precios máximos, estimados, precio final y descuentos por ocupación.
* `checkout_sessions`: Sesiones de checkout creadas para pagar una reserva.
* `charges`: Cobros individuales asociados a reservas.
* `credit_accounts`: Saldo a favor acumulado por usuario.
* `credit_movements`: Movimientos de saldo a favor, como crédito generado o crédito aplicado.
* `pool_price_finalization_jobs`: Procesos de cálculo de precio final y generación de saldo a favor al cierre T-1h o por cancelación de pool.
* `payout_accounts`: Cuentas de cobro configuradas por los conductores.
* `settlements`: Liquidaciones de fondos hacia los conductores.

### Entidades  futuras

* `payment_methods`: No es obligatoria en esta etapa, porque el pasajero paga cada reserva mediante checkout y no se requiere guardar un método de pago reutilizable para cobros automáticos.

### Entidades que no se modelan en esta etapa

* `auto_charge_jobs`: Se elimina porque ya no existe cobro automático en T-1h.
* `charge_discounts`: No se modela como entidad separada en esta etapa. El descuento por ocupación se registra dentro de `pool_price_finalization_jobs`, ya que se calcula a nivel de pool. El resultado individual se refleja en cada `charge` mediante `final_trip_price` y `credit_granted`.

## 5. Endpoints a Exponer (API Propia)
La Payments App debe exponer y procesar lógicamente los siguientes endpoints REST:

### `GET /api/payments/pricing-estimate`

Calcula precio máximo y precio estimado recibiendo:

- `origin_lat`;
- `origin_lng`;
- `destination_id`;
- `current_passengers`.

Este endpoint es consumido por Rider App para mostrar al pasajero una estimación antes de reservar.

---

### `POST /api/payments/reservations/:reservation_id/checkout`

Crea una instancia de checkout para una reserva.

**Lógica esperada:**

1. Recibe los datos de la reserva desde Rider App.
2. Busca el saldo a favor disponible del pasajero.
3. Aplica el saldo disponible sobre el precio máximo.
4. Calcula cuánto debe cobrarse mediante Mercado Pago.
5. Crea una `checkout_session`.
6. Devuelve una `checkout_url` interna de Payments App para redirigir al pasajero.

Este endpoint reemplaza la idea de dejar un método de pago cargado para cobro automático.

---

### `GET /api/payments/users/:user_id/credit-balance`

Devuelve el saldo a favor disponible de un usuario.

Puede ser usado por Rider App o por la propia Payments App para mostrar el crédito disponible antes de crear un checkout.

---

### `POST /api/payments/pools/:pool_id/credit-adjustments`

Solicita el cálculo de ajustes de crédito de un pool.

**Lógica esperada:**

1. Recibe la solicitud desde Driver App.
2. Consulta el manifiesto mockeado de pasajeros pagados mediante `GET /api/pools/:pool_id/passengers?payment_status=PAID`.
3. Calcula el precio final del viaje según la ocupación del pool.
4. Compara el precio máximo pagado con el precio final calculado.
5. Genera saldo a favor si corresponde.
6. Crea movimientos en `credit_movements`.
7. Actualiza los `charges` con `final_trip_price` y `credit_granted`.
8. Simula la notificación a Rider App mediante `PATCH /api/reservations/:reservation_id/credit-adjustment`.

También debe soportar el caso `NO_DRIVER_ASSIGNED`, en el cual se acredita al pasajero el monto pagado como saldo a favor.

---

### `POST /api/payments/pools/:pool_id/settle`

Informa el fin de viaje y liquida los fondos al `driver_user_id`.

**Lógica esperada:**

1. Busca los cobros exitosos asociados al pool.
2. Calcula el monto a liquidar.
3. Crea una liquidación en `settlements`.
4. Permite consultar el resultado desde el panel administrativo o la vista del conductor.

## 6. Endpoints Externos a Mockear (Dependencias)
Durante la Etapa 2, cualquier comunicación con el exterior, salvo Mercado Pago Sandbox, debe simularse mediante funciones `stub` o `mocks` de fetch.

### Hacia Rider App

#### `GET /api/pools/:pool_id/passengers?payment_status=PAID`

Simula la obtención del manifiesto de pasajeros pagados de un pool.

Este mock debe devolver pasajeros con:

- `reservation_id`;
- `passenger_user_id`;
- `passenger_name`;
- `reservation_status`;
- `payment_status`;
- `max_price`;
- `amount_charged`;
- `credit_applied`;
- `final_trip_price`;
- `credit_granted`;
- `currency`.

Se usa para calcular ajustes de crédito al cierre T-1h.

---

#### `PATCH /api/reservations/:reservation_id/payment-result`

Simula el aviso a Rider App del resultado del pago.

Debe poder enviar:

- pago exitoso (`payment_status = PAID`);
- pago rechazado (`payment_status = DENIED`);
- checkout cancelado (`payment_status = CANCELED`);
- checkout expirado (`payment_status = EXPIRED`);
- `transaction_id`;
- `max_price`;
- `credit_applied`;
- `amount_charged`;
- `rejection_reason`, si corresponde.

Reglas esperadas en Rider App:

- si `payment_status = PAID`, la reserva deja `PENDING_PAYMENT` y pasa a `PENDING_DRIVER` o `CONFIRMED`;
- si `payment_status = DENIED`, la reserva queda en `PENDING_PAYMENT` y puede reintentarse;
- si `payment_status = CANCELED` o `EXPIRED`, la reserva pasa a `CANCELED`;
- en ningun caso no exitoso la reserva forma parte efectiva del pool.

---

#### `PATCH /api/reservations/:reservation_id/credit-adjustment`

Simula el aviso a Rider App de que se generó saldo a favor para una reserva.

Debe enviar:

- `pool_id`;
- `passenger_user_id`;
- `final_trip_price`;
- `credit_granted`;
- `credit_balance_after`;
- `reason`;
- `processed_at`.

Rider App usaría esta información para actualizar la reserva y mostrar una notificación o toast al pasajero.

---

### Hacia Driver App

En el nuevo flujo no existe un endpoint separado para `payment-denied` en T-1h. Si el pago falla al momento de reservar, la reserva no queda confirmada y no forma parte efectiva del pool.

## 7. Flujos que debe poder demostrar la app

La aplicación debe permitir demostrar los siguientes flujos de forma aislada, usando mocks para las apps externas.

    ### Flujo 1 — Estimación de precio

1. Ingresar origen, destino y ocupación actual.
2. Consultar `GET /api/payments/pricing-estimate`.
3. Mostrar precio máximo y precio estimado.

    ### Flujo 2 — Checkout de reserva

1. Simular una reserva creada en Rider App.
2. Crear checkout mediante `POST /api/payments/reservations/:reservation_id/checkout`.
3. Aplicar saldo a favor si existe.
4. Redirigir o simular pago con Mercado Pago Sandbox.
5. Registrar el cobro en `charges`.
6. Simular notificación a Rider App mediante `PATCH /api/reservations/:reservation_id/payment-result`.

    ### Flujo 3 — Consulta de saldo a favor

1. Consultar `GET /api/payments/users/:user_id/credit-balance`.
2. Mostrar saldo disponible del pasajero.

    ### Flujo 4 — Ajustes de crédito al cierre T-1h

1. Simular cierre del pool.
2. Ejecutar `POST /api/payments/pools/:pool_id/credit-adjustments`.
3. Obtener manifiesto mockeado de pasajeros pagados.
4. Calcular precio final según ocupación.
5. Generar saldo a favor si corresponde.
6. Registrar movimientos en `credit_movements`.
7. Simular notificación a Rider App mediante `PATCH /api/reservations/:reservation_id/credit-adjustment`.

    ### Flujo 5 — Cancelación de pool sin conductor

1. Simular un pool cancelado por falta de conductor.
2. Ejecutar `POST /api/payments/pools/:pool_id/credit-adjustments` con `reason = NO_DRIVER_ASSIGNED`.
3. Acreditar al pasajero el monto pagado como saldo a favor.
4. Registrar movimientos en `credit_movements`.
5. Simular notificación a Rider App.

    ### Flujo 6 — Liquidación a conductor

1. Simular viaje completado.
2. Ejecutar `POST /api/payments/pools/:pool_id/settle`.
3. Calcular monto a liquidar.
4. Crear liquidación en `settlements`.
5. Mostrar liquidación en vista admin o vista conductor.

## 8. Criterios de Entrega Estrictos (Checklist Cátedra)

### A. Usuarios de Prueba (Clerk)
Crear usuarios en Clerk siguiendo estrictamente este formato para la corrección:
* **Pasajero:** `rider+clerk_test@iaw.com` | Pass: `iawuser#` (Asegurar claim: `role: "rider"`)
* **Conductor:** `driver+clerk_test@iaw.com` | Pass: `iawuser#` (Asegurar claim: `role: "driver"`)
* **Administrador:** `admin+clerk_test@iaw.com` | Pass: `iawuser#` (Asegurar claim: `role: "admin"`)

### B. Datos Precargados (Seed)
La base de datos de producción **no puede estar vacía**.

Se debe crear un script de `seed` en Prisma que genere un volumen razonable de información para recorrer todos los casos de uso.

Datos mínimos recomendados:

- múltiples reglas de precio (`pricing_rules`) para distintos niveles de ocupación;
- sesiones de checkout (`checkout_sessions`) en estados `CREATED`, `PAID`, `DENIED`, `CANCELED` y `EXPIRED`;
- cobros (`charges`) exitosos, rechazados y pendientes;
- cuentas de crédito (`credit_accounts`) con saldo disponible y sin saldo;
- movimientos de crédito (`credit_movements`) de tipo `CREDIT_GRANTED`, `CREDIT_APPLIED` y `MANUAL_ADJUSTMENT`;
- procesos de finalización de precio (`pool_price_finalization_jobs`) completados y fallidos;
- cuentas de cobro de conductores (`payout_accounts`);
- liquidaciones (`settlements`) completadas, pendientes y fallidas.

El seed debe permitir demostrar:

- pago de una reserva;
- aplicación de saldo a favor en un checkout;
- generación de saldo a favor por descuento de ocupación;
- generación de saldo a favor por cancelación de pool sin conductor;
- liquidación a conductor;
- reportes/listados en el panel administrativo.

### C. Estructura del README.md
El README debe ser breve y mantener este orden exacto:

1. **Link al deploy de producción**
   - URL de Vercel apuntando a `main`.

2. **Listado de usuarios disponibles para pruebas**
   - Pasajero: `rider+clerk_test@iaw.com`
   - Conductor: `driver+clerk_test@iaw.com`
   - Administrador: `admin+clerk_test@iaw.com`

3. **Instrucciones necesarias para utilizar o evaluar la aplicación**
   - Cómo iniciar sesión.
   - Cómo acceder al panel admin.
   - Cómo probar un checkout.
   - Cómo probar Mercado Pago Sandbox.
   - Cómo ejecutar o simular ajustes de crédito.
   - Cómo ver saldo a favor.
   - Cómo ver liquidaciones.

4. **Breve descripción del proyecto**
   - Máximo 3 o 4 párrafos.
   - Explicar que Payments App funciona de forma aislada.
   - Explicar que las apps externas están mockeadas.
   - Explicar que Mercado Pago se usa en modo Sandbox.

5. **Notas o comentarios**
   - Decisiones de diseño.
   - Nuevo flujo de pago al reservar.
   - Aplicación de saldo a favor.
   - Cálculo de precio final en T-1h.
   - Alcance del mockeo de APIs externas.
   - Limitaciones conocidas.


## 9. Resumen de endpoints finales para este documento

Agregar o usar esta lista como referencia final.

```markdown
### Endpoints propios de Payments App

```http
GET /api/payments/pricing-estimate
POST /api/payments/reservations/:reservation_id/checkout
GET /api/payments/users/:user_id/credit-balance
POST /api/payments/pools/:pool_id/credit-adjustments
POST /api/payments/pools/:pool_id/settle
```

### Endpoints externos mockeados

```http
GET /api/pools/:pool_id/passengers?payment_status=PAID
PATCH /api/reservations/:reservation_id/payment-result
PATCH /api/reservations/:reservation_id/credit-adjustment
```

### Endpoints eliminados o reemplazados

```http
POST /api/payments/pools/:pool_id/auto-charge  # reemplazado por /credit-adjustments
```
