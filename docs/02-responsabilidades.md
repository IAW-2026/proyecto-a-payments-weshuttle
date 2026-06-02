# 1.2 — Asignación de Responsabilidades

> **Tipo A — Plataforma de Transporte (WeShuttle)**

## Distribución de webapps

| App | Responsable | Repositorio |
|-----|-------------|-------------|
| Driver App | Juliana Pagani | `proyecto-a-driver-[nombre]` |
| Rider App | Franco Gulino | `proyecto-a-rider-[nombre]` |
| Payments App | Juan Ignacio Ibarra | `proyecto-a-payments-[nombre]` |
| Feedback App | Juan Bassi | `proyecto-a-feedback-[nombre]` |

---

## Criterio general de separación

Cada webapp es responsable de sus propios datos y los persiste en su propia base de datos.

Ninguna aplicación accede directamente a la base de datos de otra. Cuando una app necesita consultar o modificar información que pertenece a otra, debe hacerlo a través de una API inter-servicio.

La definición detallada de cada endpoint, incluyendo request y response, se documenta en el archivo **1.3 — Diseño de APIs inter-servicios**.

---

## Datos propios de cada app (Persistencia)

### Driver App

La **Driver App** es responsable de la operación del viaje, la administración de conductores, vehículos y pools.

Datos propios:

- Conductores.
- Vehículos.
- Pools de viaje.
- Estado operativo del pool.
- Ocupación actual del pool.
- Marketplace de pools disponibles.
- Estado granular del recorrido, incluyendo:
  - pasajero objetivo actual;
  - hito o mensaje operativo del viaje.
- Snapshot operativo del manifiesto final del viaje.

Responsabilidades principales:

- Crear y administrar pools.
- Publicar pools en el marketplace.
- Permitir que un conductor acepte un pool.
- Administrar los cambios de estado del pool:
  - `AVAILABLE`
  - `ASSIGNED`
  - `LOCKED`
  - `IN_PROGRESS`
  - `COMPLETED`
  - `CANCELED`
- Mantener la ocupación del pool.
- Cancelar pools cuando corresponda.
- Informar a otras apps los cambios relevantes del viaje.
- Guardar la información operativa necesaria para que el conductor pueda realizar el recorrido.

---

### Rider App

La **Rider App** es responsable de la experiencia del pasajero, las reservas y el historial de viajes.

Datos propios:

- Pasajeros.
- Destinos disponibles.
- Reservas.
- Estado de cada reserva.
- Snapshot comercial de la reserva.
- Precio máximo informado al momento de reservar.
- Precio efectivo pagado por el pasajero.
- Historial de viajes del pasajero.

Responsabilidades principales:

- Permitir que un pasajero solicite un viaje.
- Crear reservas asociadas a pools.
- Mantener los estados de reserva:
  - `PENDING_DRIVER`
  - `CONFIRMED`
  - `PAID`
  - `DENIED`
  - `CANCELED`
- Guardar los datos principales de la reserva para mantener su inmutabilidad.
- Informar a la Driver App cuando una reserva se suma a un pool.
- Informar a la Driver App cuando una reserva se cancela.
- Proveer el listado de pasajeros de un pool cuando otra app lo requiera.
- Actualizar la reserva con el resultado del pago informado por Payments App.
- Guardar el precio efectivo pagado para mostrarlo en el resumen e historial de viajes.
- Mostrar al pasajero el estado del viaje y la información disponible del conductor asignado.

---

### Payments App

La **Payments App** es responsable de precios, cobros, medios de pago, transacciones y liquidaciones.

Datos propios:

- Métodos de pago de pasajeros.
- Cuentas de cobro de conductores.
- Reglas de precios.
- Descuentos o ajustes aplicables.
- Cobros.
- Transacciones.
- Liquidaciones a conductores.
- Detalle de pagos realizados o rechazados.

Responsabilidades principales:

- Calcular el precio máximo de un viaje.
- Calcular el precio estimado según origen, destino y ocupación.
- Procesar el cobro automático de las reservas al cierre del pool.
- Aplicar descuentos o ajustes correspondientes.
- Determinar el precio efectivo cobrado al pasajero.
- Informar a la Rider App el resultado del pago.
- Informar a la Rider App el precio efectivo pagado.
- Informar a la Driver App cuando un pago rechazado requiere ajustar la ocupación del pool.
- Procesar la liquidación al conductor cuando el viaje finaliza.

---

### Feedback App

La **Feedback App** es responsable de reseñas, calificaciones y reportes.

Datos propios:

- Reseñas.
- Estado de las reseñas.
- Promedios de calificación.
- Reportes.

