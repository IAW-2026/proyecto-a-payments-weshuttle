# 1.4 — Modelo de Datos por Aplicación

> **Tipo A — Plataforma de Transporte (WeShuttle)**

Cada webapp persiste sus propios datos en una base de datos independiente.

Ninguna aplicación accede directamente a la base de datos de otra app. Cuando una aplicación necesita información que pertenece a otra, debe obtenerla mediante las APIs inter-servicio definidas en el documento **1.3 — Diseño de APIs Inter-Servicios**.

El modelo de datos se define respetando las fuentes de verdad de cada dominio:

- **Clerk** es la fuente de verdad de identidad de usuarios.
- **Driver App** es la fuente de verdad de conductores, vehículos, pools y estado operativo del viaje.
- **Rider App** es la fuente de verdad de pasajeros, destinos, reservas e historial de viajes.
- **Payments App** es la fuente de verdad de precios, cobros, transacciones y liquidaciones.
- **Feedback App** es la fuente de verdad de reseñas, reportes y promedios de calificación.

Identificadores compartidos entre aplicaciones:

- `clerk_user_id`: identifica usuarios de forma transversal entre todas las apps.
- `pool_id`: identifica un pool creado por la **Driver App**.
- `reservation_id`: identifica una reserva creada por la **Rider App**.
- `transaction_id`: identifica una transacción creada por la **Payments App**.
- `review_id`: identifica una reseña creada por la **Feedback App**.

---

## Driver App

La **Driver App** administra la operación del viaje. Es responsable de los conductores, vehículos, pools, marketplace y estado operativo del recorrido.

La **Driver App** no almacena las reservas como entidad propia. Las reservas son responsabilidad de la **Rider App**. Cuando la Driver App necesita conocer los pasajeros asociados a un pool, debe consultar a la Rider App mediante:

```http
GET /api/pools/:pool_id/passengers
```

La única información de pasajeros que la Driver App puede persistir es el snapshot operativo final del manifiesto, generado al momento de iniciar el recorrido, con las reservas que se encuentren en estado `PAID`.

---

### Entidades principales

### `drivers`

Representa a los conductores registrados en la aplicación.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador interno del conductor en Driver App. |
| `clerk_user_id` | string | Identificador compartido del usuario en Clerk. |
| `full_name` | string | Nombre completo del conductor. |
| `phone` | string | Teléfono de contacto. |
| `status` | string | Estado del conductor. Ejemplo: `ACTIVE`, `INACTIVE`, `BLOCKED`. |
| `verification_status` | string | Estado de verificación del conductor. |

Relaciones:

- Un conductor puede tener uno o más vehículos registrados.
- Un conductor puede aceptar varios pools a lo largo del tiempo.
- Un pool asignado referencia al conductor que lo aceptó.

---

### `vehicles`

Representa los vehículos utilizados por los conductores.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador interno del vehículo. |
| `driver_id` | string | Referencia interna al conductor propietario o responsable. |
| `brand` | string | Marca del vehículo. |
| `model` | string | Modelo del vehículo. |
| `license_plate` | string | Patente del vehículo. |
| `capacity` | number | Capacidad máxima del vehículo. En esta etapa, hasta 15 pasajeros. |
| `status` | string | Estado del vehículo. Ejemplo: `ACTIVE`, `INACTIVE`, `BLOCKED`. |

Relaciones:

- Un vehículo pertenece a un conductor.
- Un pool asignado puede referenciar el vehículo utilizado.

---

### `pools`

Representa los viajes programados administrados por la Driver App.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador del pool. Se comparte con otras apps como `pool_id`. |
| `destination_id` | string | Identificador del destino seleccionado. La información completa del destino pertenece a Rider App. |
| `departure_time` | datetime | Fecha y hora de salida del viaje. Es necesario para poder buscar pools por destino y horario. |
| `status` | string | Estado actual del pool. |
| `driver_id` | string, nullable | Conductor asignado al pool. Es `null` mientras el pool está disponible. |
| `vehicle_id` | string, nullable | Vehículo asignado al pool. Es `null` mientras el pool no tiene conductor. |
| `current_passengers` | number | Cantidad actual de pasajeros asociados al pool. |
| `max_capacity` | number | Capacidad máxima del pool. |
| `target_user_id` | string, nullable | Pasajero objetivo actual durante el recorrido. |
| `hito` | string, nullable | Mensaje operativo actual del recorrido. |
| `cancellation_reason` | string, nullable | Motivo de cancelación del pool, si corresponde. |

