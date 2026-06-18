# 1.3 — Diseño de APIs Inter-Servicios

> **Tipo A — Plataforma de Transporte (WeShuttle)**

Este documento define los contratos de APIs entre las aplicaciones del sistema.  
Cada endpoint listado corresponde a una integración entre dos webapps y debe respetarse para que cada integrante pueda desarrollar y mockear su aplicación de forma aislada.

---

## Convenciones generales

### Formato de fechas

Todas las fechas y horarios se envían en formato ISO 8601.

Ejemplo:

```json
"2026-06-10T08:00:00Z"
```

---

### Identificadores de usuario

Los campos `user_id`, `passenger_user_id` y `driver_user_id` representan el identificador compartido del usuario autenticado en Clerk.

---

### Formato de errores

Todos los endpoints deben responder errores con el siguiente formato:

```json
{
  "error": "ERROR_CODE",
  "message": "Descripción del error"
}
```

Códigos HTTP comunes:

| Código | Uso |
|--------|-----|
| `400 Bad Request` | El request tiene datos inválidos o incompletos. |
| `401 Unauthorized` | No se envió un token válido. |
| `403 Forbidden` | El usuario o servicio no tiene permisos para realizar la acción. |
| `404 Not Found` | El recurso solicitado no existe. |
| `409 Conflict` | La acción no puede realizarse por el estado actual del recurso. |
| `500 Internal Server Error` | Error interno no controlado. |

---

## Estados utilizados

### Estados del pool

```text
AVAILABLE
ASSIGNED
LOCKED
IN_PROGRESS
COMPLETED
CANCELED
```

### Estados de reserva

```text
PENDING_PAYMENT
PENDING_DRIVER
CONFIRMED
CANCELED
```

### Estados de pago de la reserva

```text
UNPAID
PENDING
PAID
DENIED
CANCELED
EXPIRED
```

### Estados de reseña

```text
PRECREATED
PENDING
COMPLETED
```

---

# Driver App — Endpoints expuestos

La **Driver App** expone endpoints relacionados con pools, marketplace, conductor asignado, estado operativo del viaje y notificaciones para conductores.

---

## 1. GET `/api/pools/search`

### Descripción

Permite a la **Rider App** consultar si existe un pool para un destino y horario determinados.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Rider App | Driver App |

### Request

#### Query params

| Campo | Tipo | Obligatorio | Descripción |
|------|------|-------------|-------------|
| `destination_id` | string | Sí | Identificador del destino seleccionado. |
| `departure_time` | string | Sí | Fecha y hora de salida solicitada. |

### Ejemplo

```http
GET /api/pools/search?destination_id=dest_polo_petroquimico&departure_time=2026-06-10T08:00:00Z
```

### Response `200 OK`

Si existe un pool compatible:

```json
{
  "exists": true,
  "pool": {
    "pool_id": "pool_abc123",
    "destination_id": "dest_polo_petroquimico",
    "departure_time": "2026-06-10T08:00:00Z",
    "status": "AVAILABLE",
    "current_passengers": 5,
    "max_capacity": 15
  }
}
```

Si no existe un pool compatible:

```json
{
  "exists": false,
  "pool": null
}
```

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | `destination_id` o `departure_time` ausente o inválido. |
| `401 Unauthorized` | Token inválido o ausente. |
| `500 Internal Server Error` | Error interno al buscar pools. |

---

## 2. POST `/api/pools`

### Descripción

Permite a la **Rider App** solicitar la creación de un nuevo pool cuando no existe uno compatible.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Rider App | Driver App |

### Request body

```json
{
  "destination_id": "dest_polo_petroquimico",
  "departure_time": "2026-06-10T08:00:00Z",
  "reservation_id": "res_123",
  "passenger_user_id": "user_abc123",
  "pickup_point": {
    "address": "Av. Alem 1250, Bahía Blanca",
    "lat": -38.718,
    "lng": -62.266
  }
}
```

### Campos

| Campo | Tipo | Obligatorio | Descripción |
|------|------|-------------|-------------|
| `destination_id` | string | Sí | Identificador del destino. |
| `departure_time` | string | Sí | Fecha y hora de salida. |
| `reservation_id` | string | Sí | Identificador de la reserva creada en Rider App. |
| `passenger_user_id` | string | Sí | Identificador del pasajero. |
| `pickup_point.address` | string | Sí | Dirección del punto de recogida. |
| `pickup_point.lat` | number | Sí | Latitud del punto de recogida. |
| `pickup_point.lng` | number | Sí | Longitud del punto de recogida. |

### Response `201 Created`

```json
{
  "pool_id": "pool_abc123",
  "status": "AVAILABLE",
  "current_passengers": 1,
  "max_capacity": 15
}
```

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | Faltan datos obligatorios o tienen formato inválido. |
| `401 Unauthorized` | Token inválido o ausente. |
| `409 Conflict` | Ya existe un pool compatible o no se puede crear por reglas de negocio. |
| `500 Internal Server Error` | Error interno al crear el pool. |

---

## 3. POST `/api/pools/:pool_id/reservations`

### Descripción

Permite a la **Rider App** notificar que una reserva se sumó a un pool existente.

