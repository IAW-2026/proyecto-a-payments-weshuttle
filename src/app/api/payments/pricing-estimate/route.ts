import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { getMockDestinationById } from "@/lib/mock/destinations";
import { buildPricingEstimate, findApplicablePricingRule } from "@/lib/pricing-rules";

export const runtime = "nodejs";

function parseNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const authResult = await requireApiRole(["rider", "driver", "admin"]);

  if (!authResult.ok) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const originLat = parseNumber(searchParams.get("origin_lat"));
  const originLng = parseNumber(searchParams.get("origin_lng"));
  const destinationId = searchParams.get("destination_id")?.trim();
  const currentPassengers = parseNumber(searchParams.get("current_passengers"));

  if (
    originLat === null ||
    originLng === null ||
    !destinationId ||
    currentPassengers === null ||
    !Number.isInteger(currentPassengers) ||
    currentPassengers < 1
  ) {
    return NextResponse.json(
      {
        error: "INVALID_QUERY",
        message: "origin_lat, origin_lng, destination_id y current_passengers son obligatorios.",
      },
      { status: 400 },
    );
  }

  const rule = await findApplicablePricingRule(destinationId, currentPassengers);
  const destination = getMockDestinationById(destinationId);

  if (!destination) {
    return NextResponse.json(
      {
        error: "DESTINATION_NOT_FOUND",
        message: "No hay informacion de destino disponible para calcular el precio.",
      },
      { status: 404 },
    );
  }

  if (!rule) {
    return NextResponse.json(
      {
        error: "PRICING_RULE_NOT_FOUND",
        message: "No hay una regla de precio activa para ese destino y ocupacion.",
      },
      { status: 404 },
    );
  }

  const estimate = buildPricingEstimate(rule, {
    origin: { lat: originLat, lng: originLng },
    destination: { lat: destination.lat, lng: destination.lng },
  });

  return NextResponse.json({
    currency: estimate.currency,
    max_price: estimate.maxPrice,
    estimated_price: estimate.estimatedPrice,
    current_passengers: currentPassengers,
    pricing_detail: {
      base_price: estimate.pricingDetail.basePrice,
      distance_adjustment: estimate.pricingDetail.distanceAdjustment,
      distance_km: estimate.pricingDetail.distanceKm,
      estimated_discount: estimate.pricingDetail.estimatedDiscount,
      discount_reason: estimate.pricingDetail.discountReason,
    },
  });
}