Estados posibles de `status`:

```text
AVAILABLE
ASSIGNED
LOCKED
IN_PROGRESS
COMPLETED
CANCELED
```

Relaciones:

- Un pool puede tener un conductor asignado.
- Un pool puede tener un vehículo asignado.
- Un pool puede tener múltiples pasajeros, pero esa relación no se persiste como reservas dentro de la Driver App.
- Los pasajeros del pool se obtienen desde la Rider App cuando se necesitan.
- El manifiesto final de pasajeros pagados puede persistirse como snapshot operativo.

Notas:

- La Driver App mantiene `current_passengers` como contador operativo del pool.
- La Driver App no guarda las reservas individuales del pool como entidad propia.
- Si se requiere conocer la lista actual de pasajeros, debe consultarse a Rider App.
- Si se requiere ejecutar el recorrido con resiliencia ante fallos inter-servicio, se utiliza el snapshot operativo final.

---

### `operational_manifest_snapshot_passengers`

Representa la copia local del manifiesto final de pasajeros que efectivamente viajan.

Esta entidad se genera cuando el conductor consulta su recorrido final o cuando la Driver App necesita fijar el manifiesto operativo del viaje. Para generarla, la Driver App consulta a Rider App:

```http
GET /api/pools/:pool_id/passengers?status=PAID
```

Solo se incluyen pasajeros con reservas en estado `PAID`.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador interno del registro. |
| `pool_id` | string | Pool asociado al snapshot operativo. |
| `reservation_id` | string | Reserva externa de Rider App. |
| `passenger_user_id` | string | Identificador del pasajero en Clerk. |
| `passenger_name` | string | Nombre del pasajero al momento de generar el snapshot. |
| `pickup_address` | string | Dirección del punto de recogida. |
| `pickup_lat` | number | Latitud del punto de recogida. |
| `pickup_lng` | number | Longitud del punto de recogida. |
| `pickup_order` | number, nullable | Orden sugerido o definido para retirar pasajeros. |

Relaciones:

- Cada registro pertenece a un `pool_id`.
- Cada registro referencia una reserva externa de Rider App.
- La combinación `pool_id` + `reservation_id` debería ser única.

Justificación:

- Esta entidad no representa reservas propias de Driver App.
- Es una copia operativa del manifiesto final.
- Permite que el conductor pueda realizar el recorrido aunque luego falle la comunicación con Rider App.
- Conviene modelarla como entidad separada y no como atributo dentro de `pools`, porque un pool puede tener muchos pasajeros.

---

## Rider App

La **Rider App** es la fuente de verdad de los pasajeros, destinos, reservas e historial de viajes del pasajero.

---

### Entidades principales

### `passengers`

Representa a los pasajeros registrados en la aplicación.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador interno del pasajero en Rider App. |
| `clerk_user_id` | string | Identificador compartido del usuario en Clerk. |
| `full_name` | string | Nombre completo del pasajero. |
| `phone` | string | Teléfono del pasajero. |
| `company_code` | string, nullable | Código o identificador de empresa, si aplica. |
| `status` | string | Estado del pasajero. Ejemplo: `ACTIVE`, `INACTIVE`, `BLOCKED`. |

Relaciones:

- Un pasajero puede tener múltiples reservas.

---

### `destinations`

Representa los destinos industriales disponibles para solicitar viajes.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador del destino. |
| `name` | string | Nombre del destino. Ejemplo: Polo Petroquímico. |
| `description` | string, nullable | Descripción del destino. |
| `address` | string | Dirección o referencia del destino. |
| `lat` | number | Latitud del destino. |
| `lng` | number | Longitud del destino. |
| `active` | boolean | Indica si el destino está disponible para reservas. |

Relaciones:

- Un destino puede estar asociado a muchas reservas.

---

### `reservations`

Representa la reserva individual de un pasajero.