La **Driver App** incrementa la ocupación del pool.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Rider App | Driver App |

### Path params

| Campo | Tipo | Descripción |
|------|------|-------------|
| `pool_id` | string | Identificador del pool existente. |

### Request body

```json
{
  "reservation_id": "res_456",
  "passenger_user_id": "user_def456",
  "pickup_point": {
    "address": "Sarmiento 850, Bahía Blanca",
    "lat": -38.713,
    "lng": -62.261
  }
}
```

### Response `200 OK`

```json
{
  "pool_id": "pool_abc123",
  "reservation_id": "res_456",
  "pool_status": "AVAILABLE",
  "current_passengers": 6,
  "max_capacity": 15
}
```

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | Faltan datos obligatorios. |
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | El pool no existe. |
| `409 Conflict` | El pool está `LOCKED`, `COMPLETED`, `CANCELED` o alcanzó su capacidad máxima. |
| `500 Internal Server Error` | Error interno al asociar la reserva al pool. |

---

## 4. DELETE `/api/pools/:pool_id/reservations/:reservation_id`

### Descripción

Permite a la **Rider App** notificar que una reserva fue cancelada por el pasajero.

La **Driver App** decrementa la ocupación del pool.  
Si el pool queda vacío, lo elimina o lo marca como `CANCELED`.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Rider App | Driver App |

### Path params

| Campo | Tipo | Descripción |
|------|------|-------------|
| `pool_id` | string | Identificador del pool. |
| `reservation_id` | string | Identificador de la reserva cancelada. |

### Response `200 OK`

Si el pool sigue activo:

```json
{
  "pool_id": "pool_abc123",
  "reservation_id": "res_456",
  "current_passengers": 5,
  "pool_status": "AVAILABLE"
}
```

Si el pool queda vacío:

```json
{
  "pool_id": "pool_abc123",
  "reservation_id": "res_456",
  "current_passengers": 0,
  "pool_status": "CANCELED"
}
```

### Errores

| Código | Motivo |
|--------|--------|
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | El pool o la reserva no existen. |
| `409 Conflict` | El pool está `LOCKED` y no permite cancelaciones voluntarias. |
| `500 Internal Server Error` | Error interno al cancelar la reserva en el pool. |

---

## 5. GET `/api/pools/:pool_id/status`

### Descripción

Devuelve el estado actual del pool y sus datos operativos.

Este endpoint puede ser consumido por:

- la **Rider App**, para mostrar el estado del viaje al pasajero;
- la **Feedback App**, para monitorear el avance y finalización del viaje.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Rider App | Driver App |
| Feedback App | Driver App |

### Path params

| Campo | Tipo | Descripción |
|------|------|-------------|
| `pool_id` | string | Identificador del pool. |

### Response `200 OK`

```json
{
  "pool_id": "pool_abc123",
  "status": "IN_PROGRESS",
  "destination_id": "dest_polo_petroquimico",
  "departure_time": "2026-06-10T08:00:00Z",
  "current_passengers": 8,
  "max_capacity": 15,
  "target_user_id": "user_def456",
  "hito": "El conductor está en camino a tu ubicación",
  "updated_at": "2026-06-10T07:15:00Z"
}
```

### Notas

- `target_user_id` puede ser `null` si no hay pasajero objetivo activo.
- `hito` puede ser `null` si el viaje todavía no inició o no hay mensaje granular vigente.

### Errores

| Código | Motivo |
|--------|--------|
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | El pool no existe. |
| `500 Internal Server Error` | Error interno al consultar el estado del pool. |

---

## 6. GET `/api/pools/:pool_id/assigned-driver`

### Descripción

Permite a la **Rider App** consultar la información del conductor y vehículo asignados a un pool.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Rider App | Driver App |

### Path params

| Campo | Tipo | Descripción |
|------|------|-------------|
| `pool_id` | string | Identificador del pool. |

### Response `200 OK`

Si el pool tiene conductor asignado:

```json
{
  "pool_id": "pool_abc123",
  "pool_status": "ASSIGNED",
  "driver": {
    "driver_user_id": "user_driver_01",
    "full_name": "Juliana Pagani"
  },
  "vehicle": {
    "vehicle_id": "veh_123",
    "brand": "Mercedes-Benz",
    "model": "Sprinter",
    "license_plate": "AF123JK"
  }
}
```

Si el pool todavía no tiene conductor asignado:

```json
{
  "pool_id": "pool_abc123",
  "pool_status": "AVAILABLE",
  "driver": null,
  "vehicle": null
}
```

### Errores

| Código | Motivo |
|--------|--------|
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | El pool no existe. |
| `500 Internal Server Error` | Error interno al consultar conductor asignado. |

---



## 8. POST `/api/notifications/feedback`

### Descripción

Permite a la **Feedback App** avisar a la **Driver App** que el conductor ya puede reseñar a los pasajeros.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Feedback App | Driver App |

### Request body

```json
{
  "pool_id": "pool_abc123",
  "driver_user_id": "user_driver_01",
  "message": "Ya podés calificar a los pasajeros del viaje."
}
```

### Response `200 OK`

```json
{
  "notification_sent": true
}
```

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | Faltan datos obligatorios. |
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | No existe el conductor o el pool indicado. |
| `500 Internal Server Error` | Error interno al procesar la notificación. |

