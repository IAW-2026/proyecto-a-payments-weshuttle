# WeShuttle — Payments App

Aplicación de pagos del ecosistema WeShuttle. Centraliza la lógica financiera: checkout de reservas, cobros via Mercado Pago, saldo a favor, ajustes de crédito al cierre T-1h y liquidaciones a conductores.

## Deploy

https://proyecto-a-payments-weshuttle.vercel.app/

## Flujos principales

1. **Pago de reserva:** el pasajero reserva desde Rider App → Payments App cobra el precio máximo via Mercado Pago Checkout Pro → si el pasajero tiene saldo a favor, se descuenta automáticamente del monto.
2. **Cierre de precios (T-1h):** una hora antes del viaje, Payments App calcula el precio final según la ocupación real del pool. Si el precio final es menor al pagado, la diferencia se acredita como saldo a favor para futuros viajes.
3. **Liquidación a conductores:** el administrador aprueba manualmente las liquidaciones pendientes desde su panel. La automatización de este paso queda como mejora a futuro.

## Credenciales de acceso

La contraseña para todos los usuarios es **`iawuser#`**.

| Rol | Email |
|---|---|
| Administrador | `admin+clerk_test@iaw.com` |
| Pasajero (Rider) | `rider+clerk_test@iaw.com` |
| Conductor (Driver) | `driver+clerk_test@iaw.com` |

### Usuarios adicionales

| Email | Nota |
|---|---|
| `rider2+clerk_test@iaw.com` | Pasajero adicional |
| `rider_credit+clerk_test@iaw.com` | Pasajero con saldo a favor precargado |
| `rider_denied+clerk_test@iaw.com` | Pasajero para simular pago rechazado |
| `driver2+clerk_test@iaw.com` | Conductor adicional |

### Cuenta de Mercado Pago (Sandbox)

Para completar pagos de prueba en el checkout de Mercado Pago, usar la siguiente cuenta de comprador:

| Campo | Valor |
|---|---|
| Usuario | `TESTUSER2154954778376271426` |
| Contraseña | `gekvVbOEjp` |
