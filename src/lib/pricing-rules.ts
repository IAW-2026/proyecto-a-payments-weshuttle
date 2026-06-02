import { Prisma, PricingRule, PricingRuleDiscountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_CURRENCY = "ARS";
const DISTANCE_SURCHARGE_PER_KM = 35;

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

export function calculateDistanceAdjustment(distanceKm: number) {
  return roundMoney(Math.max(distanceKm, 0) * DISTANCE_SURCHARGE_PER_KM);
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
  trip?: {
    origin: Coordinates;
    destination: Coordinates;
  },
) {
  const basePrice = toNumber(rule.basePrice);
  const distanceKm = trip ? calculateDistanceKm(trip.origin, trip.destination) : 0;
  const distanceAdjustment = calculateDistanceAdjustment(distanceKm);
  const maxPrice = roundMoney(basePrice + distanceAdjustment);
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
      basePrice: roundMoney(basePrice),
      distanceAdjustment,
      distanceKm,
      estimatedDiscount,
      discountReason: "OCCUPANCY_DISCOUNT",
    },
  };
}

export async function findApplicablePricingRule(
  destinationId: string,
  currentPassengers: number,
) {
  const matchingRules = await prisma.pricingRule.findMany({
    where: {
      active: true,
      minPassengers: { lte: currentPassengers },
      maxPassengers: { gte: currentPassengers },
      OR: [{ destinationId }, { destinationId: null }],
    },
  });

  const exactMatch = matchingRules
    .filter((rule) => rule.destinationId === destinationId)
    .sort(sortByPassengerRange)[0];

  if (exactMatch) {
    return exactMatch;
  }

  return matchingRules
    .filter((rule) => rule.destinationId === null)
    .sort(sortByPassengerRange)[0] ?? null;
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
      destinationId: input.destinationId,
      ...(input.id ? { NOT: { id: input.id } } : {}),
    },
  });

  return rules.some(
    (rule) =>
      input.minPassengers <= rule.maxPassengers &&
      input.maxPassengers >= rule.minPassengers,
  );
}