---

# Rider App — Endpoints expuestos

La **Rider App** expone endpoints relacionados con pasajeros, reservas, manifiestos, resultados de pago y notificaciones al pasajero.

---

## 1. GET `/api/pools/:pool_id/passengers`

### Descripción

Devuelve la lista de pasajeros asociados a un pool.

Este endpoint es central para el sistema y puede ser utilizado por:

- la **Driver App**, para mostrar los pasajeros que ya se sumaron a un pool en el marketplace;
- la **Payments App**, para obtener el manifiesto de pasajeros pagados y calcular ajustes de crédito;
- la **Driver App**, para obtener el manifiesto final de pasajeros pagados antes de iniciar el recorrido;
- la **Feedback App**, para obtener los pasajeros del pool y calcular sus promedios de calificación.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Driver App | Rider App |
| Payments App | Rider App |
| Feedback App | Rider App |

### Path params

| Campo | Tipo | Descripción |
|------|------|-------------|
| `pool_id` | string | Identificador del pool. |

### Query params opcionales

| Campo | Tipo | Obligatorio | Descripción |
|------|------|-------------|-------------|
| `reservation_status` | string | No | Permite filtrar reservas por estado operativo. Ejemplo: `CONFIRMED`. |
| `payment_status` | string | No | Permite filtrar reservas por estado de pago. Ejemplo: `PAID`. |

### Ejemplos

```http
GET /api/pools/pool_abc123/passengers
```

```http
GET /api/pools/pool_abc123/passengers?payment_status=PAID
```

```http
GET /api/pools/pool_abc123/passengers?reservation_status=CONFIRMED&payment_status=PAID
```

### Response `200 OK`

```json
{
  "pool_id": "pool_abc123",
  "passengers": [
    {
      "reservation_id": "res_101",
      "passenger_user_id": "user_abc123",
      "passenger_name": "Franco Gulino",
      "reservation_status": "CONFIRMED",
      "payment_status": "PAID",
      "pickup_point": {
        "address": "Av. Alem 1250, Bahía Blanca",
        "lat": -38.718,
        "lng": -62.266
      },
      "destination_id": "dest_polo_petroquimico",
      "departure_time": "2026-06-10T08:00:00Z",
      "max_price": 5000,
      "amount_charged": 3800,
      "credit_applied": 1200,
      "final_trip_price": null,
      "credit_granted": 0,
      "currency": "ARS"
    },
    {
      "reservation_id": "res_102",
      "passenger_user_id": "user_def456",
      "passenger_name": "Juan Ignacio Ibarra",
      "reservation_status": "PENDING_DRIVER",
      "payment_status": "PAID",
      "pickup_point": {
        "address": "Sarmiento 850, Bahía Blanca",
        "lat": -38.713,
        "lng": -62.261
      },
      "destination_id": "dest_polo_petroquimico",
      "departure_time": "2026-06-10T08:00:00Z",
      "max_price": 5000,
      "amount_charged": 5000,
      "credit_applied": 0,
      "final_trip_price": null,
      "credit_granted": 0,
      "currency": "ARS"
    }
  ]
}
```

### Response `200 OK` después del cálculo de crédito

```json
{
  "pool_id": "pool_abc123",
  "passengers": [
    {
      "reservation_id": "res_101",
      "passenger_user_id": "user_abc123",
      "passenger_name": "Franco Gulino",
      "reservation_status": "CONFIRMED",
      "payment_status": "PAID",
      "pickup_point": {
        "address": "Av. Alem 1250, Bahía Blanca",
        "lat": -38.718,
        "lng": -62.266
      },
      "destination_id": "dest_polo_petroquimico",
      "departure_time": "2026-06-10T08:00:00Z",
      "max_price": 5000,
      "amount_charged": 3800,
      "credit_applied": 1200,
      "final_trip_price": 3800,
      "credit_granted": 1200,
      "currency": "ARS"
    }
  ]
}
```

### Response `200 OK` sin resultados

```json
{
  "pool_id": "pool_abc123",
  "passengers": []
}
```

### Reglas del contrato

- `passengers` siempre debe ser un array.
- Si no hay pasajeros para el filtro solicitado, debe responder `passengers: []`.
- `reservation_status` representa el estado operativo de la reserva.
- `payment_status` representa el estado del pago asociado a la reserva.
- El filtro `payment_status=PAID` debe devolver únicamente reservas pagadas.
- Las reservas con `payment_status = DENIED`, `CANCELED` o `EXPIRED` no forman parte efectiva del pool.
- La **Rider App** solo debe notificar a la **Driver App** que una reserva se suma al pool cuando el pago fue exitoso.
- La **Payments App** utiliza este endpoint con `payment_status=PAID` para calcular ajustes de crédito.
- La **Driver App** utiliza este endpoint con `payment_status=PAID` como manifiesto final operativo.
- La **Feedback App** utiliza este endpoint para obtener los pasajeros del pool y calcular sus promedios de calificación.
- `final_trip_price` puede ser `null` antes del cálculo de ajustes de crédito.
- `credit_granted` puede ser `0` si todavía no se generó saldo a favor o si no correspondía generarlo.

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | Alguno de los filtros enviados tiene un valor inválido. |
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | El pool no tiene reservas asociadas o no existe para Rider App. |
| `500 Internal Server Error` | Error interno al obtener pasajeros del pool. |