La reserva es la unidad principal de la Rider App. Cada reserva pertenece a un pasajero y puede estar asociada a un pool creado en la Driver App.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador de la reserva. Se comparte con otras apps como `reservation_id`. |
| `passenger_id` | string | Referencia interna al pasajero. |
| `passenger_user_id` | string | Identificador del pasajero en Clerk. |
| `pool_id` | string | Identificador externo del pool creado en Driver App. |
| `destination_id` | string | Referencia al destino seleccionado. |
| `departure_time` | datetime | Fecha y hora reservada. |
| `pickup_address` | string | Dirección del punto de recogida. |
| `pickup_lat` | number | Latitud del punto de recogida. |
| `pickup_lng` | number | Longitud del punto de recogida. |
| `status` | string | Estado actual de la reserva. |
| `max_price` | number | Precio máximo informado al momento de reservar. |
| `effective_price` | number, nullable | Precio efectivamente pagado luego del cobro automático. |
| `currency` | string | Moneda de los importes. Ejemplo: `ARS`. |
| `payment_transaction_id` | string, nullable | Identificador de la transacción informada por Payments App. |
| `payment_rejection_reason` | string, nullable | Motivo de rechazo del pago, si corresponde. |
| `assigned_driver_snapshot` | json, nullable | Datos del conductor y vehículo asignados, guardados como snapshot cuando el pool pasa a estar asignado. |

Estados posibles de `status`:

```text
PENDING_DRIVER
CONFIRMED
PAID
DENIED
CANCELED
```

Estructura sugerida para `assigned_driver_snapshot`:

```json
{
  "driver_user_id": "user_driver_01",
  "driver_name": "Juliana Pagani",
  "vehicle": {
    "vehicle_id": "veh_123",
    "brand": "Mercedes-Benz",
    "model": "Sprinter",
    "license_plate": "AF123JK"
  }
}
```

Relaciones:

- Una reserva pertenece a un pasajero.
- Una reserva referencia un destino.
- Una reserva referencia un pool externo de Driver App.
- Una reserva puede recibir un resultado de pago informado por Payments App.
- Una reserva puede generar reseñas en Feedback App si fue pagada y el viaje finalizó.

Notas:

- Con `destination_id` alcanza para relacionar la reserva con el destino seleccionado.
- No se guarda snapshot del nombre del destino. Si el destino cambia de nombre en el futuro, el historial mostrará el dato actual del catálogo de destinos.
- La Rider App guarda un snapshot del conductor y vehículo asignados dentro de la reserva, en el campo `assigned_driver_snapshot`, cuando el pool pasa a estado `ASSIGNED`.
- Driver App sigue siendo la fuente de verdad de conductores y vehículos. El snapshot en Rider App se utiliza únicamente para mostrar el resumen e historial del viaje.
- `effective_price` se completa cuando Payments App notifica un pago exitoso mediante `PATCH /api/reservations/:reservation_id/payment-result`.
---

### Historial de viajes

No se define una tabla separada para historial de viajes.

El historial puede obtenerse consultando las reservas del pasajero en la tabla `reservations`.

Cada reserva contiene los datos principales necesarios para el historial:

- pasajero;
- pool asociado;
- destino;
- horario;
- punto de recogida;
- estado final;
- precio máximo informado;
- precio efectivo pagado;
- transacción de pago asociada, si corresponde.

Si en etapas futuras se requiere optimizar la lectura del historial, puede agregarse una vista o una tabla derivada, pero no es necesaria para el modelo inicial.

---

### Notificaciones al pasajero


### `passenger_notifications`

Representa las notificaciones persistidas para los pasajeros.

Cada notificación se guarda como un registro nuevo. No se reutiliza ni se edita un mismo registro para distintos eventos.

El objetivo de esta entidad es permitir que la Rider App mantenga un historial de notificaciones relevantes para el usuario, incluso si el usuario no las visualiza en el momento exacto en que ocurren.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador de la notificación. |
| `passenger_user_id` | string | Identificador del pasajero en Clerk. |
| `reservation_id` | string, nullable | Reserva asociada, si corresponde. |
| `pool_id` | string, nullable | Pool asociado, si corresponde. |
| `type` | string | Tipo de notificación. |
| `message` | string | Mensaje a mostrar al pasajero. |
| `read_at` | datetime, nullable | Fecha en la que el usuario leyó la notificación. |
| `created_at` | datetime | Fecha en la que se creó la notificación. |