Responsabilidades principales:

- Pre-crear reseñas cuando inicia un viaje.
- Mantener los estados de reseña:
  - `PRECREATED`
  - `PENDING`
  - `COMPLETED`
- Habilitar las reseñas cuando finaliza el viaje.
- Permitir que pasajeros califiquen conductores.
- Permitir que conductores califiquen pasajeros.
- Calcular y exponer el promedio de calificaciones de un usuario.
- Permitir consultar calificaciones individuales o en lote.
- Gestionar reportes.
- Notificar a Rider App y Driver App cuando las reseñas están disponibles.

---

## Datos o acciones que requieren comunicación entre apps (Interconectividad)

| App origen | Acción / dato necesario | App destino | API involucrada |
|------------|------------------------|-------------|-----------------|
| **Rider App** | Consultar si existe un pool para un destino y horario determinado | **Driver App** | `GET /api/pools/search?destination_id=:destination_id&departure_time=:departure_time` |
| **Rider App** | Solicitar la creación de un nuevo pool cuando no existe uno compatible | **Driver App** | `POST /api/pools` |
| **Rider App** | Notificar que una reserva se sumó a un pool existente | **Driver App** | `POST /api/pools/:pool_id/reservations` |
| **Rider App** | Notificar que una reserva fue cancelada para decrementar la ocupación del pool | **Driver App** | `DELETE /api/pools/:pool_id/reservations/:reservation_id` |
| **Rider App** | Consultar el estado actual del pool y sus datos operativos | **Driver App** | `GET /api/pools/:pool_id/status` |
| **Rider App** | Consultar la información del conductor y vehículo asignados a un pool | **Driver App** | `GET /api/pools/:pool_id/assigned-driver` |
| **Rider App**  | Consultar el promedio de calificaciones del usuario solicitado | **Feedback App** | `GET /api/ratings/:user_id` |
| **Rider App** | Solicitar precio máximo y precio estimado del viaje | **Payments App** | `GET /api/payments/pricing-estimate` |      
| **Driver App** | Consultar los pasajeros que ya se sumaron a un pool para mostrarlos en el marketplace | **Rider App** | `GET /api/pools/:pool_id/passengers` |
| **Driver App** | Consultar el promedio de calificaciones de los pasajeros de un pool | **Feedback App** | `GET /api/ratings/pools/:pool_id/passengers` |
| **Feedback App** | Consultar los pasajeros asociados a un pool para calcular sus calificaciones | **Rider App** | `GET /api/pools/:pool_id/passengers` |
| **Driver App** | Notificar que un pool fue cancelado por falta de conductor asignado | **Rider App** | `POST /api/pools/:pool_id/cancellations` |
| **Driver App** | Solicitar inicio de cobros automáticos al cerrar el pool en T-1h | **Payments App** | `POST /api/payments/pools/:pool_id/auto-charge` |
| **Payments App** | Solicitar el manifiesto de pasajeros de un pool para procesar cobros | **Rider App** | `GET /api/pools/:pool_id/passengers` |
| **Payments App** | Notificar pago exitoso de una reserva, incluyendo el precio efectivo cobrado | **Rider App** | `PATCH /api/reservations/:reservation_id/payment-result` |
| **Payments App** | Notificar pago rechazado de una reserva | **Rider App** | `PATCH /api/reservations/:reservation_id/payment-result` |
| **Payments App** | Notificar que un pago rechazado debe descontarse de la ocupación del pool | **Driver App** | `POST /api/pools/:pool_id/payment-denied` |
| **Driver App** | Solicitar el manifiesto final de pasajeros pagados para iniciar el recorrido | **Rider App** | `GET /api/pools/:pool_id/passengers?status=PAID` |
| **Driver App** | Notificar inicio del recorrido para pre-crear reseñas | **Feedback App** | `POST /api/reviews/precreate` |
| **Rider App** | Consultar hitos y estado granular del recorrido | **Driver App** | `GET /api/pools/:pool_id/status` |
| **Feedback App** | Consultar estado del pool para monitorear avance y finalización del viaje | **Driver App** | `GET /api/pools/:pool_id/status` |
| **Driver App** | Informar fin del viaje para liquidar fondos al conductor | **Payments App** | `POST /api/payments/pools/:pool_id/settle` |
| **Feedback App** | Avisar al pasajero que ya puede reseñar el viaje | **Rider App** | `POST /api/notifications/feedback` |
| **Feedback App** | Avisar al conductor que ya puede reseñar a los pasajeros | **Driver App** | `POST /api/notifications/feedback` |