---

## 2. POST `/api/pools/:pool_id/cancellations`

### Descripción

Permite a la **Driver App** notificar a la **Rider App** que un pool fue cancelado por falta de conductor asignado.

La **Rider App** debe actualizar las reservas asociadas al pool a estado `CANCELED` y notificar a los pasajeros.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Driver App | Rider App |

### Path params

| Campo | Tipo | Descripción |
|------|------|-------------|
| `pool_id` | string | Identificador del pool cancelado. |

### Request body

```json
{
  "reason": "NO_DRIVER_ASSIGNED",
  "message": "El viaje fue cancelado porque no se asignó un conductor antes del horario límite."
}
```

### Response `200 OK`

```json
{
  "pool_id": "pool_abc123",
  "updated_reservations": 8,
  "new_reservation_status": "CANCELED",
  "notifications_sent": true
}
```

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | Falta el motivo de cancelación. |
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | No existen reservas asociadas al pool. |
| `409 Conflict` | Las reservas ya estaban canceladas o en un estado final incompatible. |
| `500 Internal Server Error` | Error interno al cancelar reservas. |

---

## 3. PATCH `/api/reservations/:reservation_id/payment-result`

### Descripción

Permite a la **Payments App** notificar a la **Rider App** el resultado del cobro de una reserva.

Si el pago fue exitoso:

- `payment_status = PAID`;
- la reserva deja `PENDING_PAYMENT` y pasa a `PENDING_DRIVER` o `CONFIRMED`, segun si el pool ya tiene conductor asignado o no;
- se guardan `max_price`, `credit_applied` y `amount_charged`.

Si Mercado Pago rechaza el pago:

- `payment_status = DENIED`;
- `reservation_status` permanece en `PENDING_PAYMENT`;
- la reserva puede reintentar el pago.

Si el usuario cancela el checkout:

- `payment_status = CANCELED`;
- `reservation_status = CANCELED`.

Si el checkout expira:

- `payment_status = EXPIRED`;
- `reservation_status = CANCELED`.

En ninguno de los casos no exitosos la reserva forma parte efectiva del pool.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Payments App | Rider App |

### Path params

| Campo | Tipo | Descripción |
|------|------|-------------|
| `reservation_id` | string | Identificador de la reserva. |

### Request body para pago exitoso

```json
{
  "payment_status": "PAID",
  "transaction_id": "txn_123456",
  "max_price": 5000,
  "credit_applied": 1200,
  "amount_charged": 3800,
  "currency": "ARS",
  "processed_at": "2026-06-10T07:00:00Z"
}
```

### Request body para pago rechazado

```json
{
  "payment_status": "DENIED",
  "transaction_id": "txn_789012",
  "currency": "ARS",
  "rejection_reason": "INSUFFICIENT_FUNDS",
  "processed_at": "2026-06-10T07:00:00Z"
}
```

### Request body para checkout cancelado por el usuario

```json
{
  "payment_status": "CANCELED",
  "transaction_id": "txn_345678",
  "currency": "ARS",
  "processed_at": "2026-06-10T07:00:00Z"
}
```

### Request body para checkout expirado

```json
{
  "payment_status": "EXPIRED",
  "transaction_id": "txn_901234",
  "currency": "ARS",
  "processed_at": "2026-06-10T07:00:00Z"
}
```

### Response `200 OK` para pago exitoso

```json
{
  "reservation_id": "res_101",
  "payment_status": "PAID",
  "reservation_status": "PENDING_DRIVER",
  "max_price": 5000,
  "credit_applied": 1200,
  "amount_charged": 3800
}
```

### Response `200 OK` para pago rechazado

```json
{
  "reservation_id": "res_101",
  "payment_status": "DENIED",
  "reservation_status": "PENDING_PAYMENT"
}
```

### Response `200 OK` para checkout cancelado por el usuario

```json
{
  "reservation_id": "res_101",
  "payment_status": "CANCELED",
  "reservation_status": "CANCELED"
}
```

### Response `200 OK` para checkout expirado

```json
{
  "reservation_id": "res_101",
  "payment_status": "EXPIRED",
  "reservation_status": "CANCELED"
}
```

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | `payment_status` invalido o faltan datos requeridos. |
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | La reserva no existe. |
| `409 Conflict` | La reserva ya está en un estado final incompatible. |
| `500 Internal Server Error` | Error interno al actualizar el resultado del pago. |

---

## 4. POST `/api/notifications/feedback`

### Descripción

Permite a la **Feedback App** avisar a la **Rider App** que el pasajero ya puede reseñar el viaje.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Feedback App | Rider App |

### Request body

```json
{
  "pool_id": "pool_abc123",
  "passenger_user_id": "user_abc123",
  "message": "Ya podés calificar tu viaje."
}
```

### Response `200 OK`

```json
{
  "notification_sent": true
}
```

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | Faltan datos obligatorios. |
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | No existe el pasajero o el pool indicado. |
| `500 Internal Server Error` | Error interno al procesar la notificación. |

