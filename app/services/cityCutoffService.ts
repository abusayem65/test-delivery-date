/**
 * City Cutoff Service
 *
 * Handles cutoff time logic for same-day delivery by city.
 * Some cities may have earlier cutoff times due to logistics.
 *
 * All time comparisons are done in local timezone.
 * Cutoff times are expected in HH:mm format (24-hour).
 */

import { addDays, formatDateToString } from "./dateAvailabilityService";
import type { DeliveryCity } from "./types/delivery";

/**
 * Default cutoff time if city has no specific cutoff
 * Set to end of day to allow same-day delivery by default
 */
const DEFAULT_CUTOFF_TIME = "23:59";

/**
 * Parses a time string in HH:mm format to hours and minutes
 *
 * @param timeStr - Time string in HH:mm format (24-hour)
 * @returns Object with hours and minutes, or null if invalid
 *
 * @example
 * parseTime("14:30") // returns { hours: 14, minutes: 30 }
 * parseTime("9:05") // returns { hours: 9, minutes: 5 }
 * parseTime("invalid") // returns null
 */
export function parseTime(
  timeStr: string,
): { hours: number; minutes: number } | null {
  if (!timeStr || typeof timeStr !== "string") {
    return null;
  }

  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

/**
 * Gets the cutoff time for a city
 *
 * @param city - The delivery city
 * @returns Cutoff time in HH:mm format, or default if not specified
 */
export function getCityCutoffTime(city: DeliveryCity): string {
  return city.cutoffTime || DEFAULT_CUTOFF_TIME;
}

/**
 * Compares current time against a city's cutoff time
 *
 * @param cutoffTime - Cutoff time in HH:mm format
 * @param currentTime - Current Date object
 * @returns True if current time is before cutoff
 *
 * @example
 * const now = new Date("2024-12-24T10:00:00");
 * isBeforeCutoff("14:00", now) // returns true
 * isBeforeCutoff("09:00", now) // returns false
 */
export function isBeforeCutoff(cutoffTime: string, currentTime: Date): boolean {
  const parsed = parseTime(cutoffTime);
  if (!parsed) {
    // If cutoff time is invalid, assume cutoff has passed for safety
    return false;
  }

  const currentHours = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();

  // Compare hours first, then minutes
  if (currentHours < parsed.hours) {
    return true;
  }
  if (currentHours === parsed.hours && currentMinutes < parsed.minutes) {
    return true;
  }

  return false;
}

/**
 * Checks if same-day delivery is available for a city
 *
 * Same-day delivery is available if:
 * 1. The city has a cutoff time configured (or uses default)
 * 2. The current time is before the cutoff time
 *
 * @param city - The delivery city to check
 * @param currentTime - Current Date object (for testing, pass actual current time)
 * @returns True if same-day delivery is still available
 *
 * @example
 * const city = { id: "1", name: "Downtown", isSpecial: false, cutoffTime: "14:00" };
 * const morning = new Date("2024-12-24T10:00:00");
 * const afternoon = new Date("2024-12-24T15:00:00");
 *
 * isSameDayDeliveryAvailable(city, morning) // returns true
 * isSameDayDeliveryAvailable(city, afternoon) // returns false
 *
 * @example
 * // City without cutoff (uses default 23:59)
 * const cityNoCutoff = { id: "2", name: "Suburbs", isSpecial: false };
 * isSameDayDeliveryAvailable(cityNoCutoff, new Date("2024-12-24T22:00:00")) // returns true
 */
export function isSameDayDeliveryAvailable(
  city: DeliveryCity,
  currentTime: Date,
): boolean {
  const cutoffTime = getCityCutoffTime(city);
  return isBeforeCutoff(cutoffTime, currentTime);
}

/**
 * Calculates the minimum delivery date for a city
 *
 * Takes into account:
 * 1. Base delay from cart products (e.g., +2 days for delay-2 products)
 * 2. City cutoff time (if passed, adds 1 extra day)
 *
 * @param city - The delivery city
 * @param currentTime - Current Date object
 * @param baseDelay - Base delay from cart products (in days)
 * @returns The minimum delivery date
 *
 * @example
 * const city = { id: "1", name: "Downtown", isSpecial: false, cutoffTime: "14:00" };
 *
 * // Before cutoff, no product delay
 * const morning = new Date("2024-12-24T10:00:00");
 * getMinimumDeliveryDate(city, morning, 0) // returns Dec 24, 2024
 *
 * // After cutoff, no product delay
 * const afternoon = new Date("2024-12-24T15:00:00");
 * getMinimumDeliveryDate(city, afternoon, 0) // returns Dec 25, 2024
 *
 * // Before cutoff, with 2-day product delay
 * getMinimumDeliveryDate(city, morning, 2) // returns Dec 26, 2024
 *
 * // After cutoff, with 2-day product delay
 * getMinimumDeliveryDate(city, afternoon, 2) // returns Dec 27, 2024
 */
export function getMinimumDeliveryDate(
  city: DeliveryCity,
  currentTime: Date,
  baseDelay: number,
): Date {
  // Start from today's date (midnight)
  const today = new Date(
    currentTime.getFullYear(),
    currentTime.getMonth(),
    currentTime.getDate(),
  );

  // Check if same-day is available
  const sameDayAvailable = isSameDayDeliveryAvailable(city, currentTime);

  // If cutoff has passed, add 1 to the base delay
  const totalDelay = sameDayAvailable ? baseDelay : baseDelay + 1;

  return addDays(today, totalDelay);
}

/**
 * Gets the minimum delivery date as a formatted string
 *
 * @param city - The delivery city
 * @param currentTime - Current Date object
 * @param baseDelay - Base delay from cart products (in days)
 * @returns Minimum delivery date in YYYY-MM-DD format
 *
 * @example
 * getMinimumDeliveryDateString(city, new Date("2024-12-24T15:00:00"), 2)
 * // returns "2024-12-27"
 */
export function getMinimumDeliveryDateString(
  city: DeliveryCity,
  currentTime: Date,
  baseDelay: number,
): string {
  const minDate = getMinimumDeliveryDate(city, currentTime, baseDelay);
  return formatDateToString(minDate);
}

/**
 * Gets time remaining until cutoff
 *
 * @param city - The delivery city
 * @param currentTime - Current Date object
 * @returns Object with hours and minutes remaining, or null if cutoff passed
 *
 * @example
 * const city = { id: "1", name: "Downtown", isSpecial: false, cutoffTime: "14:00" };
 * const now = new Date("2024-12-24T12:30:00");
 *
 * getTimeUntilCutoff(city, now) // returns { hours: 1, minutes: 30 }
 */
export function getTimeUntilCutoff(
  city: DeliveryCity,
  currentTime: Date,
): { hours: number; minutes: number } | null {
  const cutoffTime = getCityCutoffTime(city);
  const parsed = parseTime(cutoffTime);

  if (!parsed) {
    return null;
  }

  if (!isBeforeCutoff(cutoffTime, currentTime)) {
    return null;
  }

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const cutoffMinutes = parsed.hours * 60 + parsed.minutes;
  const diffMinutes = cutoffMinutes - currentMinutes;

  return {
    hours: Math.floor(diffMinutes / 60),
    minutes: diffMinutes % 60,
  };
}
