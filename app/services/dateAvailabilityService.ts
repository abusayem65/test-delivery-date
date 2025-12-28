/**
 * Date Availability Service
 *
 * Handles date parsing, normalization, and filtering for delivery dates.
 * Supports multiple input formats and normalizes to YYYY-MM-DD for consistency.
 *
 * All timezone handling assumes the store's local timezone.
 * Dates are treated as local dates, not UTC.
 */

/**
 * Normalizes a date string to YYYY-MM-DD format
 *
 * Supported input formats:
 * - YYYY-MM-DD (ISO format, preferred)
 * - DD/MM/YYYY (European format)
 * - Date objects (converted to local date string)
 *
 * @param dateStr - The date string to normalize
 * @returns Normalized date in YYYY-MM-DD format, or null if invalid
 *
 * @example
 * normalizeDate("2024-12-25") // returns "2024-12-25"
 * normalizeDate("25/12/2024") // returns "2024-12-25"
 * normalizeDate("invalid") // returns null
 * normalizeDate("31/02/2024") // returns null (invalid date)
 */
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== "string") {
    return null;
  }

  const trimmed = dateStr.trim();

  // Try YYYY-MM-DD format first (ISO format)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    if (isValidDateComponents(parseInt(year), parseInt(month), parseInt(day))) {
      return trimmed;
    }
    return null;
  }

  // Try DD/MM/YYYY format
  const euroMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (euroMatch) {
    const [, day, month, year] = euroMatch;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);

    if (isValidDateComponents(yearNum, monthNum, dayNum)) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return null;
  }

  return null;
}

/**
 * Validates date components
 *
 * @param year - The year (e.g., 2024)
 * @param month - The month (1-12)
 * @param day - The day of month
 * @returns True if the components form a valid date
 */