---

# Payments App — Endpoints expuestos

La **Payments App** expone endpoints relacionados con estimacion de precios, checkout de reservas, ajustes de credito y liquidaciones.

---

## 1. GET `/api/payments/pricing-estimate`

### Descripción

Permite a la **Rider App** solicitar el precio máximo y el precio estimado del viaje antes de confirmar una reserva.

El cálculo se realiza según origen, destino y ocupación actual del pool.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Rider App | Payments App |

### Query params

| Campo | Tipo | Obligatorio | Descripción |
|------|------|-------------|-------------|
| `origin_lat` | number | Sí | Latitud del punto de origen. |
| `origin_lng` | number | Sí | Longitud del punto de origen. |
| `destination_id` | string | Sí | Identificador del destino. |
| `current_passengers` | number | Sí | Ocupación actual del pool. |

### Ejemplo

```http
GET /api/payments/pricing-estimate?origin_lat=-38.718&origin_lng=-62.266&destination_id=dest_polo_petroquimico&current_passengers=5
```

### Response `200 OK`

```json
{
  "currency": "ARS",
  "max_price": 5000,
  "estimated_price": 4200,
  "current_passengers": 5,
  "pricing_detail": {
    "base_price": 5000,
    "distance_adjustment": 0,
    "distance_km": 15.5,
    "estimated_discount": 800,
    "discount_reason": "OCCUPANCY_DISCOUNT"
  }
}
```

### Reglas del contrato

- `max_price` representa el máximo que el usuario podría pagar.
- `estimated_price` puede variar hasta el cierre del pool.
- El precio final nunca puede superar `max_price`.

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | Faltan parámetros o tienen formato inválido. |
| `401 Unauthorized` | Token inválido o ausente. |
| `500 Internal Server Error` | Error interno al calcular el precio. |

---

## 2. POST `/api/payments/reservations/:reservation_id/checkout`

### Descripción

Permite a la **Rider App** solicitar a la **Payments App** la creación de una instancia de pago para una reserva.

Este endpoint se utiliza cuando el pasajero confirma que quiere reservar un viaje. La **Rider App** crea previamente una reserva en estado `PENDING_PAYMENT` y con `payment_status = UNPAID`. Luego llama a este endpoint para que la **Payments App** prepare el checkout correspondiente.

La **Payments App** calcula el saldo a favor disponible del pasajero, aplica ese saldo sobre el precio máximo de la reserva y determina cuánto debe cobrarse mediante Mercado Pago.

Luego, la **Payments App** devuelve una URL de pago para que la **Rider App** redirija al pasajero.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Rider App | Payments App |

### Path params

| Campo | Tipo | Descripción |
|------|------|-------------|
| `reservation_id` | string | Identificador de la reserva creada en Rider App. |

### Request body

```json
{
  "pool_id": "pool_abc123",
  "passenger_user_id": "user_abc123",
  "max_price": 5000,
  "currency": "ARS",
  "success_url": "https://rider-app.com/reservations/res_123/success",
  "failure_url": "https://rider-app.com/reservations/res_123/failure",
  "pending_url": "https://rider-app.com/reservations/res_123/pending",
  "expires_at": "2026-06-10T08:00:00Z"
}
```

### Campos

| Campo | Tipo | Obligatorio | Descripción |
|------|------|-------------|-------------|
| `pool_id` | string | Sí | Identificador del pool asociado a la reserva. |
| `passenger_user_id` | string | Sí | Identificador del pasajero en Clerk. |
| `max_price` | number | Sí | Precio máximo que debe pagar el pasajero por la reserva. |
| `currency` | string | Sí | Moneda del pago. Ejemplo: `ARS`. |
| `success_url` | string | Sí | URL final de Rider App para un pago exitoso. Payments App la preserva durante el retorno desde Mercado Pago. |
| `failure_url` | string | Sí | URL final de Rider App para un pago rechazado o cancelado. Payments App la preserva durante el retorno desde Mercado Pago. |
| `pending_url` | string | Sí | URL final de Rider App para un pago pendiente. Payments App la preserva durante el retorno desde Mercado Pago. |
| `expires_at` | string | No | Fecha y hora límite en formato ISO 8601 para completar el pago. |

### Response `201 Created`

```json
{
  "checkout_id": "checkout_123",
  "reservation_id": "res_123",
  "pool_id": "pool_abc123",
  "passenger_user_id": "user_abc123",
  "checkout_url": "https://payments-app.com/checkout/checkout_123",
  "max_price": 5000,
  "available_credit": 1200,
  "credit_applied": 1200,
  "amount_to_charge": 3800,
  "currency": "ARS",
  "checkout_status": "CREATED",
  "is_demo_mode": false
}
```

### Reglas del contrato

