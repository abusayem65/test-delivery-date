/**
 * Delivery Config Service
 *
 * Loads delivery configuration from the database using Prisma.
 * This service handles database queries and transforms the data
 * into the format expected by other delivery services.
 */

import type { PrismaClient } from "@prisma/client";
import { formatDateToString } from "./dateAvailabilityService";
import type {
  DateDisableRule,
  DeliveryCity,
  DeliveryConfig,
  SlotDisableRule,
  TimeSlot,
} from "./types/delivery";

/**
 * Load all delivery configuration for a shop
 *
 * @param prisma - Prisma client instance
 * @param shop - The shop domain
 * @returns Complete delivery configuration
 */
export async function loadDeliveryConfig(
  prisma: PrismaClient,
  shop: string,
): Promise<DeliveryConfig> {
  const [cities, timeSlots, dateRules, slotRules] = await Promise.all([
    loadCities(prisma, shop),
    loadTimeSlots(prisma, shop),
    loadDateDisableRules(prisma, shop),
    loadSlotDisableRules(prisma, shop),
  ]);

  return {
    shop,
    cities,
    timeSlots,
    dateDisableRules: dateRules,
    slotDisableRules: slotRules,
  };
}

/**
 * Load all active cities for a shop
 */
export async function loadCities(
  prisma: PrismaClient,
  shop: string,
): Promise<DeliveryCity[]> {
  const cities = await prisma.city.findMany({
    where: { shop, isActive: true },
    include: { timeSlots: { include: { timeSlot: true } } },
    orderBy: { name: "asc" },
  });

  return cities.map((city) => ({
    id: city.id,
    name: city.name,
    shop: city.shop,
    isActive: city.isActive,
    isSpecial: city.isSpecial,
    cutoffTime: city.cuttoffTime, // Note: schema has typo "cuttoffTime"
  }));
}

/**
 * Load all active time slots for a shop
 */
export async function loadTimeSlots(
  prisma: PrismaClient,
  shop: string,
): Promise<TimeSlot[]> {
  const slots = await prisma.timeSlot.findMany({
    where: { shop, isActive: true },
    orderBy: { startTime: "asc" },
  });

  return slots.map((slot) => ({
    id: slot.id,
    shop: slot.shop,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isActive: slot.isActive,
    label: formatTimeSlotLabel(slot.startTime, slot.endTime),
  }));
}

/**
 * Load all date disable rules for a shop
 */
export async function loadDateDisableRules(
  prisma: PrismaClient,
  shop: string,
): Promise<DateDisableRule[]> {
  const rules = await prisma.disableDateRules.findMany({
    where: { shop },
    orderBy: { startDate: "asc" },
  });

  return rules.map((rule) => ({
    id: rule.id,
    shop: rule.shop,
    cityId: rule.cityId ?? undefined,
    startDate: formatDateToString(rule.startDate),
    endDate: rule.endDate ? formatDateToString(rule.endDate) : undefined,
    reason: rule.reason ?? undefined,
  }));
}

/**
 * Load all slot disable rules for a shop
 */
export async function loadSlotDisableRules(
  prisma: PrismaClient,
  shop: string,
): Promise<SlotDisableRule[]> {
  const rules = await prisma.disableTimeSlotRules.findMany({
    where: { shop },
    orderBy: { startDate: "asc" },
  });

  return rules.map((rule) => ({
    id: rule.id,
    shop: rule.shop,
    timeSlotId: rule.timeSlotId,
    cityId: rule.cityId ?? undefined,
    startDate: formatDateToString(rule.startDate),
    endDate: rule.endDate ? formatDateToString(rule.endDate) : undefined,
    reason: rule.reason ?? undefined,
  }));
}

/**
 * Get a city by ID
 */
export async function getCityById(
  prisma: PrismaClient,
  shop: string,
  cityId: number,
): Promise<DeliveryCity | null> {
  const city = await prisma.city.findFirst({
    where: { id: cityId, shop, isActive: true },
    include: { timeSlots: { include: { timeSlot: true } } },
  });

  if (!city) return null;

  return {
    id: city.id,
    name: city.name,
    shop: city.shop,
    isActive: city.isActive,
    isSpecial: city.isSpecial,
    cutoffTime: city.cuttoffTime,
    timeSlots: city.timeSlots.map((cts) => ({
      id: cts.timeSlot.id,
      shop: cts.timeSlot.shop,
      startTime: cts.timeSlot.startTime,
      endTime: cts.timeSlot.endTime,
      isActive: cts.timeSlot.isActive,
      label: formatTimeSlotLabel(cts.timeSlot.startTime, cts.timeSlot.endTime),
    })),
  };
}

/**
 * Get a time slot by ID
 */
export async function getTimeSlotById(
  prisma: PrismaClient,
  shop: string,
  slotId: number,
): Promise<TimeSlot | null> {
  const slot = await prisma.timeSlot.findFirst({
    where: { id: slotId, shop, isActive: true },
  });

  if (!slot) return null;

  return {
    id: slot.id,
    shop: slot.shop,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isActive: slot.isActive,
    label: formatTimeSlotLabel(slot.startTime, slot.endTime),
  };
}

/**
 * Create a city
 */
