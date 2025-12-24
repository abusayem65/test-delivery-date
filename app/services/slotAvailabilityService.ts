/**
 * Slot Availability Service
 *
 * Determines which time slots are available based on disable rules.
 * Rules are applied in priority order:
 * 1. Global disable (slot.isGloballyDisabled)
 * 2. Date-specific disable (rule has date but no cityId)
 * 3. City+date-specific disable (rule has both date and cityId)
 *
 * A slot is disabled if ANY applicable rule disables it.
 */

import type {
  SlotAvailabilityResult,
  SlotDisableRule,
  TimeSlot,
} from "./types/delivery";

/**
 * Checks if a slot is globally disabled
 *
 * @param slot - The time slot to check
 * @returns Object with disabled status and reason if applicable
 */
function checkGlobalDisable(slot: TimeSlot): {
  disabled: boolean;
  reason?: string;
} {
  if (slot.isGloballyDisabled) {
    return { disabled: true, reason: "Globally disabled" };
  }
  return { disabled: false };
}

/**
 * Checks if a slot is disabled for a specific date (regardless of city)
 *
 * @param slotId - The slot ID to check
 * @param date - The date in YYYY-MM-DD format
 * @param rules - Array of slot disable rules
 * @returns Object with disabled status and reason if applicable
 */
function checkDateSpecificDisable(
  slotId: string,
  date: string,
  rules: SlotDisableRule[],
): { disabled: boolean; reason?: string } {
  const dateRule = rules.find(
    (rule) => rule.slotId === slotId && rule.date === date && !rule.cityId,
  );

  if (dateRule) {
    return { disabled: true, reason: `Disabled on ${date}` };
  }
  return { disabled: false };
}

/**
 * Checks if a slot is disabled for a specific city and date combination
 *
 * @param slotId - The slot ID to check
 * @param date - The date in YYYY-MM-DD format
 * @param cityId - The city ID to check
 * @param rules - Array of slot disable rules
 * @returns Object with disabled status and reason if applicable
 */
function checkCityDateDisable(
  slotId: string,
  date: string,
  cityId: string,
  rules: SlotDisableRule[],
): { disabled: boolean; reason?: string } {
  const cityDateRule = rules.find(
    (rule) =>
      rule.slotId === slotId && rule.date === date && rule.cityId === cityId,
  );

  if (cityDateRule) {
    return { disabled: true, reason: `Disabled for this city on ${date}` };
  }
  return { disabled: false };
}

/**
 * Checks a single slot against all disable rules
 *
 * @param slot - The time slot to check
 * @param date - The selected delivery date in YYYY-MM-DD format
 * @param cityId - The selected city ID (null if no city selected)
 * @param rules - Array of slot disable rules
 * @returns SlotAvailabilityResult with disabled status and reason
 */
export function checkSlotAvailability(
  slot: TimeSlot,
  date: string,
  cityId: string | null,
  rules: SlotDisableRule[],
): SlotAvailabilityResult {
  // Priority 1: Global disable
  const globalCheck = checkGlobalDisable(slot);
  if (globalCheck.disabled) {
    return { slot, disabled: true, reason: globalCheck.reason };
  }

  // Priority 2: Date-specific disable
  const dateCheck = checkDateSpecificDisable(slot.id, date, rules);
  if (dateCheck.disabled) {
    return { slot, disabled: true, reason: dateCheck.reason };
  }

  // Priority 3: City+date-specific disable (only if city is selected)
  if (cityId) {
    const cityDateCheck = checkCityDateDisable(slot.id, date, cityId, rules);
    if (cityDateCheck.disabled) {
      return { slot, disabled: true, reason: cityDateCheck.reason };
    }
  }

  // Slot is available
  return { slot, disabled: false };
}

/**
 * Gets availability status for all time slots
 *
 * Applies disable rules in priority order to determine which slots
 * are available for the given date and city combination.
 *
 * @param slots - Array of time slots to check
 * @param date - The selected delivery date in YYYY-MM-DD format
 * @param cityId - The selected city ID (null if no city selected yet)
 * @param rules - Array of slot disable rules
 * @returns Array of SlotAvailabilityResult with disabled status and reasons
 *
 * @example
 * const slots = [
 *   { id: "slot_1", label: "9AM - 12PM", startTime: "09:00", endTime: "12:00", isGloballyDisabled: false },
 *   { id: "slot_2", label: "12PM - 3PM", startTime: "12:00", endTime: "15:00", isGloballyDisabled: true }
 * ];
 * const rules = [
 *   { slotId: "slot_1", date: "2024-12-25" } // Disable slot_1 on Christmas
 * ];
 *
 * getAvailableSlots(slots, "2024-12-25", null, rules)
 * // returns [
 * //   { slot: slots[0], disabled: true, reason: "Disabled on 2024-12-25" },
 * //   { slot: slots[1], disabled: true, reason: "Globally disabled" }
 * // ]
 *
 * @example
 * // City-specific disable
 * const rules = [
 *   { slotId: "slot_1", date: "2024-12-26", cityId: "city_remote" }
 * ];
 *
 * getAvailableSlots(slots, "2024-12-26", "city_remote", rules)
 * // slot_1 disabled for city_remote, but available for other cities
 */
export function getAvailableSlots(
  slots: TimeSlot[],
  date: string,
  cityId: string | null,
  rules: SlotDisableRule[],
): SlotAvailabilityResult[] {
  if (!slots || !Array.isArray(slots)) {
    return [];
  }

  if (!rules || !Array.isArray(rules)) {
    // If no rules, only check global disable
    return slots.map((slot) => checkSlotAvailability(slot, date, cityId, []));
  }

  return slots.map((slot) => checkSlotAvailability(slot, date, cityId, rules));
}

/**
 * Filters to only return slots that are available (not disabled)
 *
 * @param slots - Array of time slots to filter
 * @param date - The selected delivery date in YYYY-MM-DD format
 * @param cityId - The selected city ID (null if no city selected)
 * @param rules - Array of slot disable rules
 * @returns Array of available TimeSlots only
 *
 * @example
 * getEnabledSlots(slots, "2024-12-26", "city_1", rules)
 * // returns only slots that are not disabled
 */
export function getEnabledSlots(
  slots: TimeSlot[],
  date: string,
  cityId: string | null,
  rules: SlotDisableRule[],
): TimeSlot[] {
  return getAvailableSlots(slots, date, cityId, rules)
    .filter((result) => !result.disabled)
    .map((result) => result.slot);
}

/**
 * Checks if a specific slot is available
 *
 * @param slotId - The slot ID to check
 * @param slots - Array of all time slots
 * @param date - The selected delivery date in YYYY-MM-DD format
 * @param cityId - The selected city ID (null if no city selected)
 * @param rules - Array of slot disable rules
 * @returns True if the slot exists and is available
 */
export function isSlotAvailable(
  slotId: string,
  slots: TimeSlot[],
  date: string,
  cityId: string | null,
  rules: SlotDisableRule[],
): boolean {
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) {
    return false;
  }

  const result = checkSlotAvailability(slot, date, cityId, rules);
  return !result.disabled;
}