function isValidDateComponents(
  year: number,
  month: number,
  day: number,
): boolean {
  if (month < 1 || month > 12) {
    return false;
  }
  if (day < 1 || day > 31) {
    return false;
  }

  // Create date and verify it matches the input
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Formats a Date object to YYYY-MM-DD string
 *
 * @param date - The Date object to format
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * formatDateToString(new Date(2024, 11, 25)) // returns "2024-12-25"
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string to a Date object (local timezone)
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object set to midnight local time, or null if invalid
 *
 * @example
 * parseDate("2024-12-25") // returns Date object for Dec 25, 2024 00:00:00 local
 */
export function parseDate(dateStr: string): Date | null {
  const normalized = normalizeDate(dateStr);
  if (!normalized) {
    return null;
  }

  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Normalizes an array of disabled dates to YYYY-MM-DD format
 * Invalid dates are filtered out with a warning in development
 *
 * @param disabledDates - Array of date strings in various formats
 * @returns Set of normalized date strings for efficient lookup
 */
export function normalizeDisabledDates(disabledDates: string[]): Set<string> {
  const normalized = new Set<string>();

  for (const dateStr of disabledDates) {
    const normalizedDate = normalizeDate(dateStr);
    if (normalizedDate) {
      normalized.add(normalizedDate);
    }
  }

  return normalized;
}

/**
 * Checks if a date falls within a disable rule's date range
 *
 * @param date - The date to check in YYYY-MM-DD format
 * @param startDate - Rule start date in YYYY-MM-DD format
 * @param endDate - Rule end date in YYYY-MM-DD format (optional)
 * @returns True if date falls within the range
 */
export function isDateInDisableRange(
  date: string,
  startDate: string,
  endDate?: string,
): boolean {
  if (date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

/**
 * Build a set of disabled dates from date disable rules
 *
 * Expands date ranges into individual dates for efficient lookup.
 *
 * @param dateRules - Array of date disable rules
 * @param cityId - Optional city ID to filter city-specific rules
 * @returns Set of disabled dates in YYYY-MM-DD format
 */
export function buildDisabledDateSet(
  dateRules: Array<{ startDate: string; endDate?: string; cityId?: number }>,
  cityId?: number,
): Set<string> {
  const disabled = new Set<string>();

  for (const rule of dateRules) {
    // Include both global rules and city-specific rules if cityId provided
    const applies = !rule.cityId || (cityId && rule.cityId === cityId);
    if (!applies) continue;

    const startDate = normalizeDate(rule.startDate);
    const endDate = rule.endDate ? normalizeDate(rule.endDate) : null;

    if (!startDate) continue;

    // Add all dates in range
    let current = parseDate(startDate);
    const end = endDate ? parseDate(endDate) : current;

    if (!current || !end) continue;

    while (current <= end) {
      disabled.add(formatDateToString(current));
      current = new Date(current);
      current.setDate(current.getDate() + 1);
    }
  }

  return disabled;
}

/**
 * Generates an array of available delivery dates
 *
 * Starting from the given date, returns dates that are not in the disabled list.
 * Useful for populating a date picker with valid options.
 *
 * @param startDate - The first possible delivery date
 * @param daysToShow - Number of days to check for availability
 * @param disabledDates - Array of disabled dates (supports multiple formats) OR date rules with ranges
 * @param cityId - Optional city ID to filter city-specific disable rules
 * @returns Array of available dates in YYYY-MM-DD format
 *
 * @example
 * const start = new Date(2024, 11, 24); // Dec 24, 2024
 * getAvailableDates(start, 7, ["2024-12-25", "26/12/2024"])
 * // returns ["2024-12-24", "2024-12-27", "2024-12-28", "2024-12-29", "2024-12-30"]
 *
 * @example
 * // With date ranges
 * const rules = [
 *   { startDate: "2024-12-25", endDate: "2024-12-26" } // Disable Dec 25-26
 * ];
 * getAvailableDates(start, 7, rules, undefined)
 * // returns ["2024-12-24", "2024-12-27", "2024-12-28", ...]
 */
export function getAvailableDates(
  startDate: Date,
  daysToShow: number,
  disabledDates:
    | string[]
    | Array<{ startDate: string; endDate?: string; cityId?: number }>,
  cityId?: number,
): string[] {
  if (daysToShow <= 0) {
    return [];
  }

  // Build disabled date set based on input type
  let disabledSet: Set<string>;
  if (Array.isArray(disabledDates) && disabledDates.length > 0) {
    if (typeof disabledDates[0] === "string") {
      // Old format: array of date strings
      disabledSet = normalizeDisabledDates(disabledDates as string[]);
    } else {
      // New format: array of date rules with ranges
      disabledSet = buildDisabledDateSet(
        disabledDates as Array<{
          startDate: string;
          endDate?: string;
          cityId?: number;
        }>,
        cityId,
      );
    }
  } else {
    disabledSet = new Set();
  }

  const availableDates: string[] = [];

  // Create a copy to avoid mutating the input
  const currentDate = new Date(startDate);

  for (let i = 0; i < daysToShow; i++) {
    const dateStr = formatDateToString(currentDate);

    if (!disabledSet.has(dateStr)) {
      availableDates.push(dateStr);
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availableDates;
}

/**
 * Checks if a specific date is available for delivery
 *
 * @param date - The date to check (Date object or YYYY-MM-DD string)
 * @param disabledDates - Array of disabled dates
 * @returns True if the date is available
 *
 * @example
 * isDateAvailable("2024-12-25", ["2024-12-25"]) // returns false
 * isDateAvailable("2024-12-26", ["2024-12-25"]) // returns true
 */
export function isDateAvailable(
  date: Date | string,
  disabledDates: string[],
): boolean {
  const dateStr =
    typeof date === "string" ? normalizeDate(date) : formatDateToString(date);

  if (!dateStr) {
    return false;
  }

  const disabledSet = normalizeDisabledDates(disabledDates);
  return !disabledSet.has(dateStr);
}

/**
 * Adds a specified number of days to a date
 *
 * @param date - The starting date
 * @param days - Number of days to add (can be negative)
 * @returns New Date object with days added
 *
 * @example
 * addDays(new Date(2024, 11, 24), 3) // returns Dec 27, 2024
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
