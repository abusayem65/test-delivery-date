/**
 * Delivery Rules Type Definitions
 *
 * Core types for the delivery configuration system.
 * All dates should be in YYYY-MM-DD format for consistency.
 * All times should be in HH:mm format (24-hour).
 */

/**
 * Represents a delivery city with optional special handling rules
 */
export interface DeliveryCity {
  /** Unique identifier for the city */
  id: string;
  /** Display name of the city */
  name: string;
  /** Whether this city has special delivery restrictions */
  isSpecial: boolean;
  /** Cutoff time for same-day delivery in HH:mm format (24-hour) */
  cutoffTime?: string;
}

/**
 * Represents a delivery time slot
 */
export interface TimeSlot {
  /** Unique identifier for the slot (e.g., "slot_1", "slot_2") */
  id: string;
  /** Human-readable label (e.g., "09:30 AM - 12:00 PM") */
  label: string;
  /** Start time in HH:mm format (24-hour) */
  startTime: string;
  /** End time in HH:mm format (24-hour) */
  endTime: string;
  /** Whether this slot is disabled globally across all dates/cities */
  isGloballyDisabled: boolean;
}

/**
 * Rule for disabling a specific time slot
 * Rules are applied in priority order: global → date-specific → city+date-specific
 */
export interface SlotDisableRule {
  /** ID of the slot to disable */
  slotId: string;
  /** Specific date to disable (YYYY-MM-DD format). If omitted, applies to all dates */
  date?: string;
  /** Specific city to disable for. If omitted, applies to all cities */
  cityId?: string;
}

/**
 * Complete delivery configuration loaded from Metaobjects or theme settings
 */
export interface DeliveryConfig {
  /** Available delivery cities */
  cities: DeliveryCity[];
  /** Available time slots */
  timeSlots: TimeSlot[];
  /** Dates when delivery is not available (YYYY-MM-DD format) */
  disabledDates: string[];
  /** Rules for disabling specific slots */
  slotDisableRules: SlotDisableRule[];
}

/**
 * Represents a product in the cart for delay calculation
 */
export interface CartProduct {
  /** Product tags used for delay calculation */
  tags: string[];
}

/**
 * Fields required for checkout validation
 */
export interface CheckoutFields {
  /** Customer's full name */
  fullName: string;
  /** Customer's phone number */
  phoneNumber: string;
  /** Selected delivery address */
  deliveryAddress: string;
  /** Selected delivery date (YYYY-MM-DD format) */
  deliveryDate: string;
  /** Selected delivery time slot ID */
  deliveryTimeSlot: string;
}

/**
 * Result of slot availability check
 */
export interface SlotAvailabilityResult {
  /** The time slot */
  slot: TimeSlot;
  /** Whether the slot is disabled */
  disabled: boolean;
  /** Reason for disabling (if applicable) */
  reason?: string;
}

/**
 * Result of checkout validation
 */
export interface CheckoutValidationResult {
  /** Whether all fields are valid */
  isValid: boolean;
  /** List of validation error messages */
  errors: string[];
}