Ejemplos de `type`:

```text
POOL_CANCELED
PAYMENT_DENIED
PAYMENT_CONFIRMED
TRIP_STARTED
DRIVER_ON_WAY
DRIVER_ARRIVED
FEEDBACK_AVAILABLE
```

Relaciones:

- Una notificación pertenece a un pasajero.
- Una notificación puede estar asociada a una reserva.
- Una notificación puede estar asociada a un pool.

Notas:

- Se crea un registro nuevo por cada evento notificable.
- Esta entidad permite mostrar un historial de notificaciones del usuario.
- `read_at = null` indica que la notificación todavía no fue leída.
- Las notificaciones no reemplazan el estado real de la reserva ni del pool. Solo representan mensajes mostrados o pendientes de mostrar al usuario.


---

## Payments App

La **Payments App** es la fuente de verdad de precios, métodos de pago, cobros, descuentos, transacciones y liquidaciones.

---

### Entidades principales

### `payment_methods`

Representa los métodos de pago vinculados por los pasajeros.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador interno del método de pago. |
| `clerk_user_id` | string | Usuario dueño del método de pago. |
| `provider` | string | Proveedor del método de pago. Ejemplo: `MERCADO_PAGO`. |
| `provider_token` | string | Token o referencia segura del proveedor. |
| `status` | string | Estado de vinculación. Ejemplo: `ACTIVE`, `INACTIVE`, `REVOKED`. |

Relaciones:

- Un usuario puede tener uno o más métodos de pago.
- Un cobro utiliza un método de pago asociado al pasajero.

---

### `payout_accounts`

Representa las cuentas de cobro configuradas por los conductores.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador interno de la cuenta de cobro. |
| `driver_user_id` | string | Identificador del conductor en Clerk. |
| `provider` | string | Proveedor o tipo de cuenta. |
| `account_reference` | string | Referencia segura de la cuenta de cobro. |
| `alias` | string, nullable | Alias de la cuenta, si corresponde. |
| `status` | string | Estado de la cuenta. Ejemplo: `ACTIVE`, `INACTIVE`, `REJECTED`. |

Relaciones:

- Un conductor puede tener una o más cuentas de cobro.
- Una liquidación se realiza hacia una cuenta de cobro del conductor.

---

### `pricing_rules`

Representa las reglas utilizadas para calcular precio máximo, precio estimado y descuentos.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador de la regla. |
| `destination_id` | string, nullable | Destino al que aplica la regla. Puede ser `null` si es general. |
| `base_price` | number | Precio base del viaje. |
| `min_passengers` | number | Cantidad mínima de pasajeros para aplicar la regla. |
| `max_passengers` | number | Cantidad máxima de pasajeros para aplicar la regla. |
| `discount_type` | string | Tipo de descuento. Ejemplo: `PERCENTAGE`, `FIXED_AMOUNT`. |
| `discount_value` | number | Valor del descuento. |
| `active` | boolean | Indica si la regla está activa. |

Relaciones:

- Una regla puede aplicar a uno o varios cálculos de precio.
- Los cobros pueden guardar el descuento aplicado como snapshot.

---

### `auto_charge_jobs`

Representa el proceso de cobro automático iniciado al cerrar un pool en T-1h.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador del proceso de cobro automático. |
| `pool_id` | string | Identificador externo del pool. |
| `requested_by` | string | App que solicitó el cobro. Ejemplo: `DRIVER_APP`. |
| `current_passengers` | number | Cantidad de pasajeros informada al iniciar el proceso. |
| `status` | string | Estado del proceso. |
| `started_at` | datetime | Fecha de inicio del proceso. |
| `finished_at` | datetime, nullable | Fecha de finalización del proceso. |

Estados sugeridos de `status`:

```text
STARTED
COMPLETED
PARTIAL_FAILED
FAILED
```

Relaciones:

- Un proceso de cobro automático pertenece a un pool.
- Un proceso puede generar múltiples cobros en `charges`.

---

### `charges`

