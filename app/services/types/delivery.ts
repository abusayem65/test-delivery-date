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
  id: number;
  /** Display name of the city */
  name: string;
  /** Shopify shop domain */
  shop: string;
  /** Whether this city is active */
  isActive: boolean;
  /** Whether this city has special delivery restrictions */
  isSpecial: boolean;
  /** Cutoff time for same-day delivery in HH:mm format (24-hour) */
  cutoffTime: string;
  /** Associated time slots */
  timeSlots?: TimeSlot[];
}

/**
 * Represents a delivery time slot
 */
export interface TimeSlot {
  /** Unique identifier for the slot */
  id: number;
  /** Shopify shop domain */
  shop: string;
  /** Start time in HH:mm format (24-hour) */
  startTime: string;
  /** End time in HH:mm format (24-hour) */
  endTime: string;
  /** Whether this slot is active */
  isActive: boolean;
  /** Human-readable label (e.g., "09:30 AM - 12:00 PM") */
  label?: string;
}

/**
 * Rule for disabling delivery dates
 */
export interface DateDisableRule {
  /** ID of the rule */
  id: number;
  /** Shopify shop domain */
  shop: string;
  /** City ID (optional - if null, applies to all cities) */
  cityId?: number;
  /** Start date of the disable period (YYYY-MM-DD format) */
  startDate: string;
  /** End date of the disable period (YYYY-MM-DD format) */
  endDate?: string;
  /** Reason for disabling */
  reason?: string;
}

/**
 * Rule for disabling a specific time slot
 * Rules are applied in priority order: global → date-specific → city+date-specific
 */
export interface SlotDisableRule {
  /** ID of the rule */
  id: number;
  /** Shopify shop domain */
  shop: string;
  /** ID of the time slot to disable */
  timeSlotId: number;
  /** Specific city to disable for (optional - if null, applies to all cities) */
  cityId?: number;
  /** Start date of the disable period (YYYY-MM-DD format) */
  startDate: string;
  /** End date of the disable period (YYYY-MM-DD format) */
  endDate?: string;
  /** Reason for disabling */
  reason?: string;
}

/**
 * Complete delivery configuration loaded from database
 */
export interface DeliveryConfig {
  /** Shopify shop domain */
  shop: string;
  /** Available delivery cities */
  cities: DeliveryCity[];
  /** Available time slots */
  timeSlots: TimeSlot[];
  /** Rules for disabling delivery dates */
  dateDisableRules: DateDisableRule[];
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
  /** Selected delivery time slot ID (numeric) */
  deliveryTimeSlot: number;
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
