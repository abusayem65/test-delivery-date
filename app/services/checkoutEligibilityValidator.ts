/**
 * Checkout Eligibility Validator Service
 *
 * Centralized validation for checkout fields.
 * All required fields must be filled before checkout can proceed.
 *
 * Required fields:
 * - Full Name
 * - Phone Number
 * - Delivery Address
 * - Delivery Date
 * - Delivery Time Slot
 */

import type {
  CheckoutFields,
  CheckoutValidationResult,
} from "./types/delivery";

/**
 * Validation error messages
 */
const ERROR_MESSAGES = {
  FULL_NAME_REQUIRED: "Full name is required",
  PHONE_NUMBER_REQUIRED: "Phone number is required",
  PHONE_NUMBER_INVALID: "Phone number format is invalid",
  DELIVERY_ADDRESS_REQUIRED: "Delivery address is required",
  DELIVERY_DATE_REQUIRED: "Delivery date is required",
  DELIVERY_DATE_INVALID: "Delivery date format is invalid",
  DELIVERY_TIME_SLOT_REQUIRED: "Delivery time slot is required",
} as const;

/**
 * Checks if a string value is non-empty after trimming
 *
 * @param value - The value to check
 * @returns True if the value is a non-empty string
 */
function isNonEmpty(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validates the full name field
 *
 * @param fullName - The full name value
 * @returns Array of error messages (empty if valid)
 */
export function validateFullName(fullName: string): string[] {
  const errors: string[] = [];

  if (!isNonEmpty(fullName)) {
    errors.push(ERROR_MESSAGES.FULL_NAME_REQUIRED);
  }

  return errors;
}

/**
 * Validates the phone number field
 *
 * Basic validation - checks for non-empty and reasonable format.
 * Adjust regex pattern based on store's target region.
 *
 * @param phoneNumber - The phone number value
 * @returns Array of error messages (empty if valid)
 */
export function validatePhoneNumber(phoneNumber: string): string[] {
  const errors: string[] = [];

  if (!isNonEmpty(phoneNumber)) {
    errors.push(ERROR_MESSAGES.PHONE_NUMBER_REQUIRED);
    return errors;
  }

  // Basic phone validation: allows digits, spaces, dashes, parentheses, plus sign
  // Minimum 7 digits (excluding other characters)
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  if (digitsOnly.length < 7) {
    errors.push(ERROR_MESSAGES.PHONE_NUMBER_INVALID);
  }

  return errors;
}

/**
 * Validates the delivery address field
 *
 * @param deliveryAddress - The delivery address value
 * @returns Array of error messages (empty if valid)
 */
export function validateDeliveryAddress(deliveryAddress: string): string[] {
  const errors: string[] = [];

  if (!isNonEmpty(deliveryAddress)) {
    errors.push(ERROR_MESSAGES.DELIVERY_ADDRESS_REQUIRED);
  }

  return errors;
}

/**
 * Validates the delivery date field
 *
 * Checks for non-empty and valid YYYY-MM-DD format.
 *
 * @param deliveryDate - The delivery date value
 * @returns Array of error messages (empty if valid)
 */
export function validateDeliveryDate(deliveryDate: string): string[] {
  const errors: string[] = [];

  if (!isNonEmpty(deliveryDate)) {
    errors.push(ERROR_MESSAGES.DELIVERY_DATE_REQUIRED);
    return errors;
  }

  // Validate YYYY-MM-DD format
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(deliveryDate.trim())) {
    errors.push(ERROR_MESSAGES.DELIVERY_DATE_INVALID);
    return errors;
  }

  // Validate it's a real date
  const [year, month, day] = deliveryDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const isValidDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isValidDate) {
    errors.push(ERROR_MESSAGES.DELIVERY_DATE_INVALID);
  }

  return errors;
}

/**
 * Validates the delivery time slot field
 *
 * @param deliveryTimeSlot - The delivery time slot value (slot ID as number)
 * @returns Array of error messages (empty if valid)
 */
export function validateDeliveryTimeSlot(deliveryTimeSlot: number): string[] {
  const errors: string[] = [];

  if (
    !deliveryTimeSlot ||
    typeof deliveryTimeSlot !== "number" ||
    deliveryTimeSlot <= 0
  ) {
    errors.push(ERROR_MESSAGES.DELIVERY_TIME_SLOT_REQUIRED);
  }

  return errors;
}

/**
 * Validates all checkout fields
 *
 * Performs centralized validation of all required checkout fields.
 * Checkout button should remain disabled until all validations pass.
 *
 * @param fields - The checkout fields to validate
 * @returns Validation result with isValid flag and array of error messages
 *
 * @example
 * // All fields valid
 * validateCheckout({
 *   fullName: "John Doe",
 *   phoneNumber: "+1 555-123-4567",
 *   deliveryAddress: "123 Main St",
 *   deliveryDate: "2024-12-25",
 *   deliveryTimeSlot: "slot_1"
 * })
 * // returns { isValid: true, errors: [] }
 *
 * @example
 * // Missing fields
 * validateCheckout({
 *   fullName: "",
 *   phoneNumber: "123",
 *   deliveryAddress: "123 Main St",
 *   deliveryDate: "",
 *   deliveryTimeSlot: ""
 * })
 * // returns {
 * //   isValid: false,
 * //   errors: [
 * //     "Full name is required",
 * //     "Phone number format is invalid",
 * //     "Delivery date is required",
 * //     "Delivery time slot is required"
 * //   ]
 * // }
 */
export function validateCheckout(
  fields: CheckoutFields,
): CheckoutValidationResult {
  const errors: string[] = [];

  // Validate each field
  errors.push(...validateFullName(fields.fullName));
  errors.push(...validatePhoneNumber(fields.phoneNumber));
  errors.push(...validateDeliveryAddress(fields.deliveryAddress));
  errors.push(...validateDeliveryDate(fields.deliveryDate));
  errors.push(...validateDeliveryTimeSlot(fields.deliveryTimeSlot));

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if checkout is eligible (simple boolean check)
 *
 * Convenience function that returns just the validity status
 * without the detailed error messages.
 *
 * @param fields - The checkout fields to validate
 * @returns True if all fields are valid
 *
 * @example
 * isCheckoutEligible({
 *   fullName: "John Doe",
 *   phoneNumber: "+1 555-123-4567",
 *   deliveryAddress: "123 Main St",
 *   deliveryDate: "2024-12-25",
 *   deliveryTimeSlot: "slot_1"
 * })
 * // returns true
 */
export function isCheckoutEligible(fields: CheckoutFields): boolean {
  return validateCheckout(fields).isValid;
}

/**
 * Creates an empty checkout fields object
 *
 * Useful for initializing form state.
 *
 * @returns CheckoutFields object with empty strings
 */
export function createEmptyCheckoutFields(): CheckoutFields {
  return {
    fullName: "",
    phoneNumber: "",
    deliveryAddress: "",
    deliveryDate: "",
    deliveryTimeSlot: 0,
  };
}

/**
 * Gets the first error message if any
 *
 * Useful for showing a single error at a time.
 *
 * @param fields - The checkout fields to validate
 * @returns First error message or null if valid
 */
export function getFirstCheckoutError(fields: CheckoutFields): string | null {
  const { errors } = validateCheckout(fields);
  return errors.length > 0 ? errors[0] : null;
}
