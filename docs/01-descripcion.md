# 1.1 — Descripción del Sistema

> **Tipo A — Plataforma de Transporte (WeShuttle)**

## ¿Qué problema resuelve?
**WeShuttle** optimiza el traslado de personal inicialmente hacia los nodos industriales de Bahía Blanca (Polo Petroquímico, Puerto de Ingeniero White y Parque Industrial) y escalable a futuro para otras empresas con lejanía considerable.  Resuelve la falta de transporte flexible y el alto costo del viaje individual mediante un modelo de **Pool Programado** en combis de hasta 15 pasajeros. El sistema ofrecerá una interfaz mediante la cual los trabajadores puedan solicitar y unirse a viajes con mismo destino y horario. De esta manera a medida que va aumentando el numero de pasajeros de un viaje, el precio individual va a ir bajando, reduciendo los altos costos de transporte. 

## Actores del sistema
| Actor | Descripción | Apps donde interactúa |
|-------|-------------|----------------------|
| **Pasajero (Rider)** | Reserva su lugar en pools, visualiza precios estimados, paga el precio máximo al momento de reservar y recibe saldo a favor si el precio final del viaje resulta menor por la ocupación del pool. Al finalizar su viaje puede realizar una reseña al conductor. | Rider, Payments, Feedback |
| **Conductor (Driver)** | Acepta viajes del marketplace, actualiza el estado del recorrido, recibe su liquidación y puede realizar una reseña a cada pasajero. | Driver, Payments, Feedback |
| **Administrador** | Gestiona los datos principales de cada app y visualiza listados y reportes | Rider, Driver, Payments, Feedback y posteriormente Control Plane|

## Flujo principal de uso

### Estados principales

#### Estados de la reserva en Rider App

- `PENDING_PAYMENT`: la reserva fue creada, pero todavía no tiene pago exitoso.
- `PENDING_DRIVER`: la reserva ya fue pagada, pero el pool todavía no tiene conductor asignado.
- `CONFIRMED`: la reserva ya fue pagada y el pool tiene conductor asignado.
- `CANCELED`: la reserva fue cancelada.

#### Estados de pago de la reserva

- `UNPAID`: la reserva todavía no fue pagada.
- `PENDING`: el pago fue iniciado pero todavía no fue confirmado.
- `PAID`: el pago fue exitoso.
- `DENIED`: el pago fue rechazado.
- `CANCELED`: el checkout fue cancelado por el usuario.
- `EXPIRED`: el checkout venció sin pago exitoso.

#### Estados del pool en Driver App

- `AVAILABLE`: el pool está creado y disponible en el marketplace para que un conductor lo acepte.
- `ASSIGNED`: un conductor aceptó el pool.
- `LOCKED`: el pool fue cerrado 1 hora antes de la partida y ya no permite nuevas reservas ni cancelaciones voluntarias.
- `IN_PROGRESS`: el conductor inició el recorrido.
- `COMPLETED`: el viaje finalizó.
- `CANCELED`: el pool fue cancelado.

#### Estados de las reseñas en Feedback App

- `PRECREATED`: la reseña fue creada internamente, pero todavía no está visible para el usuario.
- `PENDING`: la reseña está disponible para que el usuario la complete.
- `COMPLETED`: la reseña fue completada por el usuario.

---

## 1. Solicitud de viaje y cotización

El pasajero solicita un viaje desde la **Rider App**. La brecha horaria permitida para reservar un viaje es desde 24 horas hasta 1 hora antes de la partida.

El usuario selecciona el destino y el horario del viaje. Luego, la **Rider App** consulta a la **Driver App** si ya existe un pool creado para ese destino y horario.

- Si existe un pool, la **Driver App** devuelve la cantidad de pasajeros actuales y el `pool_id` correspondiente.
- Si no existe un pool, la **Driver App** devuelve ocupación `0` y `pool_id = NULL`.

Con esta información, la **Rider App** consulta a la **Payments App** el precio máximo que el usuario va a pagar y el precio estimado del viaje(la diferencia a favor del usuario luego sera devuelta en forma de credito para proximos viajes), enviando el destino, el origen y la ocupación actual del pool.

La **Payments App** devuelve:

- el precio máximo que el pasajero va a pagar;
- el precio estimado según la ocupación actual del pool.

Con estos datos, el pasajero puede visualizar los posibles costos del viaje antes de confirmar la reserva.

Si al momento de solicitar el viaje ya existe un pool para ese destino y horario, y dicho pool ya tiene un conductor asignado, la **Rider App** también puede mostrar el nombre del conductor y su promedio de calificaciones.

