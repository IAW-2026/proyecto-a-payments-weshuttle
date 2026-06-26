import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePdfReport, generateExcelReport } from "@/lib/report-generator";
import { formatMoney, formatDateTime, humanizeStatus } from "@/components/ui/format";
import { humanizeMovement } from "@/app/rider/rider-data";
import { getMockDestinationById } from "@/lib/mock/destinations";
import { type AppRole } from "@/lib/clerk-roles";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ role: string; section: string }> }
) {
  const { role, section } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "pdf";

  const allowedRoles: readonly AppRole[] = role === "admin" ? ["admin"] : role === "driver" ? ["driver"] : ["rider"];
  const auth = await requireApiRole(allowedRoles);
  if (!auth.ok) {
    return auth.response;
  }

  let title = "";
  let subtitle = "";
  let metrics: { label: string; value: string | number }[] = [];
  let tables: { title: string; headers: string[]; rows: string[][]; weights?: number[] }[] = [];
  let sheets: { name: string; data: Record<string, unknown>[] }[] = [];

  const clerkUserId = auth.context.clerkUserId ?? "";

  if (role === "rider") {
    if (section === "payments") {
      const recentCheckouts = await prisma.checkoutSession.findMany({
        where: { passengerUserId: clerkUserId },
        orderBy: { createdAt: "desc" },
      });

      title = "Historial de Pagos";
      subtitle = `Usuario Pasajero: ${clerkUserId}`;
      metrics = [
        { label: "Cantidad de Pagos", value: recentCheckouts.length },
      ];

      tables = [
        {
          title: "Historial de Pagos",
          headers: ["ID Sesion", "ID Reserva", "Monto a Cobrar", "Credito Aplicado", "Estado", "Fecha"],
          rows: recentCheckouts.map((c) => [
            c.id,
            c.reservationId,
            formatMoney(c.amountToCharge.toNumber(), c.currency),
            formatMoney(c.creditApplied.toNumber(), c.currency),
            humanizeStatus(c.status),
            formatDateTime(c.createdAt),
          ]),
          weights: [1.8, 1.2, 1.2, 1.2, 1, 1.6],
        },
      ];

      sheets = [
        {
          name: "Historial de Pagos",
          data: recentCheckouts.map((c) => ({
            "ID Sesión": c.id,
            "ID Reserva": c.reservationId,
            "ID Pool (Viaje)": c.poolId,
            "Monto a Cobrar": c.amountToCharge.toNumber(),
            "Monto Crédito Aplicado": c.creditApplied.toNumber(),
            "Monto Máximo Permitido": c.maxPrice.toNumber(),
            Moneda: c.currency,
            Estado: humanizeStatus(c.status),
            "Creado El": c.createdAt.toLocaleString("es-AR"),
          })),
        },
      ];
    } else if (section === "balance") {
      const [creditAccount, recentMovements] = await Promise.all([
        prisma.creditAccount.findUnique({
          where: { userId: clerkUserId },
        }),
        prisma.creditMovement.findMany({
          where: { userId: clerkUserId },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      title = "Movimientos de Saldo";
      subtitle = `Usuario Pasajero: ${clerkUserId}`;
      metrics = [
        { label: "Saldo Disponible", value: formatMoney(creditAccount?.balance.toNumber() || 0, creditAccount?.currency || "ARS") },
        { label: "Cantidad de Movimientos", value: recentMovements.length },
      ];

      tables = [
        {
          title: "Movimientos de Saldo",
          headers: ["ID Movimiento", "Tipo", "Monto", "Descripcion", "Fecha"],
          rows: recentMovements.map((m) => [
            m.id,
            humanizeMovement(m.type),
            formatMoney(m.amount.toNumber(), m.currency),
            m.description || "N/A",
            formatDateTime(m.createdAt),
          ]),
          weights: [1.8, 1.6, 1, 2.2, 1.4],
        },
      ];

      sheets = [
        {
          name: "Movimientos de Saldo",
          data: recentMovements.map((m) => ({
            "ID Movimiento": m.id,
            Tipo: humanizeMovement(m.type),
            Monto: m.amount.toNumber(),
            Moneda: m.currency,
            Descripción: m.description || "N/A",
            "ID Reserva Relacionada": m.reservationId || "N/A",
            "ID Pool Relacionado": m.poolId || "N/A",
            "Creado El": m.createdAt.toLocaleString("es-AR"),
          })),
        },
      ];
    }
  } else if (role === "driver") {
    if (section === "trips") {
      const settlements = await prisma.settlement.findMany({
        where: { driverUserId: clerkUserId },
        orderBy: [{ settledAt: "desc" }, { id: "desc" }],
      });

      title = "Historial de Viajes Realizados";
      subtitle = `Usuario Conductor: ${clerkUserId}`;
      metrics = [
        { label: "Viajes Realizados", value: settlements.length },
      ];

      tables = [
        {
          title: "Historial de Viajes Realizados",
          headers: ["ID Viaje (Pool)", "Ganancia Estimada", "Estado de Cobro", "Fecha Cierre"],
          rows: settlements.map((s) => [
            s.poolId,
            formatMoney(s.amount.toNumber(), s.currency),
            s.status === "COMPLETED" ? "Cobrado" : "Pendiente",
            s.settledAt ? formatDateTime(s.settledAt) : "Pendiente",
          ]),
          weights: [1.8, 1.2, 1, 1.8],
        },
      ];

      sheets = [
        {
          name: "Viajes Realizados",
          data: settlements.map((s) => ({
            "ID Pool (Viaje)": s.poolId,
            "Monto (Ganancia Estimada)": s.amount.toNumber(),
            Moneda: s.currency,
            Estado: s.status === "COMPLETED" ? "Cobrado" : "Pendiente",
            "Finalizado El": s.settledAt ? s.settledAt.toLocaleString("es-AR") : "Pendiente",
          })),
        },
      ];
    } else if (section === "settlements") {
      const settlements = await prisma.settlement.findMany({
        where: { driverUserId: clerkUserId },
        orderBy: [{ settledAt: "desc" }, { id: "desc" }],
      });

      title = "Historial de Cobros";
      subtitle = `Usuario Conductor: ${clerkUserId}`;
      metrics = [
        { label: "Total Transferido", value: formatMoney(settlements.filter(s => s.status === "COMPLETED").reduce((sum, s) => sum + s.amount.toNumber(), 0), "ARS") },
      ];

      tables = [
        {
          title: "Historial de Cobros",
          headers: ["ID Liquidacion", "ID Viaje (Pool)", "Monto Depositado", "Estado Pago", "Fecha Pago"],
          rows: settlements.map((s) => [
            s.id,
            s.poolId,
            formatMoney(s.amount.toNumber(), s.currency),
            s.status === "COMPLETED" ? "Acreditado" : "Pendiente",
            s.settledAt ? formatDateTime(s.settledAt) : "Pendiente",
          ]),
          weights: [2, 1.5, 1.2, 1, 1.8],
        },
      ];

      sheets = [
        {
          name: "Historial de Cobros",
          data: settlements.map((s) => ({
            "ID Liquidacion": s.id,
            "ID Pool (Viaje)": s.poolId,
            "ID Cuenta de Cobro": s.payoutAccountId || "N/A",
            Monto: s.amount.toNumber(),
            Moneda: s.currency,
            Estado: s.status === "COMPLETED" ? "Acreditado" : "Pendiente",
            "Liquidado El": s.settledAt ? s.settledAt.toLocaleString("es-AR") : "Pendiente",
          })),
        },
      ];
    }
  } else if (role === "admin") {
    if (section === "checkouts") {
      const charges = await prisma.charge.findMany({
        orderBy: { createdAt: "desc" },
      });

      title = "Historial de Cobros";
      subtitle = "Auditoría global de cargos a pasajeros.";
      metrics = [
        { label: "Transacciones Totales", value: charges.length },
      ];

      tables = [
        {
          title: "Historial de Cobros",
          headers: ["ID Cobro", "ID Reserva", "Monto Cobrado", "Estado", "Procesado El"],
          rows: charges.map((c) => [
            c.id,
            c.reservationId,
            formatMoney(c.amountCharged.toNumber(), c.currency),
            humanizeStatus(c.status),
            formatDateTime(c.processedAt),
          ]),
          weights: [2, 1.2, 1.3, 1, 1.5],
        },
      ];

      sheets = [
        {
          name: "Historial de Cobros",
          data: charges.map((c) => ({
            "ID Cobro": c.id,
            "Transaccion Ref": c.transactionId,
            "ID Reserva": c.reservationId,
            "ID Pool (Viaje)": c.poolId,
            "ID Pasajero": c.passengerUserId,
            "Monto Recaudado": c.amountCharged.toNumber(),
            "Monto Credito Aplicado": c.creditApplied.toNumber(),
            Moneda: c.currency,
            Estado: humanizeStatus(c.status),
            "Procesado El": c.processedAt ? c.processedAt.toLocaleString("es-AR") : "No procesado",
          })),
        },
      ];
    } else if (section === "credits") {
      const creditMovements = await prisma.creditMovement.findMany({
        orderBy: { createdAt: "desc" },
      });

      title = "Movimientos Recientes de Saldo";
      subtitle = "Auditoría de saldo a favor de pasajeros.";
      metrics = [
        { label: "Movimientos Registrados", value: creditMovements.length },
      ];

      tables = [
        {
          title: "Movimientos Recientes de Saldo",
          headers: ["ID Movimiento", "ID Usuario", "Tipo", "Monto", "Fecha"],
          rows: creditMovements.map((m) => [
            m.id,
            m.userId,
            m.type === "CREDIT_GRANTED" ? "Devolución" : m.type === "CREDIT_APPLIED" ? "Aplicado" : "Ajuste",
            formatMoney(m.amount.toNumber(), m.currency),
            formatDateTime(m.createdAt),
          ]),
          weights: [1.8, 1.6, 1.4, 1, 1.4],
        },
      ];

      sheets = [
        {
          name: "Movimientos de Saldo",
          data: creditMovements.map((m) => ({
            "ID Movimiento": m.id,
            "ID Usuario": m.userId,
            Tipo: m.type === "CREDIT_GRANTED" ? "Devolucion" : m.type === "CREDIT_APPLIED" ? "Aplicado" : "Ajuste",
            Monto: m.amount.toNumber(),
            Moneda: m.currency,
            Descripcion: m.description || "N/A",
            "Creado El": m.createdAt.toLocaleString("es-AR"),
          })),
        },
      ];
    } else if (section === "pricing-rules") {
      const pricingRules = await prisma.pricingRule.findMany({
        orderBy: [{ active: "desc" }, { minPassengers: "asc" }],
      });

      title = "Listado de Reglas de Precios";
      subtitle = "Esquema tarifario general de WeShuttle.";
      metrics = [
        { label: "Reglas Totales", value: pricingRules.length },
      ];

      tables = [
        {
          title: "Listado de Reglas de Precios",
          headers: ["ID Regla", "Destino", "Precio Base", "Pasajeros (Min-Max)", "Descuento", "Estado"],
          rows: pricingRules.map((r) => [
            r.id,
            r.destinationId ? (getMockDestinationById(r.destinationId)?.name || r.destinationId) : "Global / Todos",
            formatMoney(r.basePrice.toNumber(), "ARS"),
            `${r.minPassengers} - ${r.maxPassengers}`,
            r.discountValue.toNumber() > 0
              ? `${r.discountType === "PERCENTAGE" ? `${r.discountValue.toNumber()}%` : `$${r.discountValue.toNumber()}`}`
              : "Sin desc.",
            r.active ? "Activa" : "Inactiva",
          ]),
          weights: [1, 1.8, 1.1, 1.3, 1.4, 0.8],
        },
      ];

      sheets = [
        {
          name: "Reglas de Precios",
          data: pricingRules.map((r) => ({
            "ID Regla": r.id,
            Destino: r.destinationId ? (getMockDestinationById(r.destinationId)?.name || r.destinationId) : "Global / Todos",
            "Precio Base": r.basePrice.toNumber(),
            "Min. Pasajeros": r.minPassengers,
            "Max. Pasajeros": r.maxPassengers,
            "Tipo Descuento": r.discountType,
            "Monto Descuento": r.discountValue.toNumber(),
            Estado: r.active ? "Activo" : "Inactivo",
          })),
        },
      ];
    } else if (section === "settlements") {
      const settlements = await prisma.settlement.findMany({
        orderBy: { settledAt: "desc" },
      });

      title = "Pagos a los Choferes";
      subtitle = "Liquidaciones a conductores.";
      metrics = [
        { label: "Liquidaciones Totales", value: settlements.length },
      ];

      tables = [
        {
          title: "Pagos a los Choferes",
          headers: ["ID Liquidación", "ID Pool", "ID Chofer", "Monto", "Estado", "Fecha Pago"],
          rows: settlements.map((s) => [
            s.id,
            s.poolId,
            s.driverUserId,
            formatMoney(s.amount.toNumber(), s.currency),
            humanizeStatus(s.status),
            s.settledAt ? formatDateTime(s.settledAt) : "Pendiente",
          ]),
          weights: [1.8, 1.4, 1.4, 1, 1, 1.4],
        },
      ];

      sheets = [
        {
          name: "Pagos a Choferes",
          data: settlements.map((s) => ({
            "ID Liquidacion": s.id,
            "ID Pool (Viaje)": s.poolId,
            "ID Conductor": s.driverUserId,
            Monto: s.amount.toNumber(),
            Moneda: s.currency,
            Estado: humanizeStatus(s.status),
            "Liquidado El": s.settledAt ? s.settledAt.toLocaleString("es-AR") : "Pendiente",
          })),
        },
      ];
    } else if (section === "pools") {
      const pricingJobs = await prisma.poolPriceFinalizationJob.findMany({
        orderBy: { startedAt: "desc" },
      });

      title = "Actividad de Cierre de Viajes";
      subtitle = "Historial del procesador final de tarifas.";
      metrics = [
        { label: "Cierres Procesados", value: pricingJobs.length },
      ];

      tables = [
        {
          title: "Actividad de Cierre de Viajes",
          headers: ["ID Cierre", "ID Pool", "Pasajeros", "P. Base", "P. Final", "Descuento", "Estado"],
          rows: pricingJobs.map((j) => [
            j.id,
            j.poolId,
            String(j.currentPassengers),
            formatMoney(j.basePrice.toNumber(), j.currency),
            j.finalPrice ? formatMoney(j.finalPrice.toNumber(), j.currency) : "Pendiente",
            j.discountValue && j.discountValue.toNumber() > 0
              ? `${j.discountType === "OCCUPANCY_DISCOUNT" ? "Ocupación" : "Chofer"}: -${formatMoney(j.discountValue.toNumber(), j.currency)}`
              : "Ninguno",
            humanizeStatus(j.status),
          ]),
          weights: [1.2, 1.2, 0.8, 0.8, 0.8, 1.2, 0.8],
        },
      ];

      sheets = [
        {
          name: "Cierre de Viajes",
          data: pricingJobs.map((j) => ({
            "ID Proceso": j.id,
            "ID Pool (Viaje)": j.poolId,
            "Cant. Pasajeros": j.currentPassengers,
            "Precio Base": j.basePrice.toNumber(),
            "Precio Final": j.finalPrice ? j.finalPrice.toNumber() : null,
            "Tipo Descuento": j.discountType || "Ninguno",
            "Monto Descuento": j.discountValue ? j.discountValue.toNumber() : 0,
            Estado: humanizeStatus(j.status),
            "Iniciado El": j.startedAt.toLocaleString("es-AR"),
          })),
        },
      ];
    }
  }

  if (format === "pdf") {
    const pdfBuffer = generatePdfReport({ title, subtitle, metrics, tables });
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reporte-${role}-${section}.pdf"`,
      },
    });
  } else {
    const excelBuffer = generateExcelReport(sheets);
    return new Response(new Uint8Array(excelBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reporte-${role}-${section}.xlsx"`,
      },
    });
  }
}
