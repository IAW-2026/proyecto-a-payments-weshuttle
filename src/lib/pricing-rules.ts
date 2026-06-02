import { Prisma, PricingRule, PricingRuleDiscountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_CURRENCY = "ARS";

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

export function buildPricingEstimate(rule: PricingRule) {
  const basePrice = toNumber(rule.basePrice);
  const discountValue = toNumber(rule.discountValue);
  const estimatedDiscount = calculateDiscountAmount(
    basePrice,
    rule.discountType,
    discountValue,
  );

  return {
    currency: DEFAULT_CURRENCY,
    maxPrice: roundMoney(basePrice),
    estimatedPrice: roundMoney(Math.max(basePrice - estimatedDiscount, 0)),
    pricingDetail: {
      basePrice: roundMoney(basePrice),
      estimatedDiscount,
      discountReason: rule.discountType,
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
