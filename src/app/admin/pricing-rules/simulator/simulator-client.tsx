"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatMoney } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { AlertBanner } from "@/components/ui/alert-banner";

type MockDestination = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

type EstimateDetail = {
  base_price: number;
  distance_adjustment: number;
  distance_km: number;
  estimated_discount: number;
  discount_reason: string;
};

type EstimateResponse = {
  currency: string;
  max_price: number;
  estimated_price: number;
  current_passengers: number;
  pricing_detail: EstimateDetail;
};

const ORIGIN_PRESETS = [
  { name: "Preset: Av. Alem 1250", address: "Av. Alem 1250, Bahía Blanca", lat: -38.718, lng: -62.266 },
  { name: "Preset: Sarmiento 850", address: "Sarmiento 850, Bahía Blanca", lat: -38.713, lng: -62.261 },
  { name: "Preset: Brown 510", address: "Brown 510, Bahía Blanca", lat: -38.7214, lng: -62.2721 },
  { name: "Preset: 11 de Abril 430", address: "11 de Abril 430, Bahía Blanca", lat: -38.7172, lng: -62.2762 },
  { name: "Preset: Rondeau 120", address: "Rondeau 120, Bahía Blanca", lat: -38.7145, lng: -62.2694 },
  { name: "Preset: Vieytes 245", address: "Vieytes 245, Bahía Blanca", lat: -38.7164, lng: -62.2712 },
];

