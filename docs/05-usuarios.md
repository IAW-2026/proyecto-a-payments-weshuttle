# 1.5 — Usuarios Compartidos

> **Tipo A — Plataforma de Transporte (WeShuttle)**

El sistema utiliza **Clerk** como servicio centralizado de autenticación.

Los usuarios se autentican a través de Clerk independientemente de qué aplicación estén usando, y la identidad se propaga entre servicios mediante el token JWT emitido por Clerk.

Cada webapp mantiene sus propios datos de dominio en su base de datos, pero utiliza el identificador de Clerk como referencia común para reconocer al mismo usuario entre aplicaciones.

El identificador compartido entre todas las apps es:

```text
clerk_user_id
```

Este identificador corresponde al claim estándar:

```text
sub
```

---

## ¿Qué apps comparten usuarios?

| Usuario | Apps donde puede autenticarse | Descripción |
|---------|------------------------------|-------------|
| **Empleado / Pasajero (`rider`)** | Rider App, Payments App, Feedback App | Puede solicitar viajes, reservar lugares en pools, configurar su método de pago, pagar automáticamente y calificar al conductor al finalizar el viaje. |
| **Conductor (`driver`)** | Driver App, Payments App, Feedback App | Puede aceptar pools desde el marketplace, gestionar el recorrido, configurar su cuenta de cobro, recibir liquidaciones y calificar pasajeros. |
| **Administrador (`admin`)** | Rider App, Driver App, Payments App, Feedback App y posteriormente Control Plane | Puede gestionar datos principales, consultar listados, revisar reportes y administrar operaciones del sistema. |

---

## Roles del sistema

Los roles principales del sistema son:

```text
rider
driver
admin
```

### `rider`

Representa a un empleado industrial que utiliza la plataforma como pasajero.

Permisos principales:

- acceder a Rider App;
- solicitar viajes;
- crear reservas;
- visualizar estado del viaje;
- configurar método de pago desde Payments App;
- visualizar pagos asociados a sus viajes;
- completar reseñas desde Feedback App;
- visualizar su promedio de calificaciones y reportes recibidos según corresponda.

---

### `driver`

Representa a un conductor habilitado para realizar viajes.

Permisos principales:

- acceder a Driver App;
- visualizar pools disponibles en el marketplace;
- aceptar viajes;
- actualizar el estado operativo del viaje;
- configurar cuenta de cobro desde Payments App;
- recibir liquidaciones;
- completar reseñas a pasajeros desde Feedback App;
- visualizar su promedio de calificaciones y reportes recibidos según corresponda.

---

### `admin`

Representa a un usuario con permisos administrativos.

Permisos principales:

- acceder a las aplicaciones para tareas de gestión;
- gestionar datos maestros;
- consultar listados y reportes;
- revisar reportes de moderación;
- administrar conductores, pasajeros, destinos y otros datos operativos según corresponda.

---

## Claims del JWT relevantes

Los siguientes claims deben estar disponibles en el JWT utilizado por las aplicaciones.

| Claim | Tipo | Descripción |
|------|------|-------------|
| `sub` | string | Identificador único del usuario en Clerk. Se utiliza como `clerk_user_id` en las bases de datos locales. |
| `role` | string | Rol principal del usuario dentro del sistema. Valores posibles: `rider`, `driver`, `admin`. |
| `company_code` | string, nullable | Código de empresa o pertenencia industrial del usuario. Aplica principalmente a usuarios con rol `rider`. |
| `email` | string | Email del usuario. Puede utilizarse para mostrar información básica o tareas administrativas. |
| `name` | string | Nombre del usuario. Puede utilizarse para mostrar información básica en la interfaz. |

---

## Claims utilizados por cada app

| App | Claims utilizados | Para qué se utilizan |
|-----|------------------|----------------------|
| **Rider App** | `sub`, `role`, `company_code` | Identificar al pasajero, verificar que tenga rol `rider` o `admin`, validar pertenencia a una empresa industrial y asociar reservas al usuario. |
| **Driver App** | `sub`, `role` | Identificar al conductor, verificar que tenga rol `driver` o `admin`, y asociar pools o acciones operativas al conductor autenticado. |
| **Payments App** | `sub`, `role` | Identificar al usuario que configura un método de pago o cuenta de cobro. El rol permite distinguir si el usuario opera como pasajero, conductor o administrador. |
| **Feedback App** | `sub`, `role` | Identificar al autor de una reseña o reporte y validar si está actuando como pasajero, conductor o administrador. |
| **Control Plane** *(futuro)* | `sub`, `role` | Permitir acceso únicamente a usuarios con rol `admin`. |

---

## Configuración de Clerk

Los roles y datos compartidos se gestionan mediante metadata de Clerk.

Se propone utilizar `publicMetadata` para almacenar los datos que deben ser accesibles por las aplicaciones frontend y backend:

```json
{
  "role": "rider",
  "company_code": "empresa_001"
}
```

Ejemplo para un conductor:

```json
{
  "role": "driver"
}
```

Ejemplo para un administrador:

```json
{
  "role": "admin"
}
```

---

## Configuración del JWT Template / Session Claims

El campo `company_code` es un claim custom necesario para validar la pertenencia industrial de los empleados que utilizan la Rider App.

Este claim debe configurarse explícitamente en el JWT Template o en la configuración de Session Claims de Clerk.

No alcanza con guardar `company_code` en `publicMetadata`; debe incluirse explícitamente como claim del token para que esté disponible en las aplicaciones mediante el JWT.

Claims custom esperados en el token:

```json
{
  "role": "{{user.public_metadata.role}}",
  "company_code": "{{user.public_metadata.company_code}}"
}
```