Para esto, la **Rider App** obtiene la información del conductor desde la **Driver App** y su promedio de estrellas desde la **Feedback App**.

Antes de confirmar definitivamente la reserva, el pasajero será redirigido a la **Payments App** para realizar el pago del viaje.

La **Payments App** cobrará el precio máximo informado para la reserva. Si el pasajero tiene saldo a favor disponible, este se aplicará primero. Si el saldo no alcanza para cubrir el precio máximo, se cobrará la diferencia mediante Mercado Pago.

---

## 2. Reserva e inmutabilidad

Cuando el pasajero decide reservar, la **Rider App** crea una reserva en estado `PENDING_PAYMENT` y con `payment_status = UNPAID`.

Esta reserva todavía no incrementa la ocupación del pool.

Luego, la **Rider App** redirige al pasajero a la **Payments App** para realizar el pago del precio máximo.

Cuando la **Payments App** confirma el pago exitoso, notifica a la **Rider App**. En ese momento:

- la reserva actualiza `payment_status = PAID`;
- la reserva pasa a `PENDING_DRIVER` o `CONFIRMED`, según si el pool tiene conductor asignado o no;
- la **Rider App** notifica a la **Driver App** que debe sumar esa reserva al pool.

La **Rider App** guarda un snapshot comercial e inmutable de la reserva, que incluye:

- destino;
- horario;
- precio máximo que el pasajero termino pagando.

El precio máximo guardado representa el límite superior del cobro que termina pagando el usuario. El precio final del viaje nunca puede superar ese valor; a lo sumo, puede ser igual.

Si el usuario requiere un cambio posterior en el destino, horario u otra información relevante de la reserva, debe cancelar la reserva actual y crear una nueva.

Una vez creada la reserva:

- si el pool ya existía, la **Rider App** notifica a la **Driver App** que debe incrementar en 1 la ocupación del pool;
- si el pool no existía, la **Rider App** le solicita a la **Driver App** la creación de un nuevo pool y recibe el `pool_id` correspondiente.

Cuando un pasajero cancela su reserva, la **Rider App** actualiza la reserva al estado `CANCELED` y notifica a la **Driver App**. El viaje pagado queda como saldo a favor para la persona en futuros viajes. 

La **Driver App** decrementa la ocupación del pool. Si el pool queda vacío, lo elimina o lo marca como `CANCELED`, según corresponda.

---

## 3. Marketplace y asignación de conductor

Una vez creado, el pool se publica en el marketplace de la **Driver App** con estado `AVAILABLE`.

Al visualizar un pool en el marketplace, el conductor puede ver los pasajeros que ya se sumaron al pool. Junto a cada pasajero, la **Driver App** puede mostrar su promedio de calificaciones, obtenido desde la **Feedback App**.

Los conductores pueden aceptar viajes con antelación para organizar su agenda. Antes de poder aceptar un viaje, el conductor debe haber sido redirigido a la **Payments App** para configurar dónde quiere recibir sus pagos.

Cuando un conductor acepta el viaje:

- el estado del pool cambia a `ASSIGNED`;
- el pool desaparece del marketplace;
- las reservas asociadas al pool pasan de `PENDING_DRIVER` a `CONFIRMED`;
- la **Rider App** consulta a la **Driver App** la información básica del conductor asignado, la patente y modelo del vehiculo, y consulta a la **Feedback App** su promedio de calificaciones, para mostrar ambos datos a los pasajeros. 

Una vez que el conductor acepta un viaje, no puede cancelarlo. Esta funcionalidad se modelará en futuras etapas.

---

## 4. Caso sin conductor asignado

Si llega el momento de cierre del pool y ningún conductor aceptó el viaje, el pool se marca como `CANCELED`.

En ese caso:

- las reservas pagadas asociadas al pool pasan a estado `CANCELED`;
- la **Rider App** notifica a los pasajeros que el viaje fue cancelado por falta de conductor;
- la **Driver App** solicita a la **Payments App** que genere el ajuste de crédito correspondiente;
- la **Payments App** acredita a cada pasajero el monto pagado como saldo a favor para próximos viajes.

---

## 5. Cierre del pool y cálculo de saldo a favor (T-1h)

Una hora antes de la partida, la **Driver App** cierra el pool cambiando su estado a `LOCKED`.

El estado `LOCKED` bloquea nuevas reservas y cancelaciones voluntarias por parte de los usuarios.

En este momento ya no se realizan cobros automáticos, porque las reservas fueron pagadas al momento de crearse.

Al bloquear el pool, la **Driver App** solicita a la **Payments App** que calcule los ajustes de crédito correspondientes al pool.

