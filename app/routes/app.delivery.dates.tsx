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
  createDateDisableRule,
  loadDateDisableRules,
} from "../services/deliveryConfigService";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const dates = await loadDateDisableRules(prisma, shop);

  return { dates };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const startDateStr = formData.get("date") as string;
    const reason = formData.get("reason") as string;

    try {
      await createDateDisableRule(prisma, shop, {
        startDate: new Date(startDateStr),
        endDate: null,
        reason: reason || null,
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
    const id = parseInt(formData.get("id") as string, 10);

    try {
      await prisma.disableDateRules.update({
        where: { id },
        data: { isActive: false },
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

export default function DisabledDates() {
  const { dates } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Disabled date saved successfully");
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

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Check if date is in the past
  const isPast = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr + "T00:00:00");
    return date < today;
  };

  return (
    <s-page heading="Disabled Delivery Dates">
      <s-link slot="breadcrumb-actions" href="/app/delivery">
        ← Back to Delivery Settings
      </s-link>

      <s-section heading="Add Disabled Date">
        <fetcher.Form method="POST" onSubmit={handleCreate}>
          <s-stack direction="block" gap="base">
            <s-date-field label="Date" name="date" required />

            <s-text-field
              label="Reason (optional)"
              name="reason"
              placeholder="e.g., National Holiday, Maintenance"
            />

            <s-button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Disabled Date"}
            </s-button>
          </s-stack>
        </fetcher.Form>
      </s-section>

      <s-section heading="Disabled Dates">
        {dates.length === 0 ? (
          <s-paragraph>
            No dates disabled yet. Add dates when delivery is not available.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="small">
            {dates.map((item) => (
              <s-box
                key={item.id}
                padding="base"
                background={isPast(item.startDate) ? "subdued" : "base"}
              >
                <s-stack direction="inline" gap="base" alignItems="center">
                  <s-stack direction="block" gap="small" inlineSize="auto">
                    <s-text type="strong">
                      {formatDate(item.startDate)}
                      {item.endDate && ` - ${formatDate(item.endDate)}`}
                    </s-text>
                    <s-stack direction="inline" gap="small">
                      {item.reason && <s-badge>{item.reason}</s-badge>}
                      {isPast(item.startDate) && (
                        <s-badge tone="neutral">Past</s-badge>
                      )}
                    </s-stack>
                  </s-stack>
                  <fetcher.Form method="POST" style={{ marginLeft: "auto" }}>
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={item.id} />
                    <s-button
                      variant="tertiary"
                      tone="critical"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      Remove
                    </s-button>
                  </fetcher.Form>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="Tips">
        <s-stack direction="block" gap="small">
          <s-paragraph>
            <s-text type="strong">Holidays:</s-text> Add national and religious
            holidays when your team is unavailable.
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">Maintenance:</s-text> Block dates for
            scheduled maintenance or inventory.
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">Past dates:</s-text> Old entries are kept for
            records but will not affect delivery selection.
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
