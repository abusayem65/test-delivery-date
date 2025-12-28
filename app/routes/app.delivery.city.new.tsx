import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "app/db.server";
import { authenticate } from "app/shopify.server";
import type { ActionFunctionArgs, HeadersFunction } from "react-router";
import { redirect, useRouteError } from "react-router";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case "create": {
      const name = formData.get("name") as string;
      const cutoffTime = formData.get("cutoffTime") as string;
      const isSpecial = formData.get("isSpecial") === "true";

      await db.city.create({
        data: {
          shop,
          name,
          cuttoffTime: cutoffTime,
          isSpecial,
        },
      });

      return redirect("/app/delivery/cities");
    }
    default: {
      return null;
    }
  }
};

export default function AddNewCityPage() {
  return (
    <s-page heading="Add New City">
      <s-link slot="breadcrumb-actions" href="/app/delivery/cities">
        ← Back to Cities
      </s-link>

      <s-section heading="City Details">
        <form method="POST" data-save-bar>
          <input type="hidden" name="intent" value="create" />

          <s-stack direction="block" gap="base">
            <s-text-field
              label="City Name"
              name="name"
              placeholder="e.g., Dubai"
              required
            />

            <s-stack direction="block">
              <label htmlFor="cutoffTime">Cutoff Time</label>
              <input
                id="cutoffTime"
                name="cutoffTime"
                type="time"
                style={{
                  padding: "8px 12px",
                  border: "1px solid #8c9196",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              />
            </s-stack>

            <s-checkbox label="Special City" name="isSpecial" />
          </s-stack>
        </form>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
