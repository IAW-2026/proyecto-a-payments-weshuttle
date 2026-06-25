# Etapa 3 - Integracion y Aplicaciones Globales

Fecha de entrega: 25 de Junio de 2026  
Fechas de defensa: 29 de Junio de 2026 y 2 de Julio de 2026

## Objetivo

En esta etapa, las aplicaciones individuales del ecosistema WeShuttle deben operar integradas entre si y dejar de tomar a los mocks de la Etapa 2 como fuente principal de informacion.

Ademas, la comision desarrolla dos aplicaciones transversales sobre el sistema completo:

- Control Plane
- Analytics Dashboard

Este documento actualiza el criterio de trabajo para **Payments App** dentro de ese escenario integrado.

---

## 3.1 - Integracion entre webapps

Los flujos principales del sistema deben ejecutarse con llamadas reales entre Rider App, Driver App, Payments App y Feedback App, respetando los contratos definidos en `docs/03-apis.md`.

Para Payments App, esto implica que las integraciones con otras aplicaciones deben priorizar:

- consultas reales a endpoints externos;
- notificaciones reales a Rider App y Driver App cuando corresponda;
- manejo de errores controlado cuando una app externa no este disponible;
- consistencia de estados entre reserva, pool, pago, credito y liquidacion.

Ejemplo de flujo integrado esperado para WeShuttle:

1. un pasajero solicita un viaje desde Rider App;
2. Rider App consulta a Driver App si existe un pool compatible;
3. Rider App consulta a Payments App el precio maximo y estimado;
4. Rider App crea la reserva y solicita a Payments App el checkout real;
5. Payments App procesa el cobro y notifica el resultado a Rider App;
6. Driver App cierra o completa el pool y solicita a Payments App los ajustes de credito o la liquidacion;
7. Payments App consulta el manifiesto real de pasajeros pagados y actualiza el estado financiero correspondiente.

---

## 3.2 - Control Plane

Control Plane es una webapp transversal, separada de Payments App, desarrollada colaborativamente por la comision.

Su objetivo es brindar una vista administrativa global del sistema.

Funcionalidades esperadas:

- vision consolidada de entidades principales de cada app;
- acciones administrativas sobre multiples apps desde un unico lugar;
- comunicacion con las APIs de cada webapp individual.

Control Plane no reemplaza los paneles administrativos propios de Payments App, Rider App, Driver App o Feedback App. Los complementa con una vista de mayor nivel.

---

## 3.3 - Analytics Dashboard

Analytics Dashboard es otra webapp transversal, separada de Payments App, tambien desarrollada colaborativamente por la comision.

Su objetivo es consolidar datos del sistema completo para lectura y analisis.

Funcionalidades esperadas:

- indicadores clave del negocio;
- tablas, metricas y visualizaciones del sistema completo;
- consumo de datos reales desde las APIs de las webapps individuales.

Analytics Dashboard no es un CRUD. Su complejidad esta en consolidar multiples fuentes y presentarlas de forma util.

---

## Alcance de Payments App en Etapa 3

Payments App sigue siendo la fuente de verdad del dominio financiero del sistema:

- pricing rules;
- checkout sessions;
- charges;
- credit accounts;
- credit movements;
- pool price finalization jobs;
- payout accounts;
- settlements.

Su responsabilidad en Etapa 3 es exponer APIs reales para el ecosistema y consumir las APIs reales de las otras apps cuando el flujo lo requiera.

---

## APIs que Payments App expone

Estos endpoints forman parte del contrato activo de integracion de Payments App:

```http
GET /api/payments/pricing-estimate
POST /api/payments/reservations/:reservation_id/checkout
GET /api/payments/users/:user_id/credit-balance
POST /api/payments/pools/:pool_id/credit-adjustments
POST /api/payments/pools/:pool_id/settle
```

Uso esperado:

- Rider App consulta estimaciones de precio y crea checkouts;
- Rider App consulta saldo a favor;
- Driver App solicita ajustes de credito cuando cierra o cancela un pool;
- Driver App informa fin de viaje para iniciar la liquidacion.

---

## APIs externas que Payments App consume

Payments App debe consumir endpoints reales de las otras apps cuando existan y esten configurados:

```http
GET /api/pools/:pool_id/passengers?payment_status=PAID
PATCH /api/reservations/:reservation_id/payment-result
PATCH /api/reservations/:reservation_id/credit-adjustment
POST /api/pools/:pool_id/payment-denied
```

Uso esperado:

- consultar el manifiesto real de pasajeros pagados desde Rider App;
- notificar a Rider App el resultado del checkout;
- notificar a Rider App el credito generado por ajustes de ocupacion o cancelacion;
- notificar a Driver App cuando un pago rechazado obliga a corregir ocupacion o estado operativo.

La documentacion detallada de contratos y payloads sigue viviendo en `docs/03-apis.md`.

---

## Criterio sobre mocks y datos demo

En Etapa 3, los mocks de la Etapa 2 dejan de ser la fuente principal de datos del sistema.

Regla esperada:

- si existe una API real de Rider, Driver, Feedback o Payments, el flujo principal debe usar esa API real;
- los mocks o datos demo pueden mantenerse solo como soporte de desarrollo local, seed o verificacion puntual;
- cualquier comportamiento de prueba debe estar claramente identificado como no principal.

Este criterio aplica especialmente a:

- manifiestos de pasajeros;
- notificaciones de resultados de pago;
- ajustes de credito;
- liquidaciones;
- navegacion entre apps.

---

## Criterio sobre herramientas internas de prueba

Las pantallas internas, botones manuales o utilidades de verificacion pueden seguir existiendo mientras no contradigan el objetivo de integracion real.

Condicion esperada:

- deben ayudar a probar el sistema;
- no deben redefinir el contrato inter-app;
- no deben presentarse como la fuente principal del flujo de negocio;
- cuando llamen a funcionalidades del sistema, deben privilegiar endpoints reales.

---

## Criterio sobre errores de integracion

Si una app externa no responde, devuelve error o no esta correctamente configurada, el comportamiento esperado en Etapa 3 no es ocultar la falla como si la integracion hubiera sido exitosa.

La documentacion y los flujos deben asumir:

- error controlado;
- mensaje claro de integracion no disponible;
- trazabilidad suficiente para diagnostico;
- ausencia de fallback silencioso en produccion que enmascare inconsistencias.

Los fallbacks locales o de desarrollo, si existen, deben quedar claramente identificados como no principales.

---

## Flujo punta a punta demostrable

Para la defensa de Etapa 3, al menos un flujo integrado debe poder recorrerse de punta a punta.

Flujo recomendado para Payments App dentro de WeShuttle:

1. Rider App consulta precio en Payments App;
2. Rider App solicita checkout en Payments App;
3. Payments App registra el cobro y notifica a Rider App;
4. Driver App cierra el pool o informa fin de viaje;
5. Payments App consulta pasajeros pagados, genera creditos o liquida fondos segun corresponda;
6. Rider App y Driver App reflejan el resultado actualizado.

---

## Entregables esperados de Etapa 3

Para Payments App, esta etapa debe dejar documentado y demostrable que:

- la app participa del sistema integrado y ya no se presenta como servicio aislado de Etapa 2;
- los contratos de integracion publicados siguen siendo la referencia activa del repo;
- las integraciones reales con las otras webapps son el objetivo principal del sistema;
- Control Plane y Analytics Dashboard son apps transversales separadas, no reemplazos de los paneles propios;
- existe al menos un flujo de punta a punta demostrable en la defensa.
