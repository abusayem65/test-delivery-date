import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import prisma from "../db.server";
import {
  createTimeSlot,
  loadTimeSlots,
  updateTimeSlot,
} from "../services/deliveryConfigService";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const slots = await loadTimeSlots(prisma, shop);

  return { slots };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    try {
      const newSlot = await createTimeSlot(prisma, shop, {
        startTime,
        endTime,
      });

      return {
        success: true,
        slot: newSlot,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create time slot",
      };
    }
  }

  if (intent === "update") {
    const id = parseInt(formData.get("id") as string);
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const isActive = formData.get("isActive") !== "false";

    try {
      const updated = await updateTimeSlot(prisma, shop, id, {
        startTime,
        endTime,
        isActive,
      });

      if (!updated) {
        return {
          success: false,
          error: "Time slot not found",
        };
      }

      return {
        success: true,
        slot: updated,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update time slot",
      };
    }
  }

  if (intent === "toggle") {
    const id = parseInt(formData.get("id") as string);
    const isActive = formData.get("isActive") === "true";

    try {
      const updated = await updateTimeSlot(prisma, shop, id, {
        isActive,
      });

      if (!updated) {
        return {
          success: false,
          error: "Time slot not found",
        };
      }

      return {
        success: true,
        slot: updated,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to toggle time slot",
      };
    }
  }

  if (intent === "delete") {
    const id = parseInt(formData.get("id") as string);

    try {
      await updateTimeSlot(prisma, shop, id, { isActive: false });

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete time slot",
      };
    }
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
                id: number;
                label?: string;
                startTime: string;
                endTime: string;
                isActive: boolean;
              }) => (
                <s-box key={slot.id} padding="base" background="subdued">
                  <s-stack direction="inline" gap="base" alignItems="center">
                    <s-stack direction="block" gap="small" inlineSize="auto">
                      <s-text type="strong">
                        {slot.label || `${slot.startTime} - ${slot.endTime}`}
                      </s-text>
                      <s-stack direction="inline" gap="small">
                        <s-badge>
                          {slot.startTime} - {slot.endTime}
                        </s-badge>
                        {!slot.isActive && (
                          <s-badge tone="critical">Inactive</s-badge>
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
                        <input type="hidden" name="id" value={slot.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={String(!slot.isActive)}
                        />
                        <s-button
                          variant="tertiary"
                          type="submit"
                          disabled={isSubmitting}
                        >
                          {slot.isActive ? "Disable" : "Enable"}
                        </s-button>
                      </fetcher.Form>
                      <fetcher.Form method="POST">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={slot.id} />
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
