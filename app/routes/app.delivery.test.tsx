import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import {
  calculateCartDelay,
  getAvailableDates,
  getAvailableSlots,
  getMinimumDeliveryDate,
  isSameDayDeliveryAvailable,
  validateCheckout,
} from "../services";
import { fetchDeliveryConfig } from "../services/deliveryConfigService";
import type {
  CartProduct,
  CheckoutFields,
  DeliveryCity,
  TimeSlot,
} from "../services/types/delivery";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const config = await fetchDeliveryConfig(admin);
  return { config };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const config = await fetchDeliveryConfig(admin);

  // Parse cart products from form
  const tagsInput = formData.get("tags") as string;
  const tags = tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const cartProducts: CartProduct[] = [{ tags }];

  // Get selected city
  const cityId = formData.get("cityId") as string;
  const selectedCity = config.cities.find((c) => c.id === cityId);

  // Calculate results
  const cartDelay = calculateCartDelay(cartProducts);
  const now = new Date();

  let minimumDate: Date;
  let sameDayAvailable = false;

  if (selectedCity) {
    sameDayAvailable = isSameDayDeliveryAvailable(selectedCity, now);
    minimumDate = getMinimumDeliveryDate(selectedCity, now, cartDelay);
  } else {
    // No city selected, use base delay
    minimumDate = new Date(now);
    minimumDate.setDate(minimumDate.getDate() + cartDelay);
  }

  // Get available dates (next 14 days from minimum)
  const availableDates = getAvailableDates(
    minimumDate,
    14,
    config.disabledDates,
  );

  // Get available slots for first available date
  const firstAvailableDate = availableDates[0] ?? "";
  const slotsForDate = getAvailableSlots(
    config.timeSlots,
    firstAvailableDate,
    cityId || null,
    config.slotDisableRules,
  );

  // Test checkout validation
  const checkoutFields: CheckoutFields = {
    fullName: (formData.get("fullName") as string) || "",
    phoneNumber: (formData.get("phoneNumber") as string) || "",
    deliveryAddress: (formData.get("deliveryAddress") as string) || "",
    deliveryDate: firstAvailableDate,
    deliveryTimeSlot: slotsForDate.find((s) => !s.disabled)?.slot.id ?? "",
  };

  const checkoutValidation = validateCheckout(checkoutFields);

  return {
    cartDelay,
    sameDayAvailable,
    minimumDate: minimumDate.toISOString().split("T")[0],
    availableDates,
    slotsForDate,
    checkoutValidation,
    input: {
      tags,
      cityId,
      cityName: selectedCity?.name,
    },
  };
};

