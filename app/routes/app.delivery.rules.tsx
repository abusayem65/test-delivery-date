import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import prisma from "../db.server";
import {
  createSlotDisableRule,
  loadCities,
  loadSlotDisableRules,
  loadTimeSlots,
} from "../services/deliveryConfigService";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [cities, slots, rules] = await Promise.all([
    loadCities(prisma, shop),
    loadTimeSlots(prisma, shop),
    loadSlotDisableRules(prisma, shop),
  ]);

  return { cities, slots, rules };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const timeSlotId = parseInt(formData.get("timeSlotId") as string);
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const cityIdStr = formData.get("cityId") as string;
    const reason = formData.get("reason") as string;

    try {
      await createSlotDisableRule(prisma, shop, {
        timeSlotId,
        startDate: new Date(startDateStr),
        endDate: endDateStr ? new Date(endDateStr) : undefined,
        cityId: cityIdStr ? parseInt(cityIdStr) : undefined,
        reason: reason || undefined,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create rule",
      };
    }
  }

  if (intent === "delete") {
    const id = parseInt(formData.get("id") as string);

    try {
      await prisma.disableTimeSlotRules.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete rule",
      };
    }
  }

  return { success: false, error: "Unknown intent" };
};

export default function SlotDisableRules() {
  const { cities, slots, rules } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Rule saved successfully");
      setSelectedSlot("");
      setSelectedCity("");
      setSelectedDate("");
    }
  }, [fetcher.data, shopify]);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedSlot) {
      shopify.toast.show("Please select a time slot", { isError: true });
      return;
    }

    fetcher.submit(
      {
        intent: "create",
        timeSlotId: selectedSlot,
        date: selectedDate,
        cityId: selectedCity,
      },
      { method: "POST" },
    );
  };

  const getSlotLabel = (slotId: number) => {
    const slot = slots.find((s) => s.id === slotId);
    return slot?.label ?? slotId.toString();
  };

  const getCityName = (cityId: number | null | undefined) => {
    if (!cityId) return "All cities";
    const city = cities.find((c) => c.id === cityId);
    return city?.name ?? cityId.toString();
  };

  const formatDate = (startDate: string, endDate?: string | null) => {
    if (!startDate) return "All dates";
    try {
      const start = new Date(startDate + "T00:00:00");
      const startStr = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      if (!endDate) return startStr;

      const end = new Date(endDate + "T00:00:00");
      const endStr = end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      return `${startStr} - ${endStr}`;
    } catch {
      return startDate;
    }
  };

  return (
    <s-page heading="Slot Disable Rules">
      <s-link slot="breadcrumb-actions" href="/app/delivery">
        ← Back to Delivery Settings
      </s-link>

      <s-section heading="Add Rule">
        <s-paragraph>
          Create rules to disable specific time slots on certain dates or for
          specific cities.
        </s-paragraph>

        {slots.length === 0 ? (
          <s-box padding="base" background="subdued">
            <s-paragraph>
              You need to create time slots first before adding rules.{" "}
              <s-link href="/app/delivery/slots">Add Time Slots</s-link>
            </s-paragraph>
          </s-box>
        ) : (
          <form onSubmit={handleCreate}>
            <s-stack direction="block" gap="base">
              <div>
                <label
                  htmlFor="timeSlotId"
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontWeight: 500,
                  }}
                >
                  Time Slot (required)
                </label>
                <select
                  id="timeSlotId"
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  required
                  style={{
                    padding: "8px",
                    width: "100%",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                >
                  <option value="">Select a time slot...</option>
                  {slots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="ruleDate"
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontWeight: 500,
                  }}
                >
                  Date (optional - leave empty for all dates)
                </label>
                <input
                  id="ruleDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
              </div>

              {cities.length > 0 && (
                <div>
                  <label
                    htmlFor="cityId"
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontWeight: 500,
                    }}
                  >
                    City (optional - leave empty for all cities)
                  </label>
                  <select
                    id="cityId"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    style={{
                      padding: "8px",
                      width: "100%",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  >
                    <option value="">All cities</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <s-button type="submit" disabled={isSubmitting || !selectedSlot}>
                {isSubmitting ? "Adding..." : "Add Rule"}
              </s-button>
            </s-stack>
          </form>
        )}
      </s-section>

      <s-section heading="Active Rules">
        {rules.length === 0 ? (
          <s-paragraph>
            No rules configured yet. Rules let you disable specific slots
            conditionally.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="small">
            {rules.map((rule) => (
              <s-box key={rule.id} padding="base" background="subdued">
                <s-stack direction="inline" gap="base" alignItems="center">
                  <s-stack direction="block" gap="small" inlineSize="auto">
                    <s-text type="strong">
                      {getSlotLabel(rule.timeSlotId)}
                    </s-text>
                    <s-stack direction="inline" gap="small">
                      <s-badge>
                        {formatDate(rule.startDate, rule.endDate)}
                      </s-badge>
                      <s-badge>{getCityName(rule.cityId)}</s-badge>
                    </s-stack>
                  </s-stack>
                  <fetcher.Form method="POST" style={{ marginLeft: "auto" }}>
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={rule.id} />
                    <s-button
                      variant="tertiary"
                      tone="critical"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      Delete
                    </s-button>
                  </fetcher.Form>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="Rule Priority">
        <s-stack direction="block" gap="small">
          <s-paragraph>Rules are applied in this order:</s-paragraph>
          <s-paragraph>
            <s-text type="strong">1. Global disable</s-text> - Set on the time
            slot itself
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">2. Date-specific</s-text> - Rules with a date
            but no city
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">3. City + Date</s-text> - Most specific rules
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
