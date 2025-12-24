/**
 * Cart Delay Calculator Service
 *
 * Calculates the delivery delay based on product tags in the cart.
 * Uses the highest delay found across all products.
 *
 * Supported tag patterns:
 * - `delay` or `cake-delay` → +1 day
 * - `delay-2` or `cake-delay-2` → +2 days
 * - `delay-3` or `cake-delay-3` → +3 days
 */

import type { CartProduct } from "./types/delivery";

/**
 * Pattern to match delay tags and extract the delay value
 * Matches: delay, delay-2, delay-3, cake-delay, cake-delay-2, cake-delay-3
 */
const DELAY_TAG_PATTERN = /^(?:cake-)?delay(?:-(\d+))?$/i;

/**
 * Extracts the delay value from a single tag
 *
 * @param tag - The product tag to parse
 * @returns The delay in days, or 0 if not a delay tag
 *
 * @example
 * parseDelayFromTag("delay") // returns 1
 * parseDelayFromTag("delay-2") // returns 2
 * parseDelayFromTag("cake-delay-3") // returns 3
 * parseDelayFromTag("other-tag") // returns 0
 */
export function parseDelayFromTag(tag: string): number {
  const normalizedTag = tag.trim().toLowerCase();
  const match = normalizedTag.match(DELAY_TAG_PATTERN);

  if (!match) {
    return 0;
  }

  // If no number suffix, default to 1 day delay
  const delayValue = match[1] ? parseInt(match[1], 10) : 1;

  // Ensure we return a valid positive number
  return isNaN(delayValue) || delayValue < 0 ? 0 : delayValue;
}

/**
 * Calculates the maximum delay for a single product based on its tags
 *
 * @param product - The cart product to analyze
 * @returns The highest delay value found in the product's tags
 *
 * @example
 * getProductDelay({ tags: ["delay", "gift"] }) // returns 1
 * getProductDelay({ tags: ["delay-2", "delay"] }) // returns 2
 * getProductDelay({ tags: ["sale", "featured"] }) // returns 0
 */
export function getProductDelay(product: CartProduct): number {
  if (!product.tags || !Array.isArray(product.tags)) {
    return 0;
  }

  return product.tags.reduce((maxDelay, tag) => {
    const delay = parseDelayFromTag(tag);
    return Math.max(maxDelay, delay);
  }, 0);
}

/**
 * Calculates the cart-level delivery delay based on all products
 *
 * The delay is determined by the product with the highest delay requirement.
 * This ensures that if any product in the cart needs extra preparation time,
 * the entire order reflects that delay.
 *
 * @param products - Array of cart products with their tags
 * @returns The highest delay in days found across all products (0 if no delays)
 *
 * @example
 * // Single product with delay
 * calculateCartDelay([{ tags: ["delay-2"] }]) // returns 2
 *
 * // Multiple products, highest delay wins
 * calculateCartDelay([
 *   { tags: ["delay"] },      // 1 day
 *   { tags: ["delay-3"] },    // 3 days
 *   { tags: ["cake-delay-2"] } // 2 days
 * ]) // returns 3
 *
 * // No delay tags
 * calculateCartDelay([{ tags: ["gift", "sale"] }]) // returns 0
 *
 * // Empty cart
 * calculateCartDelay([]) // returns 0
 */
export function calculateCartDelay(products: CartProduct[]): number {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return 0;
  }

  return products.reduce((maxDelay, product) => {
    const productDelay = getProductDelay(product);
    return Math.max(maxDelay, productDelay);
  }, 0);
}