- La **Rider App** no debe enviar al usuario directamente a Payments App con datos sensibles en la URL.
- La **Rider App** debe llamar primero a este endpoint para crear una instancia de checkout.
- La **Payments App** calcula el saldo disponible del usuario.
- Si el usuario tiene saldo a favor, este se aplica primero.
- Si el saldo a favor cubre todo el precio máximo, `amount_to_charge` puede ser `0`.
- Si `amount_to_charge = 0`, la **Payments App** puede marcar el pago como exitoso sin redirigir a Mercado Pago.
- Si `amount_to_charge > 0`, la **Payments App** crea una preferencia de Mercado Pago Checkout Pro y devuelve `checkout_url`.
- La **Rider App** redirige al usuario a `checkout_url`, no directamente a Mercado Pago.
- Desde `checkout_url`, la **Payments App** muestra el resumen del pago y luego deriva al usuario a Mercado Pago Checkout Pro.
- La reserva recien se considera pagada cuando la **Payments App** notifica a la **Rider App** mediante `PATCH /api/reservations/:reservation_id/payment-result` con `payment_status = PAID`.
- Si el pago es rechazado, Rider App mantiene `reservation_status = PENDING_PAYMENT` y puede permitir reintento.
- Si el usuario cancela el checkout o este expira, Rider App debe dejar `reservation_status = CANCELED`.

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | Faltan datos obligatorios o tienen formato inválido. |
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | No se encontró información suficiente para crear el checkout. |
| `409 Conflict` | Ya existe un checkout activo o pagado para esa reserva. |
| `500 Internal Server Error` | Error interno al crear el checkout. |

---

## 3. POST `/api/payments/pools/:pool_id/credit-adjustments`

### Descripción

Permite a la **Driver App** solicitar a la **Payments App** el cálculo de ajustes de crédito asociados a un pool.

Este endpoint reemplaza al cobro automático en T-1h. En este nuevo flujo, los pasajeros ya pagaron el precio máximo al momento de reservar. Por lo tanto, al cierre del pool ya no se cobran pagos automáticos.

En T-1h, o ante una cancelación del pool por falta de conductor, la **Payments App** calcula si corresponde generar saldo a favor para los pasajeros.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Driver App | Payments App |

### Comunicación interna requerida

La **Payments App** consulta a la **Rider App** el manifiesto de pasajeros pagados del pool mediante:

```http
GET /api/pools/:pool_id/passengers?payment_status=PAID
```

### Path params

| Campo | Tipo | Descripción |
|------|------|-------------|
| `pool_id` | string | Identificador del pool sobre el cual se calculan los ajustes. |

### Request body para cierre normal del pool

```json
{
  "reason": "POOL_LOCKED",
  "departure_time": "2026-06-10T08:00:00Z",
  "current_passengers": 8
}
```

### Request body para cancelación por falta de conductor

```json
{
  "reason": "NO_DRIVER_ASSIGNED",
  "departure_time": "2026-06-10T08:00:00Z",
  "current_passengers": 0
}
```

### Campos

| Campo | Tipo | Obligatorio | Descripción |
|------|------|-------------|-------------|
| `reason` | string | Sí | Motivo del ajuste. Valores posibles: `POOL_LOCKED`, `NO_DRIVER_ASSIGNED`. |
| `departure_time` | string | Sí | Fecha y hora de salida del pool. |
| `current_passengers` | number | Sí | Ocupación del pool al momento del ajuste. |

### Response `200 OK` para cierre normal del pool

```json
{
  "pool_id": "pool_abc123",
  "reason": "POOL_LOCKED",
  "final_price": 3800,
  "processed_reservations": 8,
  "currency": "ARS",
  "credits_generated": [
    {
      "reservation_id": "res_101",
      "passenger_user_id": "user_abc123",
      "max_price_paid": 5000,
      "final_price": 3800,
      "credit_granted": 1200,
      "credit_balance_after": 1800
    },
    {
      "reservation_id": "res_102",
      "passenger_user_id": "user_def456",
      "max_price_paid": 5000,
      "final_price": 3800,
      "credit_granted": 1200,
      "credit_balance_after": 1200
    }
  ]
}
```

### Response `200 OK` para cancelación por falta de conductor

```json
{
  "pool_id": "pool_abc123",
  "reason": "NO_DRIVER_ASSIGNED",
  "final_price": 0,
  "processed_reservations": 2,
  "currency": "ARS",
  "credits_generated": [
    {
      "reservation_id": "res_101",
      "passenger_user_id": "user_abc123",
      "max_price_paid": 5000,
      "final_price": 0,
      "credit_granted": 5000,
      "credit_balance_after": 6200
    },
    {
      "reservation_id": "res_102",
      "passenger_user_id": "user_def456",
      "max_price_paid": 5000,
      "final_price": 0,
      "credit_granted": 5000,
      "credit_balance_after": 5000
    }
  ]
}
```

### Response `200 OK` si no se genera crédito

```json
{
  "pool_id": "pool_abc123",
  "reason": "POOL_LOCKED",
  "final_price": 5000,
  "processed_reservations": 4,
  "currency": "ARS",
  "credits_generated": []
}
```

### Reglas del contrato