La **Payments App** utiliza el `pool_id` para solicitarle a la **Rider App** el manifiesto de pasajeros pagados asociado al pool.

El precio final real se define en este momento y depende de la ocupación del pool al momento T-1h.

La **Payments App** compara, para cada reserva pagada:

- el precio máximo pagado al momento de reservar;
- el precio final calculado según la ocupación del pool.

Si el precio final es menor que el precio máximo pagado, la diferencia se acredita como saldo a favor para próximos viajes.

Luego, la **Payments App** notifica a la **Rider App** el resultado del ajuste para que pueda actualizar la reserva y mostrar una notificación al pasajero indicando que tiene saldo a favor.

## 6. Ejecución y seguimiento del viaje

Cuando el conductor consulta su recorrido final, la **Driver App** consume el manifiesto de la **Rider App**, filtrando únicamente las reservas en estado `PAID`.

Luego, la **Driver App** guarda una copia local del manifiesto final. Este snapshot operativo incluye los pasajeros y sus puntos de recogida.

Este snapshot permite que el conductor tenga toda la información necesaria para realizar el viaje, incluso si ocurren fallos de red o problemas de comunicación entre servicios.

Cuando el conductor inicia el recorrido, la **Driver App** cambia el estado del pool a `IN_PROGRESS`.

Al mismo tiempo, la **Driver App** notifica a la **Feedback App** para que pre-cree las reseñas de las reservas pagadas. Estas reseñas se crean inicialmente en estado `PRECREATED`, por lo que todavía no son visibles para los usuarios.

Durante el recorrido, el conductor selecciona al siguiente pasajero que debe retirar.

La **Driver App** actualiza en el estado granular del pool:

- el `target_user_id`, con el id del pasajero correspondiente;
- el `hito`, con el mensaje que debe visualizar ese pasajero.

Cuando el conductor se dirige hacia un pasajero, el `hito` se actualiza a:

> "El conductor está en camino a tu ubicación"

Cuando el conductor llega al punto de recogida, el `hito` se actualiza a:

> "El conductor llegó a tu ubicación"

Luego, cuando el conductor cambia el `target_user_id` para indicar el próximo pasajero a retirar, el pasajero anterior deja de ser el objetivo activo del recorrido y visualiza el mensaje:

> "Recorrido en progreso"

---

## 7. Sincronización de estado entre aplicaciones

La **Rider App** y la **Feedback App** realizan polling a la **Driver App** para obtener el estado actualizado del pool y del recorrido.

La **Rider App** utiliza esta información para:

- detectar cuando un pool pasa a `ASSIGNED`;
- actualizar las reservas de `PENDING_DRIVER` a `CONFIRMED`;
- mostrar la información del conductor;
- informar a los pasajeros cuando el conductor inicia el recorrido;
- mostrar los hitos correspondientes durante la búsqueda de cada pasajero;
- mostrar el resumen del viaje cuando el pool pasa a `COMPLETED`.

La **Feedback App** utiliza esta información para:

- monitorear el avance del viaje;
- detectar cuando el viaje finaliza;
- habilitar las reseñas correspondientes al finalizar el recorrido.

---

## 8. Finalización y liquidación

Al llegar a destino, el conductor marca el viaje como finalizado. La **Driver App** cambia el estado del pool a `COMPLETED`.

Cuando el pool pasa a `COMPLETED`, la **Driver App** notifica a la **Payments App** para que proceda con la liquidación de fondos al conductor.

Al detectar el estado `COMPLETED`, la **Rider App** muestra un resumen del viaje finalizado a cada uno de los pasajeros.

El resumen del viaje muestra los datos principales de la reserva, incluyendo destino, horario, conductor, vehiculo, estado final del viaje, `amount_charged`, `credit_applied`, `final_trip_price` y `credit_granted`.

La **Feedback App** cambia el estado de las reseñas asociadas al pool de `PRECREATED` a `PENDING`. A partir de este momento, las reseñas quedan visibles y disponibles para los usuarios.

Luego, la **Feedback App** envía notificaciones a la **Rider App** y a la **Driver App** para informar que ya es posible reseñar el viaje, habilitando la redirección hacia la **Feedback App**.

---

## 9. Feedback mutuo

Dentro de la **Feedback App**, el usuario puede visualizar y completar todas sus reseñas pendientes, ordenadas desde la más reciente hasta la más antigua.

Cuando un usuario completa una reseña pendiente, esta cambia al estado `COMPLETED`.

Además, el usuario puede:

- generar reportes sobre sus viajes;
- visualizar sus reseñas completadas;
- consultar su promedio de estrellas;
- visualizar los reportes recibidos según su rol: pasajero o conductor.