export default function DeliveryTest() {
  const { config } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const [cityId, setCityId] = useState("");

  const isLoading = fetcher.state !== "idle";

  return (
    <s-page heading="Delivery Calculator Test">
      <s-link slot="breadcrumb-actions" href="/app/delivery">
        ← Back to Delivery Settings
      </s-link>

      <s-section heading="Test Input">
        <fetcher.Form method="POST">
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Product Tags (comma-separated)"
              name="tags"
              defaultValue="delay-2"
              placeholder="delay, delay-2, cake-delay-3"
            />

            <div>
              <label
                htmlFor="cityId"
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontWeight: 500,
                }}
              >
                City
              </label>
              <select
                id="cityId"
                name="cityId"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                style={{
                  padding: "8px",
                  width: "100%",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              >
                <option value="">No city selected</option>
                {config.cities.map((city: DeliveryCity) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                    {city.cutoffTime ? ` (cutoff: ${city.cutoffTime})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <s-button type="submit" disabled={isLoading}>
              {isLoading ? "Calculating..." : "Calculate Delivery Options"}
            </s-button>
          </s-stack>
        </fetcher.Form>
      </s-section>

      {fetcher.data && (
        <>
          <s-section heading="Results">
            <s-stack direction="block" gap="base">
              <s-box padding="base" background="subdued">
                <s-stack direction="block" gap="small">
                  <s-text type="strong">Input:</s-text>
                  <s-paragraph>
                    Tags: {fetcher.data.input.tags.join(", ") || "(none)"}
                  </s-paragraph>
                  <s-paragraph>
                    City: {fetcher.data.input.cityName || "(none selected)"}
                  </s-paragraph>
                </s-stack>
              </s-box>

              <s-box padding="base" background="subdued">
                <s-stack direction="block" gap="small">
                  <s-text type="strong">Calculated Values:</s-text>
                  <s-paragraph>
                    Cart Delay: <s-badge>{fetcher.data.cartDelay} days</s-badge>
                  </s-paragraph>
                  <s-paragraph>
                    Same-day Available:{" "}
                    <s-badge
                      tone={
                        fetcher.data.sameDayAvailable ? "success" : "critical"
                      }
                    >
                      {fetcher.data.sameDayAvailable ? "Yes" : "No"}
                    </s-badge>
                  </s-paragraph>
                  <s-paragraph>
                    Minimum Date: <s-badge>{fetcher.data.minimumDate}</s-badge>
                  </s-paragraph>
                </s-stack>
              </s-box>
            </s-stack>
          </s-section>

          <s-section heading="Available Dates">
            <s-stack direction="inline" gap="small">
              {fetcher.data.availableDates.slice(0, 7).map((date: string) => (
                <s-badge key={date}>{date}</s-badge>
              ))}
              {fetcher.data.availableDates.length > 7 && (
                <s-badge tone="neutral">
                  +{fetcher.data.availableDates.length - 7} more
                </s-badge>
              )}
            </s-stack>
          </s-section>

          <s-section heading="Time Slots (for first available date)">
            {fetcher.data.slotsForDate.length === 0 ? (
              <s-paragraph>No time slots configured.</s-paragraph>
            ) : (
              <s-stack direction="block" gap="small">
                {fetcher.data.slotsForDate.map(
                  (item: {
                    slot: TimeSlot;
                    disabled: boolean;
                    reason?: string;
                  }) => (
                    <s-stack key={item.slot.id} direction="inline" gap="small">
                      <s-badge tone={item.disabled ? "critical" : "success"}>
                        {item.slot.label}
                      </s-badge>
                      {item.disabled && item.reason && (
                        <s-text color="subdued">({item.reason})</s-text>
                      )}
                    </s-stack>
                  ),
                )}
              </s-stack>
            )}
          </s-section>

          <s-section heading="Checkout Validation">
            <s-stack direction="block" gap="small">
              <s-paragraph>
                Status:{" "}
                <s-badge
                  tone={
                    fetcher.data.checkoutValidation.isValid
                      ? "success"
                      : "critical"
                  }
                >
                  {fetcher.data.checkoutValidation.isValid
                    ? "Valid"
                    : "Invalid"}
                </s-badge>
              </s-paragraph>
              {fetcher.data.checkoutValidation.errors.length > 0 && (
                <s-box padding="base" background="subdued">
                  <s-stack direction="block" gap="small">
                    <s-text type="strong">Missing fields:</s-text>
                    {fetcher.data.checkoutValidation.errors.map(
                      (error: string, i: number) => (
                        <s-paragraph key={i}>• {error}</s-paragraph>
                      ),
                    )}
                  </s-stack>
                </s-box>
              )}
            </s-stack>
          </s-section>
        </>
      )}

      <s-section slot="aside" heading="Configuration Summary">
        <s-stack direction="block" gap="small">
          <s-paragraph>
            <s-text type="strong">Cities:</s-text> {config.cities.length}
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">Time Slots:</s-text> {config.timeSlots.length}
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">Disabled Dates:</s-text>{" "}
            {config.disabledDates.length}
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">Slot Rules:</s-text>{" "}
            {config.slotDisableRules.length}
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useLoaderData());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