Representa el cobro de una reserva individual.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador interno del cobro. |
| `transaction_id` | string | Identificador de transacción informado a otras apps. |
| `auto_charge_job_id` | string, nullable | Proceso de cobro automático asociado. |
| `pool_id` | string | Identificador externo del pool. |
| `reservation_id` | string | Identificador externo de la reserva en Rider App. |
| `passenger_user_id` | string | Identificador del pasajero en Clerk. |
| `payment_method_id` | string, nullable | Método de pago utilizado. |
| `max_price` | number | Precio máximo informado para la reserva. |
| `effective_price` | number, nullable | Precio efectivamente cobrado. |
| `currency` | string | Moneda del cobro. Ejemplo: `ARS`. |
| `status` | string | Estado del cobro. |
| `rejection_reason` | string, nullable | Motivo de rechazo si el cobro fue denegado. |
| `processed_at` | datetime, nullable | Fecha de procesamiento del cobro. |

Estados sugeridos de `status`:

```text
PENDING
PAID
DENIED
FAILED
```

Relaciones:

- Un cobro pertenece a una reserva externa de Rider App.
- Un cobro pertenece a un pool externo de Driver App.
- Un cobro puede tener descuentos aplicados.
- Un cobro exitoso debe ser notificado a Rider App.
- Un cobro rechazado debe ser notificado a Rider App y Driver App.

---

### `charge_discounts`

Representa los descuentos aplicados a un cobro.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador del descuento aplicado. |
| `charge_id` | string | Cobro asociado. |
| `type` | string | Tipo de descuento. Ejemplo: `OCCUPANCY_DISCOUNT`. |
| `amount` | number | Monto descontado. |
| `description` | string, nullable | Descripción del descuento. |

Relaciones:

- Un cobro puede tener cero, uno o varios descuentos aplicados.

---

### `settlements`

Representa las liquidaciones de fondos a conductores.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador de la liquidación. |
| `pool_id` | string | Pool asociado a la liquidación. |
| `driver_user_id` | string | Conductor que recibe la liquidación. |
| `payout_account_id` | string, nullable | Cuenta de cobro utilizada. |
| `amount` | number | Monto liquidado. |
| `currency` | string | Moneda de la liquidación. |
| `status` | string | Estado de la liquidación. |
| `settled_at` | datetime, nullable | Fecha en la que se realizó la liquidación. |

Estados sugeridos de `status`:

```text
PENDING
COMPLETED
FAILED
```

Relaciones:

- Una liquidación pertenece a un pool externo.
- Una liquidación corresponde a un conductor identificado por `driver_user_id`.
- Una liquidación puede agrupar los cobros exitosos de un pool.

---

## Feedback App

La **Feedback App** es la fuente de verdad de reseñas, calificaciones promedio y reportes.

---

### Entidades principales

### `reviews`

Representa una reseña entre usuarios luego de un viaje.

Las reseñas se pre-crean al iniciar el viaje, pero permanecen invisibles hasta que el viaje finaliza.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador de la reseña. |
| `pool_id` | string | Identificador externo del pool. |
| `reservation_id` | string, nullable | Identificador externo de la reserva asociada. |
| `author_user_id` | string | Usuario que debe completar la reseña. |
| `author_role` | string | Rol del autor. Ejemplo: `rider`, `driver`. |
| `target_user_id` | string | Usuario que será calificado. |
| `target_role` | string | Rol del usuario calificado. Ejemplo: `rider`, `driver`. |
| `status` | string | Estado de la reseña. |
| `rating` | number, nullable | Calificación en estrellas. Valor esperado: 1 a 5. |
| `comment` | string, nullable | Comentario opcional. |
| `enabled_at` | datetime, nullable | Fecha en la que la reseña pasó a estar visible. |
| `completed_at` | datetime, nullable | Fecha en la que el usuario completó la reseña. |

Estados posibles de `status`:

```text
PRECREATED
PENDING
COMPLETED
```

Relaciones:

- Una reseña pertenece a un pool externo.
- Una reseña puede estar asociada a una reserva externa.
- Un usuario puede ser autor de muchas reseñas.
- Un usuario puede ser destinatario de muchas reseñas.

---

### `rating_averages`

Representa el promedio de calificaciones de un usuario.

