/**
 * Delivery Config Service
 *
 * Loads delivery configuration from Shopify Metaobjects.
 * This service handles the GraphQL queries and transforms the data
 * into the format expected by other delivery services.
 */

import type {
  DeliveryCity,
  DeliveryConfig,
  SlotDisableRule,
  TimeSlot,
} from "./types/delivery";

/**
 * GraphQL query to fetch all delivery cities
 */
export const DELIVERY_CITIES_QUERY = `#graphql
  query GetDeliveryCities($first: Int!) {
    metaobjects(type: "$app:delivery_city", first: $first) {
      nodes {
        id
        handle
        fields {
          key
          value
        }
      }
    }
  }
`;

/**
 * GraphQL query to fetch all time slots
 */
export const TIME_SLOTS_QUERY = `#graphql
  query GetTimeSlots($first: Int!) {
    metaobjects(type: "$app:delivery_time_slot", first: $first) {
      nodes {
        id
        handle
        fields {
          key
          value
        }
      }
    }
  }
`;

/**
 * GraphQL query to fetch all disabled dates
 */
export const DISABLED_DATES_QUERY = `#graphql
  query GetDisabledDates($first: Int!) {
    metaobjects(type: "$app:disabled_delivery_date", first: $first) {
      nodes {
        id
        handle
        fields {
          key
          value
        }
      }
    }
  }
`;

/**
 * GraphQL query to fetch all slot disable rules
 */
export const SLOT_DISABLE_RULES_QUERY = `#graphql
  query GetSlotDisableRules($first: Int!) {
    metaobjects(type: "$app:slot_disable_rule", first: $first) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ... on Metaobject {
              id
              handle
            }
          }
        }
      }
    }
  }
`;

/**
 * Helper to get field value from metaobject fields array
 */
function getFieldValue(
  fields: Array<{ key: string; value: string | null }>,
  key: string,
): string | null {
  const field = fields.find((f) => f.key === key);
  return field?.value ?? null;
}

/**
 * Helper to get reference handle from metaobject fields array
 */
function getFieldReference(
  fields: Array<{ key: string; reference?: { handle: string } | null }>,
  key: string,
): string | null {
  const field = fields.find((f) => f.key === key);
  return field?.reference?.handle ?? null;
}

/**
 * Transform raw metaobject data to DeliveryCity
 */
export function transformToDeliveryCity(metaobject: {
  id: string;
  handle: string;
  fields: Array<{ key: string; value: string | null }>;
}): DeliveryCity {
  return {
    id: metaobject.handle,
    name: getFieldValue(metaobject.fields, "name") ?? metaobject.handle,
    isSpecial: getFieldValue(metaobject.fields, "is_special") === "true",
    cutoffTime: getFieldValue(metaobject.fields, "cutoff_time") ?? undefined,
  };
}

/**
 * Transform raw metaobject data to TimeSlot
 */
export function transformToTimeSlot(metaobject: {
  id: string;
  handle: string;
  fields: Array<{ key: string; value: string | null }>;
}): TimeSlot {
  return {
    id: metaobject.handle,
    label: getFieldValue(metaobject.fields, "label") ?? metaobject.handle,
    startTime: getFieldValue(metaobject.fields, "start_time") ?? "00:00",
    endTime: getFieldValue(metaobject.fields, "end_time") ?? "23:59",
    isGloballyDisabled:
      getFieldValue(metaobject.fields, "is_globally_disabled") === "true",
  };
}

/**
 * Transform raw metaobject data to SlotDisableRule
 */
export function transformToSlotDisableRule(metaobject: {
  id: string;
  handle: string;
  fields: Array<{
    key: string;
    value: string | null;
    reference?: { handle: string } | null;
  }>;
}): SlotDisableRule {
  return {
    slotId: getFieldReference(metaobject.fields, "slot") ?? "",
    date: getFieldValue(metaobject.fields, "date") ?? undefined,
    cityId: getFieldReference(metaobject.fields, "city") ?? undefined,
  };
}

/**
 * Fetch and transform delivery configuration from Shopify Admin API
 *
 * @param admin - Authenticated admin GraphQL client
 * @returns Complete delivery configuration
 *
 * @example
 * const config = await fetchDeliveryConfig(admin);
 * console.log(config.cities);
 */
export async function fetchDeliveryConfig(admin: {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
}): Promise<DeliveryConfig> {
  const [citiesResponse, slotsResponse, datesResponse, rulesResponse] =
    await Promise.all([
      admin.graphql(DELIVERY_CITIES_QUERY, { variables: { first: 100 } }),
      admin.graphql(TIME_SLOTS_QUERY, { variables: { first: 100 } }),
      admin.graphql(DISABLED_DATES_QUERY, { variables: { first: 250 } }),
      admin.graphql(SLOT_DISABLE_RULES_QUERY, { variables: { first: 250 } }),
    ]);

  const [citiesData, slotsData, datesData, rulesData] = await Promise.all([
    citiesResponse.json(),
    slotsResponse.json(),
    datesResponse.json(),
    rulesResponse.json(),
  ]);

  const cities = (citiesData.data?.metaobjects?.nodes ?? []).map(
    transformToDeliveryCity,
  );

  const timeSlots = (slotsData.data?.metaobjects?.nodes ?? []).map(
    transformToTimeSlot,
  );

  const disabledDates = (datesData.data?.metaobjects?.nodes ?? [])
    .map((node: { fields: Array<{ key: string; value: string | null }> }) =>
      getFieldValue(node.fields, "date"),
    )
    .filter((date: string | null): date is string => date !== null);

  const slotDisableRules = (rulesData.data?.metaobjects?.nodes ?? []).map(
    transformToSlotDisableRule,
  );

  return {
    cities,
    timeSlots,
    disabledDates,
    slotDisableRules,
  };
}

/**
 * Create default delivery configuration for new installations
 * This is used when no metaobjects exist yet
 */
export function getDefaultDeliveryConfig(): DeliveryConfig {
  return {
    cities: [],
    timeSlots: [],
    disabledDates: [],
    slotDisableRules: [],
  };
}
