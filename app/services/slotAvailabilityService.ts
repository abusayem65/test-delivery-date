/**
 * Slot Availability Service
 *
 * Determines which time slots are available based on disable rules.
 * Rules are applied in priority order:
 * 1. Slot inactivity (slot.isActive === false)
 * 2. Date-range disable (rule with matching startDate/endDate range)
 * 3. City+date-range disable (rule with cityId and matching date range)
 *
 * A slot is disabled if ANY applicable rule disables it during the selected date.
 */

import type {
  SlotAvailabilityResult,
  SlotDisableRule,
  TimeSlot,
} from "./types/delivery";

/**
 * Check if a date falls within a disable rule's date range
 *
 * @param date - The date to check in YYYY-MM-DD format
 * @param startDate - Rule start date in YYYY-MM-DD format
 * @param endDate - Rule end date in YYYY-MM-DD format (optional)
 * @returns True if date falls within the range
 */
function isDateInRange(
  date: string,
  startDate: string,
  endDate?: string,
): boolean {
  if (date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

/**
 * Checks if a slot is disabled due to inactivity
 *
 * @param slot - The time slot to check
 * @returns Object with disabled status and reason if applicable
 */
function checkSlotActive(slot: TimeSlot): {
  disabled: boolean;
  reason?: string;
} {
  if (!slot.isActive) {
    return { disabled: true, reason: "Slot is inactive" };
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
  slotId: number,
  date: string,
  rules: SlotDisableRule[],
): { disabled: boolean; reason?: string } {
  const dateRule = rules.find(
    (rule) =>
      rule.timeSlotId === slotId &&
      !rule.cityId &&
      isDateInRange(date, rule.startDate, rule.endDate),
  );

  if (dateRule) {
    return {
      disabled: true,
      reason: dateRule.reason
        ? `Disabled: ${dateRule.reason}`
        : `Disabled on ${date}`,
    };
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
  slotId: number,
  date: string,
  cityId: number,
  rules: SlotDisableRule[],
): { disabled: boolean; reason?: string } {
  const cityDateRule = rules.find(
    (rule) =>
      rule.timeSlotId === slotId &&
      rule.cityId === cityId &&
      isDateInRange(date, rule.startDate, rule.endDate),
  );

  if (cityDateRule) {
    return {
      disabled: true,
      reason: cityDateRule.reason
        ? `Disabled: ${cityDateRule.reason}`
        : `Disabled for this city on ${date}`,
    };
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
  cityId: number | null,
  rules: SlotDisableRule[],
): SlotAvailabilityResult {
  // Priority 1: Check if slot is active
  const activeCheck = checkSlotActive(slot);
  if (activeCheck.disabled) {
    return { slot, disabled: true, reason: activeCheck.reason };
  }

  // Priority 2: Date-range disable
  const dateCheck = checkDateSpecificDisable(slot.id, date, rules);
  if (dateCheck.disabled) {
    return { slot, disabled: true, reason: dateCheck.reason };
  }

  // Priority 3: City+date-range disable (only if city is selected)
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
 *   { id: 1, shop: "example.myshopify.com", startTime: "09:00", endTime: "12:00", isActive: true, label: "9AM - 12PM" },
 *   { id: 2, shop: "example.myshopify.com", startTime: "12:00", endTime: "15:00", isActive: false, label: "12PM - 3PM" }
 * ];
 * const rules = [
 *   { id: 1, shop: "example.myshopify.com", timeSlotId: 1, startDate: "2024-12-25" } // Disable slot 1 on Christmas
 * ];
 *
 * getAvailableSlots(slots, "2024-12-25", null, rules)
 * // returns [
 * //   { slot: slots[0], disabled: true, reason: "Disabled on 2024-12-25" },
 * //   { slot: slots[1], disabled: true, reason: "Slot is inactive" }
 * // ]
 */
export function getAvailableSlots(
  slots: TimeSlot[],
  date: string,
  cityId: number | null,
  rules: SlotDisableRule[],
): SlotAvailabilityResult[] {
  if (!slots || !Array.isArray(slots)) {
    return [];
  }

  if (!rules || !Array.isArray(rules)) {
    // If no rules, only check if slot is active
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
 * getEnabledSlots(slots, "2024-12-26", 1, rules)
 * // returns only slots that are not disabled
 */
export function getEnabledSlots(
  slots: TimeSlot[],
  date: string,
  cityId: number | null,
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
  slotId: number,
  slots: TimeSlot[],
  date: string,
  cityId: number | null,
  rules: SlotDisableRule[],
): boolean {
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) {
    return false;
  }

  const result = checkSlotAvailability(slot, date, cityId, rules);
  return !result.disabled;
}