Puede implementarse como tabla cacheada para evitar recalcular el promedio en cada consulta.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador interno del registro. |
| `user_id` | string | Identificador del usuario en Clerk. |
| `role` | string | Rol sobre el que se calcula el promedio. Ejemplo: `rider`, `driver`. |
| `average_rating` | number, nullable | Promedio de estrellas. Puede ser `null` si todavía no tiene reseñas. |
| `total_reviews` | number | Cantidad de reseñas completadas utilizadas para el cálculo. |
| `updated_at` | datetime | Fecha de última actualización del promedio. |

Relaciones:

- Se calcula a partir de reseñas en estado `COMPLETED`.
- Puede existir un promedio distinto por rol para un mismo usuario.

---

### `reports`

Representa reportes de moderación realizados por usuarios.

| Campo | Tipo | Descripción |
|------|------|-------------|
| `id` | string | Identificador del reporte. |
| `pool_id` | string, nullable | Pool asociado al reporte, si corresponde. |
| `reservation_id` | string, nullable | Reserva asociada al reporte, si corresponde. |
| `reporter_user_id` | string | Usuario que realiza el reporte. |
| `reporter_role` | string | Rol del usuario que realiza el reporte. |
| `reported_user_id` | string | Usuario reportado. |
| `reported_role` | string | Rol del usuario reportado. |
| `reason` | string | Motivo del reporte. |
| `description` | string, nullable | Descripción adicional. |
| `status` | string | Estado de moderación del reporte. |
| `reviewed_at` | datetime, nullable | Fecha de revisión. |

Estados sugeridos de `status`:

```text
PENDING
REVIEWED
REJECTED
```

Relaciones:

- Un reporte tiene un usuario autor y un usuario reportado.
- Puede asociarse a un pool o reserva externa para dar contexto.



## Datos duplicados y estrategia de consistencia

| Dato duplicado o referenciado | Apps que lo tienen | Fuente de verdad | Estrategia de consistencia |
|-------------------------------|--------------------|------------------|----------------------------|
| `clerk_user_id` | Todas | Clerk | Todas las apps usan el mismo identificador de Clerk. Cada app puede crear su perfil local al primer login o al recibir una operación relacionada con ese usuario. |
| Datos básicos de usuario | Rider, Driver, Payments, Feedback | Clerk y cada app según el rol | Cada app guarda solo los datos necesarios para su dominio. Si se necesita identidad compartida, se usa `clerk_user_id`. |
| `pool_id` | Driver, Rider, Payments, Feedback | Driver App | Driver App genera el `pool_id`. Las demás apps lo guardan como referencia externa y consultan a Driver App cuando necesitan estado operativo del pool. |
| `reservation_id` | Rider, Driver, Payments, Feedback | Rider App | Rider App genera la reserva. Driver, Payments y Feedback la guardan como referencia externa cuando necesitan asociar datos al pasajero o al viaje. |
| Estado del pool | Driver, visible en Rider y Feedback | Driver App | Rider App y Feedback App consultan el estado del pool mediante `GET /api/pools/:pool_id/status`. No deben modificarlo directamente. |
| Estado de la reserva | Rider, referenciado en Payments y Driver | Rider App | Rider App mantiene el estado de reserva. Payments App informa resultados de pago y Rider App actualiza la reserva. |
| Pasajeros de un pool | Rider, consultado por Driver, Payments y Feedback | Rider App | Rider App expone `GET /api/pools/:pool_id/passengers`. Driver, Payments y Feedback consumen este endpoint según su necesidad. |
| Manifiesto operativo final | Driver, originado desde Rider | Driver App como snapshot operativo | Driver App obtiene pasajeros `PAID` desde Rider App y guarda una copia local para ejecutar el recorrido aun si luego hay fallos de comunicación. |
| Precio máximo de reserva | Rider, calculado por Payments | Payments App para cálculo, Rider App para snapshot comercial | Payments calcula el precio máximo. Rider App lo guarda en la reserva como valor inmutable. |
| Precio efectivo pagado | Payments, Rider | Payments App | Payments App calcula y persiste el cobro real. Rider App guarda `effective_price` informado por Payments para mostrarlo en resumen e historial. |
| Detalle de pagos y transacciones | Payments, referenciado en Rider | Payments App | Rider App solo guarda datos mínimos del resultado de pago. Payments App mantiene el detalle financiero completo. |
| Información de conductor y vehículo asignados | Driver, Rider | Driver App | Driver App es la fuente de verdad. Rider App guarda un snapshot mínimo dentro de la reserva cuando el pool pasa a `ASSIGNED`, para mostrar resumen e historial del viaje. |
| Promedio de calificaciones | Feedback, visible en Rider y Driver | Feedback App | Rider App y Driver App consultan a Feedback App cuando necesitan mostrar reputación. No calculan promedios localmente. |
| Reseñas | Feedback | Feedback App | Feedback App crea, habilita y completa reseñas. Otras apps solo reciben notificaciones o redirigen al usuario. |
| Reportes | Feedback | Feedback App | Feedback App persiste reportes y estados de moderación. |