- Este endpoint no realiza cobros.
- Este endpoint reemplaza al antiguo endpoint de cobro automático.
- Si `reason = POOL_LOCKED`, la **Payments App** calcula el precio final del viaje según la ocupación del pool.
- Si `reason = NO_DRIVER_ASSIGNED`, la **Payments App** acredita como saldo a favor el total pagado por cada reserva.
- La **Payments App** solo debe procesar reservas con `payment_status = PAID`.
- Para obtener esas reservas, la **Payments App** consulta a la **Rider App** mediante `GET /api/pools/:pool_id/passengers?payment_status=PAID`.
- Si el precio final es menor al precio máximo pagado, la diferencia se acredita como saldo a favor.
- El saldo a favor generado se guarda en **Payments App**.
- Por cada crédito generado, la **Payments App** debe notificar a la **Rider App** mediante `PATCH /api/reservations/:reservation_id/credit-adjustment`.
- La **Rider App** utiliza esa notificación para actualizar la reserva y mostrar una notificación o toast al pasajero.

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | Faltan datos obligatorios o `reason` tiene un valor inválido. |
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | No existen reservas pagadas asociadas al pool. |
| `409 Conflict` | Los ajustes de crédito para ese pool ya fueron procesados. |
| `502 Bad Gateway` | La Payments App no pudo obtener el manifiesto desde Rider App. |
| `500 Internal Server Error` | Error interno al calcular los ajustes de crédito. |

---

## 4. GET `/api/payments/users/:user_id/credit-balance`

### Descripción

Permite consultar el saldo a favor disponible de un usuario.

Este endpoint puede ser utilizado por la **Rider App** para mostrarle al pasajero cuánto saldo tiene disponible antes de iniciar un nuevo pago.

También puede ser utilizado por la propia **Payments App** para mostrar el saldo dentro de sus pantallas de usuario.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Rider App | Payments App |
| Payments App Frontend | Payments App Backend |

### Path params

| Campo | Tipo | Descripción |
|------|------|-------------|
| `user_id` | string | Identificador del usuario en Clerk. |

### Response `200 OK`

```json
{
  "user_id": "user_abc123",
  "available_credit": 1800,
  "currency": "ARS"
}
```

### Response `200 OK` si el usuario no tiene saldo a favor

```json
{
  "user_id": "user_abc123",
  "available_credit": 0,
  "currency": "ARS"
}
```

### Reglas del contrato

- La **Payments App** es la fuente de verdad del saldo a favor.
- La **Rider App** no calcula ni modifica el saldo a favor.
- Si el usuario no tiene cuenta de crédito creada, la **Payments App** puede responder `available_credit = 0`.
- El saldo a favor se aplica automáticamente al crear un checkout mediante `POST /api/payments/reservations/:reservation_id/checkout`.

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | El `user_id` tiene formato inválido. |
| `401 Unauthorized` | Token inválido o ausente. |
| `403 Forbidden` | El usuario no tiene permisos para consultar ese saldo. |
| `500 Internal Server Error` | Error interno al consultar el saldo a favor. |

---

## 5. POST `/api/payments/pools/:pool_id/settle`

### Descripción

Permite a la **Driver App** informar que el viaje finalizó y que corresponde liquidar los fondos al conductor.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Driver App | Payments App |

### Path params

| Campo | Tipo | Descripción |
|------|------|-------------|
| `pool_id` | string | Identificador del pool finalizado. |

### Request body

```json
{
  "driver_user_id": "user_driver_01",
  "completed_at": "2026-06-10T09:00:00Z"
}
```

### Response `200 OK`

```json
{
  "pool_id": "pool_abc123",
  "settlement_id": "settlement_123",
  "settlement_status": "COMPLETED",
  "driver_user_id": "user_driver_01",
  "amount": 30400,
  "currency": "ARS"
}
```

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | Faltan datos obligatorios. |
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | No existen cobros asociados al pool. |
| `409 Conflict` | El viaje no está completado o la liquidación ya fue realizada. |
| `500 Internal Server Error` | Error interno al liquidar fondos. |

---

# Feedback App — Endpoints expuestos

La **Feedback App** expone endpoints relacionados con calificaciones, promedios de reputación y pre-creación de reseñas.

---

## 1. GET `/api/ratings/:user_id`

### Descripción

Permite consultar el promedio de calificaciones de un usuario.

Este endpoint puede ser utilizado por la **Rider App** para mostrar el promedio del conductor asignado a un pool.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Rider App | Feedback App |

### Path params

| Campo | Tipo | Descripción |
|------|------|-------------|
| `user_id` | string | Identificador del usuario consultado. |

### Query params opcionales

| Campo | Tipo | Obligatorio | Descripción |
|------|------|-------------|-------------|
| `role` | string | No | Rol sobre el que se consulta el promedio. Ejemplo: `driver` o `rider`. |

### Response `200 OK`

Si el usuario tiene reseñas:

```json
{
  "user_id": "user_driver_01",
  "role": "driver",
  "average_rating": 4.8,
  "total_reviews": 25
}
```

Si el usuario todavía no tiene reseñas:

```json
{
  "user_id": "user_driver_01",
  "role": "driver",
  "average_rating": null,
  "total_reviews": 0
}
```

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | El rol enviado no es válido. |
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | El usuario no existe para Feedback App. |
| `500 Internal Server Error` | Error interno al consultar el promedio. |

---

## 2. GET `/api/ratings/pools/:pool_id/passengers`

### Descripción

Permite a la **Driver App** consultar el promedio de calificaciones de los pasajeros asociados a un pool.

