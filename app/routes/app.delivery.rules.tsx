import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import {
  DELIVERY_CITIES_QUERY,
  SLOT_DISABLE_RULES_QUERY,
  TIME_SLOTS_QUERY,
  transformToDeliveryCity,
  transformToTimeSlot,
} from "../services/deliveryConfigService";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const [citiesResponse, slotsResponse, rulesResponse] = await Promise.all([
    admin.graphql(DELIVERY_CITIES_QUERY, { variables: { first: 100 } }),
    admin.graphql(TIME_SLOTS_QUERY, { variables: { first: 100 } }),
    admin.graphql(SLOT_DISABLE_RULES_QUERY, { variables: { first: 250 } }),
  ]);

  const [citiesData, slotsData, rulesData] = await Promise.all([
    citiesResponse.json(),
    slotsResponse.json(),
    rulesResponse.json(),
  ]);

  const cities = (citiesData.data?.metaobjects?.nodes ?? []).map(
    (node: {
      id: string;
      handle: string;
      fields: Array<{ key: string; value: string | null }>;
    }) => ({
      ...transformToDeliveryCity(node),
      gid: node.id,
    }),
  );

  const slots = (slotsData.data?.metaobjects?.nodes ?? []).map(
    (node: {
      id: string;
      handle: string;
      fields: Array<{ key: string; value: string | null }>;
    }) => ({
      ...transformToTimeSlot(node),
      gid: node.id,
    }),
  );

  const rules = (rulesData.data?.metaobjects?.nodes ?? []).map(
    (node: {
      id: string;
      handle: string;
      fields: Array<{
        key: string;
        value: string | null;
        reference?: { id: string; handle: string } | null;
      }>;
    }) => {
      const slotField = node.fields.find(
        (f: { key: string }) => f.key === "slot",
      );
      const dateField = node.fields.find(
        (f: { key: string }) => f.key === "date",
      );
      const cityField = node.fields.find(
        (f: { key: string }) => f.key === "city",
      );

      return {
        gid: node.id,
        handle: node.handle,
        slotId: slotField?.reference?.handle ?? "",
        slotGid: slotField?.reference?.id ?? "",
        date: dateField?.value ?? "",
        cityId: cityField?.reference?.handle ?? "",
        cityGid: cityField?.reference?.id ?? "",
      };
    },
  );

  return { cities, slots, rules };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const slotGid = formData.get("slotGid") as string;
    const date = formData.get("date") as string;
    const cityGid = formData.get("cityGid") as string;

    const fields: Array<{ key: string; value: string }> = [
      { key: "slot", value: slotGid },
    ];

    if (date) {
      fields.push({ key: "date", value: date });
    }
    if (cityGid) {
      fields.push({ key: "city", value: cityGid });
    }

    const response = await admin.graphql(
      `#graphql
        mutation CreateRule($metaobject: MetaobjectCreateInput!) {
          metaobjectCreate(metaobject: $metaobject) {
            metaobject {
              id
              handle
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          metaobject: {
            type: "$app:slot_disable_rule",
            fields,
          },
        },
      },
    );

    const result = await response.json();
    return {
      success: !result.data?.metaobjectCreate?.userErrors?.length,
      result,
    };
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;

    const response = await admin.graphql(
      `#graphql
        mutation DeleteRule($id: ID!) {
          metaobjectDelete(id: $id) {
            deletedId
            userErrors {
              field
              message
            }
          }
        }
      `,
      { variables: { id } },
    );

    const result = await response.json();
    return {
      success: !result.data?.metaobjectDelete?.userErrors?.length,
      result,
    };
  }

  return { success: false, error: "Unknown intent" };
};

type City = { gid: string; id: string; name: string };
type Slot = { gid: string; id: string; label: string };
type Rule = {
  gid: string;
  handle: string;
  slotId: string;
  date: string;
  cityId: string;
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
        slotGid: selectedSlot,
        date: selectedDate,
        cityGid: selectedCity,
      },
      { method: "POST" },
    );
  };

  const getSlotLabel = (slotId: string) => {
    const slot = slots.find((s: Slot) => s.id === slotId);
    return slot?.label ?? slotId;
  };

  const getCityName = (cityId: string) => {
    const city = cities.find((c: City) => c.id === cityId);
    return city?.name ?? cityId;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "All dates";
    try {
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
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
                  htmlFor="slotGid"
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontWeight: 500,
                  }}
                >
                  Time Slot (required)
                </label>
                <select
                  id="slotGid"
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
                  {slots.map((slot: Slot) => (
                    <option key={slot.gid} value={slot.gid}>
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
                    htmlFor="cityGid"
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontWeight: 500,
                    }}
                  >
                    City (optional - leave empty for all cities)
                  </label>
                  <select
                    id="cityGid"
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
                    {cities.map((city: City) => (
                      <option key={city.gid} value={city.gid}>
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
            {rules.map((rule: Rule) => (
              <s-box key={rule.gid} padding="base" background="subdued">
                <s-stack direction="inline" gap="base" alignItems="center">
                  <s-stack direction="block" gap="small" inlineSize="auto">
                    <s-text type="strong">{getSlotLabel(rule.slotId)}</s-text>
                    <s-stack direction="inline" gap="small">
                      <s-badge>{formatDate(rule.date)}</s-badge>
                      <s-badge>
                        {rule.cityId ? getCityName(rule.cityId) : "All cities"}
                      </s-badge>
                    </s-stack>
                  </s-stack>
                  <fetcher.Form method="POST" style={{ marginLeft: "auto" }}>
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={rule.gid} />
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