---

## Estrategias generales ante inconsistencias

### 1. No compartir bases de datos

Las apps no deben leer ni escribir directamente en bases de datos ajenas.

Toda sincronización debe realizarse mediante APIs inter-servicio.

---

### 2. Usar fuentes de verdad claras

Cada dato integrado debe tener una app dueña:

- pools y operación del viaje: **Driver App**;
- reservas y pasajeros del pool: **Rider App**;
- pagos y precios: **Payments App**;
- reseñas y calificaciones: **Feedback App**;
- identidad de usuario: **Clerk**.

---

### 3. Guardar snapshots solo cuando sean necesarios

Los snapshots son copias controladas y no reemplazan a la fuente de verdad.

En esta etapa se define un snapshot operativo en la **Driver App** para el manifiesto final de pasajeros pagados.

La **Rider App** no guarda snapshot del destino, porque con `destination_id` alcanza para referenciar el destino del viaje.

La **Rider App** sí guarda un snapshot mínimo del conductor y vehículo asignados dentro de la reserva, una vez que el pool pasa a `ASSIGNED`. Esto permite mostrar la información del conductor y vehículo en el resumen e historial del viaje, aunque Driver App siga siendo la fuente de verdad.

---

### 4. Evitar recalcular información externa

Una app no debe recalcular datos que pertenecen a otra.

Ejemplos:

- Rider App no calcula precios: los solicita a Payments App.
- Driver App no calcula calificaciones: las solicita a Feedback App.
- Feedback App no asume pasajeros de un pool: los solicita a Rider App.
- Payments App no asume pasajeros a cobrar: los solicita a Rider App.

---

### 5. Tolerar consistencia eventual

Algunas actualizaciones entre apps ocurren mediante notificaciones o polling.

Por eso, el sistema puede tener breves períodos de consistencia eventual.

Ejemplos:

- Payments App procesa un cobro y luego notifica a Rider App.
- Payments App notifica a Driver App cuando un pago rechazado debe descontarse del pool.
- Driver App cambia el estado del pool y Rider App lo detecta mediante polling.
- Feedback App consulta el estado del pool para detectar avance o finalización.

---

### 6. Diseñar operaciones críticas como idempotentes

Las operaciones inter-servicio importantes deberían poder recibirse más de una vez sin generar inconsistencias.

Ejemplos:

- notificación de pago exitoso;
- notificación de pago rechazado;
- cancelación de pool por falta de conductor;
- pre-creación de reseñas;
- notificación de reseñas disponibles.

Para esto, las apps pueden usar identificadores como:

- `reservation_id`;
- `pool_id`;
- `transaction_id`;
- `review_id`.

---

## Resumen de fuentes de verdad

| Dominio | Fuente de verdad |
|--------|------------------|
| Identidad de usuarios | Clerk |
| Pasajeros | Rider App |
| Conductores | Driver App |
| Vehículos | Driver App |
| Destinos | Rider App |
| Reservas | Rider App |
| Pools | Driver App |
| Estado operativo del viaje | Driver App |
| Pasajeros de un pool | Rider App |
| Manifiesto operativo final | Driver App |
| Precios y descuentos | Payments App |
| Cobros y transacciones | Payments App |
| Liquidaciones | Payments App |
| Reseñas | Feedback App |
| Promedios de calificación | Feedback App |
| Reportes | Feedback App |
