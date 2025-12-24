import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import {
  TIME_SLOTS_QUERY,
  transformToTimeSlot,
} from "../services/deliveryConfigService";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(TIME_SLOTS_QUERY, {
    variables: { first: 100 },
  });
  const data = await response.json();

  const slots = (data.data?.metaobjects?.nodes ?? []).map(
    (node: {
      id: string;
      handle: string;
      fields: Array<{ key: string; value: string | null }>;
    }) => ({
      ...transformToTimeSlot(node),
      gid: node.id,
    }),
  );

  return { slots };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const label = formData.get("label") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const isGloballyDisabled = formData.get("isGloballyDisabled") === "true";

    const response = await admin.graphql(
      `#graphql
        mutation CreateSlot($metaobject: MetaobjectCreateInput!) {
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
            type: "$app:delivery_time_slot",
            fields: [
              { key: "label", value: label },
              { key: "start_time", value: startTime },
              { key: "end_time", value: endTime },
              {
                key: "is_globally_disabled",
                value: String(isGloballyDisabled),
              },
            ],
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

  if (intent === "toggle") {
    const id = formData.get("id") as string;
    const isGloballyDisabled = formData.get("isGloballyDisabled") === "true";

    const response = await admin.graphql(
      `#graphql
        mutation UpdateSlot($id: ID!, $metaobject: MetaobjectUpdateInput!) {
          metaobjectUpdate(id: $id, metaobject: $metaobject) {
            metaobject {
              id
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
          id,
          metaobject: {
            fields: [
              {
                key: "is_globally_disabled",
                value: String(isGloballyDisabled),
              },
            ],
          },
        },
      },
    );

    const result = await response.json();
    return {
      success: !result.data?.metaobjectUpdate?.userErrors?.length,
      result,
    };
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;

    const response = await admin.graphql(
      `#graphql
        mutation DeleteSlot($id: ID!) {
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

export default function DeliverySlots() {
  const { slots } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Time slot saved successfully");
    }
  }, [fetcher.data, shopify]);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("intent", "create");
    fetcher.submit(formData, { method: "POST" });
    form.reset();
  };

  return (
    <s-page heading="Delivery Time Slots">
      <s-link slot="breadcrumb-actions" href="/app/delivery">
        ← Back to Delivery Settings
      </s-link>

      <s-section heading="Add New Time Slot">
        <fetcher.Form method="POST" onSubmit={handleCreate}>
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Display Label"
              name="label"
              required
              placeholder="e.g., 09:30 AM - 12:00 PM"
            />

            <s-stack direction="inline" gap="base">
              <div>
                <label
                  htmlFor="startTime"
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontWeight: 500,
                  }}
                >
                  Start Time
                </label>
                <input
                  id="startTime"
                  type="time"
                  name="startTime"
                  required
                  style={{
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="endTime"
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontWeight: 500,
                  }}
                >
                  End Time
                </label>
                <input
                  id="endTime"
                  type="time"
                  name="endTime"
                  required
                  style={{
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
              </div>
            </s-stack>

            <s-button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Time Slot"}
            </s-button>
          </s-stack>
        </fetcher.Form>
      </s-section>

      <s-section heading="Configured Time Slots">
        {slots.length === 0 ? (
          <s-paragraph>
            No time slots configured yet. Add your first slot above.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="small">
            {slots.map(
              (slot: {
                gid: string;
                id: string;
                label: string;
                startTime: string;
                endTime: string;
                isGloballyDisabled: boolean;
              }) => (
                <s-box key={slot.gid} padding="base" background="subdued">
                  <s-stack direction="inline" gap="base" alignItems="center">
                    <s-stack direction="block" gap="small" inlineSize="auto">
                      <s-text type="strong">{slot.label}</s-text>
                      <s-stack direction="inline" gap="small">
                        <s-badge>
                          {slot.startTime} - {slot.endTime}
                        </s-badge>
                        {slot.isGloballyDisabled && (
                          <s-badge tone="critical">Disabled</s-badge>
                        )}
                      </s-stack>
                    </s-stack>
                    <div
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <fetcher.Form method="POST">
                        <input type="hidden" name="intent" value="toggle" />
                        <input type="hidden" name="id" value={slot.gid} />
                        <input
                          type="hidden"
                          name="isGloballyDisabled"
                          value={String(!slot.isGloballyDisabled)}
                        />
                        <s-button
                          variant="tertiary"
                          type="submit"
                          disabled={isSubmitting}
                        >
                          {slot.isGloballyDisabled ? "Enable" : "Disable"}
                        </s-button>
                      </fetcher.Form>
                      <fetcher.Form method="POST">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={slot.gid} />
                        <s-button
                          variant="tertiary"
                          tone="critical"
                          type="submit"
                          disabled={isSubmitting}
                        >
                          Delete
                        </s-button>
                      </fetcher.Form>
                    </div>
                  </s-stack>
                </s-box>
              ),
            )}
          </s-stack>
        )}
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
