import { Prisma, PricingRule, PricingRuleDiscountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_CURRENCY = "ARS";

export type Coordinates = {
  lat: number;
  lng: number;
};

function sortByPassengerRange(a: PricingRule, b: PricingRule) {
  if (a.minPassengers !== b.minPassengers) {
    return a.minPassengers - b.minPassengers;
  }

  return a.maxPassengers - b.maxPassengers;
}

function toNumber(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toNumber();
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(origin: Coordinates, destination: Coordinates) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const destinationLat = toRadians(destination.lat);
  const haversineA =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(deltaLng / 2) ** 2;
  const haversineC = 2 * Math.atan2(Math.sqrt(haversineA), Math.sqrt(1 - haversineA));

  return roundMoney(earthRadiusKm * haversineC);
}

export async function getPricePerKm(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "price_per_km" },
  });
  return setting ? parseFloat(setting.value) : 35;
}

export function calculateDistanceAdjustment(distanceKm: number) {
  // Kept for backward compatibility, returns 0 since surcharge is no longer separate
  if (distanceKm) {}
  return 0;
}

export function calculateDiscountAmount(
  basePrice: number,
  discountType: PricingRuleDiscountType,
  discountValue: number,
) {
  if (discountType === "PERCENTAGE") {
    return roundMoney((basePrice * discountValue) / 100);
  }

  return roundMoney(Math.min(basePrice, discountValue));
}

export function buildPricingEstimate(
  rule: PricingRule,
  pricePerKm: number,
  trip?: {
    origin: Coordinates;
    destination: Coordinates;
  },
) {
  const distanceKm = trip ? calculateDistanceKm(trip.origin, trip.destination) : 0;
  const basePrice = roundMoney(distanceKm * pricePerKm);
  const maxPrice = basePrice;
  const discountValue = toNumber(rule.discountValue);
  const estimatedDiscount = calculateDiscountAmount(
    maxPrice,
    rule.discountType,
    discountValue,
  );

  return {
    currency: DEFAULT_CURRENCY,
    maxPrice,
    estimatedPrice: roundMoney(Math.max(maxPrice - estimatedDiscount, 0)),
    pricingDetail: {
      basePrice,
      distanceAdjustment: 0,
      distanceKm,
      pricePerKm,
      estimatedDiscount,
      discountReason: "OCCUPANCY_DISCOUNT",
    },
  };
}

export async function findApplicablePricingRule(
  destinationId: string | null, // Kept signature compatibility
  currentPassengers: number,
) {
  const matchingRules = await prisma.pricingRule.findMany({
    where: {
      active: true,
      minPassengers: { lte: currentPassengers },
      maxPassengers: { gte: currentPassengers },
      destinationId: null, // Only global rules
    },
  });

  return matchingRules.sort(sortByPassengerRange)[0] ?? null;
}

export async function hasConflictingPricingRule(input: {
  id?: string;
  destinationId: string | null;
  minPassengers: number;
  maxPassengers: number;
}) {
  const rules = await prisma.pricingRule.findMany({
    where: {
      active: true,
      destinationId: null, // Only global rules
      ...(input.id ? { NOT: { id: input.id } } : {}),
    },
  });

  return rules.some(
    (rule) =>
      input.minPassengers <= rule.maxPassengers &&
      input.maxPassengers >= rule.minPassengers,
  );
}

