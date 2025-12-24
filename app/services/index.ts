/**
 * Delivery Rules Services
 *
 * Centralized exports for all delivery-related service modules.
 * These services handle the business logic for cart-level delivery rules
 * without any Shopify UI dependencies.
 */

// Types
export type {
  CartProduct,
  CheckoutFields,
  CheckoutValidationResult,
  DeliveryCity,
  DeliveryConfig,
  SlotAvailabilityResult,
  SlotDisableRule,
  TimeSlot,
} from "./types/delivery";

// Cart Delay Calculator
export {
  calculateCartDelay,
  getProductDelay,
  parseDelayFromTag,
} from "./cartDelayCalculator";

// Date Availability Service
export {
  addDays,
  formatDateToString,
  getAvailableDates,
  isDateAvailable,
  normalizeDate,
  normalizeDisabledDates,
  parseDate,
} from "./dateAvailabilityService";

// Slot Availability Service
export {
  checkSlotAvailability,
  getAvailableSlots,
  getEnabledSlots,
  isSlotAvailable,
} from "./slotAvailabilityService";

// City Cutoff Service
export {
  getCityCutoffTime,
  getMinimumDeliveryDate,
  getMinimumDeliveryDateString,
  getTimeUntilCutoff,
  isBeforeCutoff,
  isSameDayDeliveryAvailable,
  parseTime,
} from "./cityCutoffService";

// Checkout Eligibility Validator
export {
  createEmptyCheckoutFields,
  getFirstCheckoutError,
  isCheckoutEligible,
  validateCheckout,
  validateDeliveryAddress,
  validateDeliveryDate,
  validateDeliveryTimeSlot,
  validateFullName,
  validatePhoneNumber,
} from "./checkoutEligibilityValidator";
