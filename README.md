# WeShuttle - Payments App (Etapa 2)

## 1. Link al deploy de producción
[Agregar link al deploy de producción aquí]

## 2. Listado de usuarios disponibles para pruebas
A continuación, los usuarios configurados en Clerk para probar los distintos roles del sistema. La contraseña para todos es `iawuser#`.

* **Pasajeros (Rider):**
  * `rider+clerk_test@iaw.com` (Pasajero principal)
  * `rider2+clerk_test@iaw.com` (Pasajero secundario)
  * `rider_fund+clerk_test@iaw.com` (Pasajero para simular rechazo por fondos insuficientes)
* **Conductores (Driver):**
  * `driver+clerk_test@iaw.com` (Conductor principal)
  * `driver2+clerk_test@iaw.com` (Conductor secundario)
* **Administrador (Admin):**
  * `admin+clerk_test@iaw.com`

## 3. Instrucciones de uso
1. Asegurarse de configurar las variables de entorno en un archivo `.env.local` o `.env` copiando el contenido de `.env.example` y agregando un `MERCADOPAGO_ACCESS_TOKEN` de Sandbox válido, junto con las claves de Clerk.
2. Ejecutar `npm install` para instalar las dependencias.
3. Para el entorno local, ejecutar `npm run prisma:generate` y `npm run prisma:migrate` para preparar la base de datos PostgreSQL.
4. Ejecutar `npm run prisma:seed` (o `npx prisma db seed`) para poblar la base de datos con un volumen robusto de datos de prueba (reglas de precio, cuentas vinculadas, historial de viajes, transacciones y liquidaciones).
5. Levantar el entorno de desarrollo con `npm run dev` y acceder a `http://localhost:3000`.
6. **Cobro Automático:** Para disparar un cobro masivo simulado, se puede realizar una petición `POST` al endpoint `/api/payments/pools/[pool_id]/auto-charge` enviando `departure_time` y `current_passengers` en el body.

## 4. Breve descripción del proyecto
WeShuttle es una plataforma de transporte optimizada para nodos industriales mediante servicios de carpooling programado. Esta aplicación, "Payments App", es un microservicio Full-Stack desarrollado en Next.js (App Router) encargado de aislar y centralizar toda la lógica financiera, de cobros y liquidaciones del ecosistema.

Durante la Etapa 2, la aplicación funciona de manera aislada. Recibe las intenciones de cobro o cálculo de precios y simula la interacción con las aplicaciones de Pasajero y Conductor utilizando *mocks* (funciones stub). Su núcleo operativo es el procesamiento de los cobros masivos en diferido (T-1h) de los pools cerrados, donde se aplican reglas de precio dinámicas y descuentos automáticos por ocupación.

El sistema permite a los administradores gestionar estas reglas de precio y auditar el historial financiero mediante un Dashboard. A su vez, los pasajeros pueden gestionar sus medios de pago (Mercado Pago) y revisar el detalle de sus cargos efectivos, mientras que los conductores configuran sus cuentas de cobro (CVU/Alias) y revisan las liquidaciones realizadas por sus servicios completados.

## 5. Notas o comentarios para la corrección
- **Integración de Mercado Pago (Sandbox):** Se implementó el SDK oficial de Mercado Pago Node.js utilizando la API de Pagos (Direct Payment Custom API). Los cobros se realizan contra el entorno Sandbox utilizando los tokens de tarjeta guardados. El usuario `rider_fund+clerk_test@iaw.com` ha sido inyectado en el *seed* con una tarjeta "fund" para forzar y probar los flujos de rechazo (INSUFFICIENT_FUNDS).
- **Búsqueda y Paginación por URL:** Se desarrollaron componentes de cliente reutilizables (`<Search />` con *debouncing* y `<Pagination />`) que leen y escriben el estado directamente en los `searchParams` de la URL sin realizar recargas completas de la página, mejorando significativamente la navegabilidad de los listados en los paneles de Administrador y Conductor.
- **Dashboard Financiero (Admin):** Se transformó la página principal de administración en un Dashboard Analítico. Utilizando consultas agregadas (`_sum`, `_count`, `groupBy`) de Prisma concurrentes, se calculan métricas vitales como el Total Recaudado, Total Liquidado y la Tasa de Éxito de los cobros en tiempo real.
- **ABM Reglas de Precio:** Se completó el ciclo ABM de las `pricing_rules` añadiendo un botón y acción de servidor para la eliminación física ("Baja física") de las mismas, sumándose a la "Baja lógica" (checkbox Activa/Inactiva) existente.
- **Aislamiento estricto:** Todas las interacciones externas hacia otras aplicaciones del ecosistema (Driver App, Rider App) se encuentran aisladas y se responden mediante promesas simuladas en el directorio `src/lib/external-apis/`.