La **Driver App** envía únicamente el `pool_id`. Luego, la **Feedback App** consulta a la **Rider App** la lista de pasajeros asociados a ese pool mediante:

```http
GET /api/pools/:pool_id/passengers
```

Con esa lista, la **Feedback App** calcula y devuelve el promedio de calificaciones de cada pasajero.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Driver App | Feedback App |

### Comunicación interna requerida

| App origen | App destino | API involucrada |
|------------|-------------|-----------------|
| Feedback App | Rider App | `GET /api/pools/:pool_id/passengers` |

### Path params

| Campo | Tipo | Descripción |
|------|------|-------------|
| `pool_id` | string | Identificador del pool cuyos pasajeros se quieren consultar. |

### Ejemplo

```http
GET /api/ratings/pools/pool_abc123/passengers
```

### Response `200 OK`

```json
{
  "pool_id": "pool_abc123",
  "ratings": [
    {
      "passenger_user_id": "user_abc123",
      "passenger_name": "Franco Gulino",
      "average_rating": 4.6,
      "total_reviews": 12
    },
    {
      "passenger_user_id": "user_def456",
      "passenger_name": "Juan Ignacio Ibarra",
      "average_rating": 4.9,
      "total_reviews": 8
    }
  ]
}
```

### Response `200 OK` cuando un pasajero no tiene reseñas

```json
{
  "pool_id": "pool_abc123",
  "ratings": [
    {
      "passenger_user_id": "user_abc123",
      "passenger_name": "Franco Gulino",
      "average_rating": null,
      "total_reviews": 0
    }
  ]
}
```

### Response `200 OK` cuando el pool no tiene pasajeros

```json
{
  "pool_id": "pool_abc123",
  "ratings": []
}
```

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | El `pool_id` tiene formato inválido. |
| `401 Unauthorized` | Token inválido o ausente. |
| `404 Not Found` | No se encontró el pool o no existen pasajeros asociados. |
| `502 Bad Gateway` | La Feedback App no pudo obtener los pasajeros desde la Rider App. |
| `500 Internal Server Error` | Error interno al consultar las calificaciones. |

## 3. POST `/api/reviews/precreate`

### Descripción

Permite a la **Driver App** notificar a la **Feedback App** que el viaje inició.

La **Driver App** envía el `pool_id` y el `driver_user_id`. Luego, la **Feedback App** consulta a la **Rider App** el listado de pasajeros asociados a ese pool que tengan reserva en estado `PAID`, mediante:

```http
GET /api/pools/:pool_id/passengers?status=PAID
```

Con esa lista, la **Feedback App** pre-crea las reseñas asociadas al viaje en estado `PRECREATED`.

Mientras las reseñas están en estado `PRECREATED`, no son visibles para los usuarios.

### Quién llama a quién

| App origen | App destino |
|------------|-------------|
| Driver App | Feedback App |

### Comunicación interna requerida

| App origen | App destino | API involucrada |
|------------|-------------|-----------------|
| Feedback App | Rider App | `GET /api/pools/:pool_id/passengers?status=PAID` |

### Request body

```json
{
  "pool_id": "pool_abc123",
  "driver_user_id": "user_driver_01",
  "started_at": "2026-06-10T08:00:00Z"
}
```

### Campos

| Campo | Tipo | Obligatorio | Descripción |
|------|------|-------------|-------------|
| `pool_id` | string | Sí | Identificador del pool cuyo viaje inició. |
| `driver_user_id` | string | Sí | Identificador del conductor asignado al pool. |
| `started_at` | string | Sí | Fecha y hora en la que inició el recorrido. |

### Response `201 Created`

```json
{
  "pool_id": "pool_abc123",
  "review_status": "PRECREATED",
  "paid_passengers_count": 2,
  "created_reviews": 4
}
```

### Response `200 OK` si no hay pasajeros pagados

```json
{
  "pool_id": "pool_abc123",
  "review_status": "PRECREATED",
  "paid_passengers_count": 0,
  "created_reviews": 0
}
```

### Reglas del contrato

Para cada viaje se generan reseñas en ambos sentidos:

- pasajeros hacia conductor;
- conductor hacia pasajeros.

La **Feedback App** solo debe pre-crear reseñas para pasajeros con reservas en estado `PAID`.

La cantidad final de reseñas creadas depende de la cantidad de pasajeros pagados obtenidos desde la **Rider App**.

Por cada pasajero pagado se crean:

- una reseña del pasajero hacia el conductor;
- una reseña del conductor hacia ese pasajero.

Por eso, en condiciones normales, `created_reviews` debería ser igual a:

```text
paid_passengers_count * 2
```

Si no hay pasajeros en estado `PAID`, no se crean reseñas.

### Errores

| Código | Motivo |
|--------|--------|
| `400 Bad Request` | Faltan datos obligatorios o tienen formato inválido. |
| `401 Unauthorized` | Token inválido o ausente. |
| `409 Conflict` | Las reseñas para ese pool ya fueron pre-creadas. |
| `502 Bad Gateway` | La Feedback App no pudo obtener los pasajeros pagados desde la Rider App. |
| `500 Internal Server Error` | Error interno al pre-crear reseñas. |