export function PricingSimulatorClient({ destinations }: { destinations: MockDestination[] }) {
  const [isPending, startTransition] = useTransition();

  // Form State
  const [destinationId, setDestinationId] = useState<string>(destinations[0]?.id || "");
  const [originLat, setOriginLat] = useState<string>("-38.718");
  const [originLng, setOriginLng] = useState<string>("-62.266");
  const [passengers, setPassengers] = useState<number>(5);

  // Geocoding State
  const [addressSearch, setAddressSearch] = useState<string>("");
  const [geocodingMsg, setGeocodingMsg] = useState<{ text: string; tone: "success" | "danger" | "info" } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  // Result and Error States
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handlers
  const handlePresetSelect = (presetIndex: string) => {
    if (presetIndex === "") return;
    const preset = ORIGIN_PRESETS[Number(presetIndex)];
    if (preset) {
      setOriginLat(preset.lat.toString());
      setOriginLng(preset.lng.toString());
      setAddressSearch(preset.address);
      setGeocodingMsg({ text: `Preset cargado: ${preset.address}`, tone: "success" });
    }
  };

  const handleGeocode = async () => {
    if (!addressSearch.trim()) {
      setGeocodingMsg({ text: "Por favor, escribe una dirección.", tone: "danger" });
      return;
    }

    setIsGeocoding(true);
    setGeocodingMsg({ text: "Buscando coordenadas...", tone: "info" });

    try {
      // Limit to Bahia Blanca to narrow down results
      const query = `${addressSearch}, Bahia Blanca, Buenos Aires, Argentina`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        headers: {
          "Accept-Language": "es",
          "User-Agent": "WeShuttle-Payments-Simulator",
        },
      });

      if (!response.ok) {
        throw new Error("Error en servicio de mapa.");
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setOriginLat(Number(lat).toFixed(6));
        setOriginLng(Number(lon).toFixed(6));
        setGeocodingMsg({
          text: `Encontrado: ${display_name.split(",").slice(0, 2).join(",")}`,
          tone: "success"
        });
      } else {
        setGeocodingMsg({
          text: "No se encontró la dirección. Intenta agregando 'Bahia Blanca' o especificando altura.",
          tone: "danger"
        });
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setGeocodingMsg({
        text: "Error al conectar con el servidor de geolocalización.",
        tone: "danger"
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleCalculate = async () => {
    setErrorMsg(null);
    setResult(null);

    // Basic frontend validations
    const latNum = Number(originLat);
    const lngNum = Number(originLng);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setErrorMsg("La latitud de origen debe ser un número entre -90 y 90.");
      return;
    }

    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setErrorMsg("La longitud de origen debe ser un número entre -180 y 180.");
      return;
    }

    if (!destinationId) {
      setErrorMsg("Por favor, selecciona un destino.");
      return;
    }

    if (passengers < 1 || !Number.isInteger(passengers)) {
      setErrorMsg("La ocupación actual del pool debe ser un número entero mayor o igual a 1.");
      return;
    }

    startTransition(async () => {
      try {
        const queryParams = new URLSearchParams({
          origin_lat: latNum.toString(),
          origin_lng: lngNum.toString(),
          destination_id: destinationId,
          current_passengers: passengers.toString(),
        });

        const response = await fetch(`/api/payments/pricing-estimate?${queryParams.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          setErrorMsg(data.message || `Error del servidor (${response.status})`);
          return;
        }

        setResult(data);
      } catch (err) {
        console.error("Estimate calculation error:", err);
        setErrorMsg("Ocurrió un error inesperado al conectar con el endpoint de Payments App.");
      }
    });
  };

  const selectedDest = destinations.find(d => d.id === destinationId);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner / Navigation back link */}
      <div className="flex justify-between items-center">
        <Link
          href="/admin/pricing-rules"
          className="inline-flex items-center gap-2 rounded-full border border-slate-350 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:border-slate-900 transition"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Volver a Reglas de Tarifas
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form panel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <SectionCard>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Parámetros del Viaje</h3>

            <div className="space-y-4">
              {/* Destination */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Destino del Pool
                </label>
                <select
                  value={destinationId}
                  onChange={(e) => {
                    setDestinationId(e.target.value);
                    setResult(null);
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition"
                >
                  <option value="">-- Elige un destino --</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.address.split(",")[0]})
                    </option>
                  ))}
                </select>
                {selectedDest && (
                  <p className="mt-1.5 text-xs text-slate-400 font-mono">
                    Coord. Destino: {selectedDest.lat}, {selectedDest.lng}
                  </p>
                )}
              </div>

              {/* Presets and Geocoding */}
              <div className="border-t border-slate-100 pt-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Ubicación de Origen
                </label>

                {/* Presets dropdown */}
                <select
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  defaultValue=""
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none transition mb-3"
                >
                  <option value="">-- Cargar un preset de origen --</option>
                  {ORIGIN_PRESETS.map((preset, idx) => (
                    <option key={idx} value={idx}>
                      {preset.name}
                    </option>
                  ))}
                </select>

                {/* Text geocoder */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Escribir dirección (ej. Vieytes 245)"
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleGeocode();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleGeocode}
                    disabled={isGeocoding}
                    className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition duration-150 disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {isGeocoding ? "Buscando..." : "Buscar"}
                  </button>
                </div>

                {geocodingMsg && (
                  <div className={`mt-2 text-xs font-medium rounded-lg p-2 ${geocodingMsg.tone === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : geocodingMsg.tone === "danger"
                        ? "bg-rose-50 text-rose-700 border border-rose-100"
                        : "bg-blue-50 text-blue-700 border border-blue-100"
                    }`}>
                    {geocodingMsg.text}
                  </div>
                )}
              </div>

              {/* Lat/Lng Coords manual input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Latitud Origen
                  </label>
                  <input
                    type="text"
                    value={originLat}
                    onChange={(e) => {
                      setOriginLat(e.target.value);
                      setResult(null);
                    }}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Longitud Origen
                  </label>
                  <input
                    type="text"
                    value={originLng}
                    onChange={(e) => {
                      setOriginLng(e.target.value);
                      setResult(null);
                    }}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Occupancy passengers */}
              <div className="border-t border-slate-100 pt-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Ocupación Actual (Pasajeros en el Pool)
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={passengers}
                    onChange={(e) => {
                      setPassengers(Number(e.target.value));
                      setResult(null);
                    }}
                    className="flex-1 accent-sky-600"
                  />
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={passengers}
                    onChange={(e) => {
                      setPassengers(Math.max(1, parseInt(e.target.value) || 1));
                      setResult(null);
                    }}
                    className="w-16 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-center text-xs font-bold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  La cantidad de pasajeros define cuál regla de precios (rango) se aplicará al cotizar.
                </p>
              </div>

              {/* Submit button */}
              <button
                type="button"
                onClick={handleCalculate}
                disabled={isPending}
                className="mt-4 w-full rounded-full bg-sky-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-600/15 hover:bg-sky-500 hover:scale-[1.01] active:scale-[0.99] transition duration-200 disabled:opacity-70 disabled:scale-100 cursor-pointer"
              >
                {isPending ? "Calculando Tarifa..." : "Calcular precio estimado"}
              </button>
            </div>
          </SectionCard>
        </div>

        {/* Output panel */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Error panel */}
          {errorMsg && (
            <AlertBanner tone="danger">
              <div className="flex flex-col gap-1">
                <span className="font-bold">Error de Cálculo</span>
                <span className="text-xs font-medium leading-relaxed">{errorMsg}</span>
              </div>
            </AlertBanner>
          )}

          {/* Result cards */}
          {result ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Primary Price comparison cards */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Max Price card */}
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Precio Máximo
                  </span>
                  <span className="text-3xl font-extrabold text-slate-800 mt-2 block">
                    {formatMoney(result.max_price, result.currency)}
                  </span>
                  <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                    Representa lo máximo que el usuario podría pagar. Es la tarifa calculada con el recargo de distancia máximo posible. El cobro del checkout original se realizará por este monto.
                  </p>
                </div>

                {/* Estimated Price card */}
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/20 p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                      Precio Estimado
                    </span>
                    <span className="rounded-full bg-emerald-100 border border-emerald-250 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                      {result.current_passengers} pasajeros
                    </span>
                  </div>
                  <span className="text-3xl font-extrabold text-emerald-600 mt-2 block animate-pulse">
                    {formatMoney(result.estimated_price, result.currency)}
                  </span>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    Es la estimación de lo que el pasajero pagará de forma final según la ocupación actual del pool. Si califica para descuento, la diferencia respecto al precio máximo se reembolsará en créditos.
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <SectionCard>
                <h4 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
                  Desglose Técnico del Cálculo
                </h4>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500 font-medium">Precio base de regla:</span>
                    <span className="font-semibold text-slate-850">
                      {formatMoney(result.pricing_detail.base_price, result.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500 font-medium">Distancia calculada:</span>
                    <span className="font-semibold text-slate-850">
                      {result.pricing_detail.distance_km} km
                    </span>
                  </div>

                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-500 font-medium">Recargo por distancia ($35/km):</span>
                    <span className="font-semibold text-slate-850">
                      +{formatMoney(result.pricing_detail.distance_adjustment, result.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between py-2.5 font-bold border-t border-slate-200 mt-1 pt-3">
                    <span className="text-slate-800">Tarifa tope (Max price):</span>
                    <span className="text-slate-900">
                      {formatMoney(result.max_price, result.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between py-2.5 text-emerald-600 font-medium">
                    <span>Descuento estimado por ocupación:</span>
                    <span className="font-bold">
                      -{formatMoney(result.pricing_detail.estimated_discount, result.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between py-2.5 text-[10px] text-slate-400 bg-slate-50 px-2 rounded-lg mt-1.5">
                    <span>Motivo del descuento aplicado:</span>
                    <span className="font-mono">{result.pricing_detail.discount_reason}</span>
                  </div>
                </div>
              </SectionCard>

              {/* Explanatory notice */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-700">¿Cómo funciona esta lógica en producción?</p>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>El **Precio Máximo** es cobrado al pasajero en Mercado Pago cuando realiza la reserva. De esta forma, el cobro inicial está garantizado.</li>
                  <li>El **Precio Estimado** es informativo y cambia en tiempo real para el rider en su App a medida que más pasajeros se suman al pool del viaje.</li>
                  <li>El precio final definitivo se calcula **1 hora antes de la salida (T-1h)** al cerrar el pool. Si el precio final resulta menor que el Precio Máximo cobrado originalmente, la diferencia se acredita automáticamente como **saldo a favor** en la billetera virtual del rider.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center text-slate-450 h-full flex flex-col justify-center items-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-slate-350 mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <h4 className="text-sm font-bold text-slate-700">Sin estimación calculada</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Configura los parámetros del viaje en el formulario de la izquierda y presiona en &quot;Calcular precio estimado&quot; para obtener los detalles tarifarios.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