Notas:

- `sub` es el identificador estándar del usuario en Clerk.
- `role` debe estar disponible para que cada app pueda proteger rutas y validar permisos.
- `company_code` debe estar disponible especialmente para Rider App.
- No se debe incluir todo `publicMetadata` dentro del JWT. Solo deben agregarse los campos necesarios, para evitar tokens innecesariamente grandes.

---

## Estrategia de asignación de roles

### Registro de empleados / pasajeros

Cuando un empleado se registra, debe ingresar un código corporativo o industrial válido.

Si el código es válido:

1. Se crea el usuario en Clerk.
2. Se asigna `role = "rider"`.
3. Se guarda el `company_code` correspondiente.
4. La Rider App puede crear o completar el perfil local del pasajero utilizando el `sub` del JWT como `clerk_user_id`.

---

### Registro de conductores

El conductor debe atravesar un proceso de validación antes de poder operar como driver.

Proceso esperado:

1. Se crea el usuario en Clerk.
2. Inicialmente puede quedar pendiente de validación.
3. Un administrador verifica la documentación del conductor.
4. Cuando el conductor queda aprobado, se asigna `role = "driver"`.
5. La Driver App crea o actualiza el perfil local del conductor usando `sub` como `clerk_user_id`.

La información operativa del conductor, como estado de verificación, vehículos y disponibilidad, no se guarda como claim del JWT. Esa información pertenece a la base de datos de la Driver App.

---

### Registro de administradores

Los administradores son asignados manualmente por el equipo responsable del sistema.

Proceso esperado:

1. Se crea el usuario en Clerk.
2. Se asigna `role = "admin"` desde la configuración administrativa.
3. El usuario puede acceder a las aplicaciones necesarias para tareas de gestión.

---

## Validación de acceso por app

Cada app debe validar el JWT en sus rutas protegidas.

| App | Roles permitidos |
|-----|------------------|
| **Rider App** | `rider`, `admin` |
| **Driver App** | `driver`, `admin` |
| **Payments App** | `rider`, `driver`, `admin` |
| **Feedback App** | `rider`, `driver`, `admin` |
| **Control Plane** *(futuro)* | `admin` |

---

## Identidad compartida entre servicios

Cada app utiliza el claim `sub` como identificador compartido del usuario.

Ejemplos:

- En Rider App, `sub` se guarda como `clerk_user_id` del pasajero.
- En Driver App, `sub` se guarda como `clerk_user_id` del conductor.
- En Payments App, `sub` se usa para asociar métodos de pago, cuentas de cobro, cobros y liquidaciones.
- En Feedback App, `sub` se usa para identificar autores y destinatarios de reseñas o reportes.

Las apps pueden tener perfiles locales propios, pero todos deben estar relacionados mediante `clerk_user_id`.

---

## Usuarios y datos locales por app

Aunque Clerk es la fuente de verdad de identidad, cada app puede guardar información local del usuario cuando esa información pertenece a su dominio.

| App | Datos locales asociados al usuario |
|-----|------------------------------------|
| **Rider App** | Perfil de pasajero, reservas, historial de viajes, notificaciones. |
| **Driver App** | Perfil de conductor, vehículos, pools aceptados, estado operativo. |
| **Payments App** | Métodos de pago, cuentas de cobro, transacciones, liquidaciones. |
| **Feedback App** | Reseñas, promedios de calificación, reportes. |

---

## Consistencia entre Clerk y bases locales

Clerk es la fuente de verdad de identidad y roles globales.

Las apps mantienen datos propios asociados a `clerk_user_id`.

Estrategia:

- Cada app crea o actualiza el perfil local del usuario al primer login o cuando recibe una operación relacionada con ese usuario.
- Si cambia el rol de un usuario en Clerk, las apps deben respetar el nuevo rol al validar el JWT.
- Si se modifica un claim relevante como `role` o `company_code`, el usuario debe obtener un token actualizado para que las apps vean el cambio.
- Las apps no deben asumir permisos únicamente por datos locales; siempre deben validar el JWT.

---

## Consideraciones sobre múltiples roles

En esta etapa, se define un único rol principal por usuario:

```text
role
```

Por simplicidad, un usuario opera como `rider`, `driver` o `admin`.

Si en etapas futuras se permite que un mismo usuario sea pasajero y conductor al mismo tiempo, se podrá reemplazar `role` por un arreglo de roles:

```json
{
  "roles": ["rider", "driver"]
}
```

En esta primera etapa no se modela esa complejidad.

---

## Autenticación en APIs inter-servicio

Las APIs inter-servicio deben validar autenticación.

Cuando la acción se realiza en nombre de un usuario autenticado, se debe propagar el JWT emitido por Clerk para identificarlo mediante `sub` y validar su `role`.

Cuando la acción es ejecutada por un proceso interno o automático, como el cobro automático en T-1h o una notificación entre servicios, puede utilizarse un mecanismo de autenticación inter-servicio acordado por el equipo.

En ambos casos, cada app debe verificar que la aplicación llamadora tenga permisos para ejecutar la acción solicitada.

---

## Resumen

| Concepto | Definición |
|----------|------------|
| Servicio de autenticación | Clerk |
| Identificador compartido | `sub`, usado localmente como `clerk_user_id` |
| Roles principales | `rider`, `driver`, `admin` |
| Claim industrial | `company_code` |
| Fuente de verdad de identidad | Clerk |
| Fuente de verdad de datos operativos | Cada app según su dominio |
| Estrategia de autorización | Validar JWT y rol en cada app |
| Configuración importante | `company_code` debe incluirse explícitamente en el JWT Template o Session Claims |