export async function createCity(
  prisma: PrismaClient,
  shop: string,
  data: {
    name: string;
    isSpecial: boolean;
    cutoffTime: string;
  },
): Promise<DeliveryCity> {
  const city = await prisma.city.create({
    data: {
      shop,
      name: data.name,
      isSpecial: data.isSpecial,
      cuttoffTime: data.cutoffTime,
      isActive: true,
    },
    include: { timeSlots: { include: { timeSlot: true } } },
  });

  return {
    id: city.id,
    name: city.name,
    shop: city.shop,
    isActive: city.isActive,
    isSpecial: city.isSpecial,
    cutoffTime: city.cuttoffTime,
    timeSlots: city.timeSlots.map((cts) => ({
      id: cts.timeSlot.id,
      shop: cts.timeSlot.shop,
      startTime: cts.timeSlot.startTime,
      endTime: cts.timeSlot.endTime,
      isActive: cts.timeSlot.isActive,
      label: formatTimeSlotLabel(cts.timeSlot.startTime, cts.timeSlot.endTime),
    })),
  };
}

/**
 * Update a city
 */
export async function updateCity(
  prisma: PrismaClient,
  shop: string,
  cityId: number,
  data: {
    name?: string;
    isSpecial?: boolean;
    cutoffTime?: string;
    isActive?: boolean;
  },
): Promise<DeliveryCity | null> {
  const updateData: {
    name?: string;
    isSpecial?: boolean;
    cuttoffTime?: string;
    isActive?: boolean;
  } = {
    name: data.name,
    isSpecial: data.isSpecial,
    cuttoffTime: data.cutoffTime,
    isActive: data.isActive,
  };

  // Remove undefined values
  Object.keys(updateData).forEach((key) => {
    if (updateData[key as keyof typeof updateData] === undefined) {
      delete updateData[key as keyof typeof updateData];
    }
  });

  const city = await prisma.city.update({
    where: { id: cityId },
    data: updateData,
    include: { timeSlots: { include: { timeSlot: true } } },
  });

  if (city.shop !== shop) return null;

  return {
    id: city.id,
    name: city.name,
    shop: city.shop,
    isActive: city.isActive,
    isSpecial: city.isSpecial,
    cutoffTime: city.cuttoffTime,
    timeSlots: city.timeSlots.map((cts) => ({
      id: cts.timeSlot.id,
      shop: cts.timeSlot.shop,
      startTime: cts.timeSlot.startTime,
      endTime: cts.timeSlot.endTime,
      isActive: cts.timeSlot.isActive,
      label: formatTimeSlotLabel(cts.timeSlot.startTime, cts.timeSlot.endTime),
    })),
  };
}

/**
 * Create a time slot
 */
export async function createTimeSlot(
  prisma: PrismaClient,
  shop: string,
  data: {
    startTime: string;
    endTime: string;
  },
): Promise<TimeSlot> {
  const slot = await prisma.timeSlot.create({
    data: {
      shop,
      startTime: data.startTime,
      endTime: data.endTime,
      isActive: true,
    },
  });

  return {
    id: slot.id,
    shop: slot.shop,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isActive: slot.isActive,
    label: formatTimeSlotLabel(slot.startTime, slot.endTime),
  };
}

/**
 * Update a time slot
 */
export async function updateTimeSlot(
  prisma: PrismaClient,
  shop: string,
  slotId: number,
  data: {
    startTime?: string;
    endTime?: string;
    isActive?: boolean;
  },
): Promise<TimeSlot | null> {
  const slot = await prisma.timeSlot.update({
    where: { id: slotId },
    data,
  });

  if (slot.shop !== shop) return null;

  return {
    id: slot.id,
    shop: slot.shop,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isActive: slot.isActive,
    label: formatTimeSlotLabel(slot.startTime, slot.endTime),
  };
}

/**
 * Create a date disable rule
 */
export async function createDateDisableRule(
  prisma: PrismaClient,
  shop: string,
  data: {
    cityId?: number;
    startDate: Date;
    endDate?: Date;
    reason?: string;
  },
): Promise<DateDisableRule> {
  const rule = await prisma.disableDateRules.create({
    data: {
      shop,
      cityId: data.cityId,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
    },
  });

  return {
    id: rule.id,
    shop: rule.shop,
    cityId: rule.cityId ?? undefined,
    startDate: formatDateToString(rule.startDate),
    endDate: rule.endDate ? formatDateToString(rule.endDate) : undefined,
    reason: rule.reason ?? undefined,
  };
}

/**
 * Create a slot disable rule
 */
export async function createSlotDisableRule(
  prisma: PrismaClient,
  shop: string,
  data: {
    timeSlotId: number;
    cityId?: number;
    startDate: Date;
    endDate?: Date;
    reason?: string;
  },
): Promise<SlotDisableRule> {
  const rule = await prisma.disableTimeSlotRules.create({
    data: {
      shop,
      timeSlotId: data.timeSlotId,
      cityId: data.cityId,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
    },
  });

  return {
    id: rule.id,
    shop: rule.shop,
    timeSlotId: rule.timeSlotId,
    cityId: rule.cityId ?? undefined,
    startDate: formatDateToString(rule.startDate),
    endDate: rule.endDate ? formatDateToString(rule.endDate) : undefined,
    reason: rule.reason ?? undefined,
  };
}

/**
 * Format time slot label from start and end times
 */
function formatTimeSlotLabel(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}
