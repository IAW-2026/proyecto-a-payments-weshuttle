# 1. Contexto y Objetivo de la Etapa 2
El objetivo de esta etapa es desarrollar la **Payments App** del proyecto WeShuttle (Tipo A) de forma completamente aislada. Esta aplicación es responsable de los precios, cobros automáticos mediante Mercado Pago, transacciones y liquidaciones a los conductores.

**Regla de Oro para el Agente (OpenCode):** La aplicación debe funcionar por sí sola. Todas las llamadas a APIs externas (Rider App, Driver App, Feedback App) **DEBEN SER MOCKEADAS o simuladas** devolviendo datos estáticos que respeten los contratos definidos, ya que las otras aplicaciones no estarán conectadas en esta etapa.

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
La aplicación debe contar con páginas y componentes reutilizables (Manejo de errores, páginas 404, validación de formularios server-side y buenas prácticas de accesibilidad).

Las vistas principales a desarrollar son:
1.  **Panel de Administración (Admin):** Gestión de datos principales (ej. Reglas de Precios/Pricing Rules) y visualización de un listado/reporte relevante (ej. Historial de Transacciones y Liquidaciones).
2.  **Vista para Pasajero (`rider`):** Interfaz para vincular y gestionar su cuenta de Mercado Pago y visualizar el detalle de pago de una reserva.
3.  **Vista para Conductor (`driver`):** Interfaz para configurar dónde quiere recibir sus pagos (cuenta de cobro) y visualizar sus liquidaciones.
*Nota: Debe implementarse búsqueda y paginación mediante parámetros en la URL en los listados que aplique*.

## 4. Modelo de Datos (Esquema de Prisma)
La base de datos es dueña absoluta de esta información. No se deben modelar datos que pertenezcan a otras apps (como Reservas o Pools), sino guardar sus IDs como referencias externas (`reservation_id`, `pool_id`).

Entidades a generar en `schema.prisma`:
* `payment_methods`: Métodos de pago vinculados por los pasajeros.
* `payout_accounts`: Cuentas de cobro configuradas por los conductores.
* `pricing_rules`: Reglas para calcular precios máximos, estimados y descuentos.
* `auto_charge_jobs`: Registro del proceso de cobros automáticos (T-1h).
* `charges`: Cobros individuales por reserva.
* `charge_discounts`: Descuentos aplicados a un cobro específico.
* `settlements`: Liquidaciones de fondos hacia los conductores.

## 5. Endpoints a Exponer (API Propia)
La Payments App debe exponer y procesar lógicamente los siguientes endpoints REST:

* `GET /api/payments/pricing-estimate`: Calcula precio máximo y estimado recibiendo `origin_lat`, `origin_lng`, `destination_id` y `current_passengers`.
* `POST /api/payments/pools/:pool_id/auto-charge`: Inicia los cobros masivos de un pool cerrado. **Lógica:** Recibe esta petición, consulta el manifiesto mockeado, ejecuta el flujo de pago en Mercado Pago Sandbox, y "notifica" (mock) los resultados.
* `POST /api/payments/pools/:pool_id/settle`: Informa el fin de viaje y liquida los fondos al `driver_user_id`.

## 6. Endpoints Externos a Mockear (Dependencias)
Durante la Etapa 2, cualquier comunicación con el exterior (salvo Mercado Pago) debe simularse mediante funciones *stub* o *mocks* de fetch.

* `GET /api/pools/:pool_id/passengers` (Hacia Rider App): Simular la obtención del manifiesto de pasajeros para procesar los cobros.
* `PATCH /api/reservations/:reservation_id/payment-result` (Hacia Rider App): Simular el aviso de pago exitoso/rechazado enviando el `effective_price` o `rejection_reason`.
* `POST /api/pools/:pool_id/payment-denied` (Hacia Driver App): Simular la notificación de que un pasajero debe ser descontado de la ocupación por fallo de pago.

## 7. Criterios de Entrega Estrictos (Checklist Cátedra)

### A. Usuarios de Prueba (Clerk)
Crear usuarios en Clerk siguiendo estrictamente este formato para la corrección:
* **Pasajero:** `rider+clerk_test@iaw.com` | Pass: `iawuser#` (Asegurar claim: `role: "rider"`)
* **Conductor:** `driver+clerk_test@iaw.com` | Pass: `iawuser#` (Asegurar claim: `role: "driver"`)
* **Administrador:** `admin+clerk_test@iaw.com` | Pass: `iawuser#` (Asegurar claim: `role: "admin"`)

### B. Datos Precargados (Seed)
La base de datos de producción **no puede estar vacía**. Se debe crear un script de `seed` en Prisma que genere un volumen razonable de información para recorrer todos los casos de uso: múltiples reglas de precio, métodos de pago vinculados, historiales de cobros (exitosos y fallidos), descuentos aplicados y liquidaciones completadas.

### C. Estructura del README.md
El README debe ser breve y mantener este orden exacto:
1.  **Link al deploy de producción** (URL de Vercel apuntando a `main`).
2.  **Listado de usuarios disponibles** para pruebas (los detallados en la sección A).
3.  **Instrucciones** necesarias para utilizar o evaluar la aplicación.
4.  **Breve descripción** del proyecto (máximo 3 o 4 párrafos).
5.  **Notas o comentarios** (decisiones de diseño, uso de Mercado Pago Sandbox, alcance del mockeo de APIs externas).
