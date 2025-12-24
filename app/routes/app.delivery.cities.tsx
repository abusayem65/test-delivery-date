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
  transformToDeliveryCity,
} from "../services/deliveryConfigService";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(DELIVERY_CITIES_QUERY, {
    variables: { first: 100 },
  });
  const data = await response.json();

  const cities = (data.data?.metaobjects?.nodes ?? []).map(
    (node: {
      id: string;
      handle: string;
      fields: Array<{ key: string; value: string | null }>;
    }) => ({
      ...transformToDeliveryCity(node),
      gid: node.id,
    }),
  );

  return { cities };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const name = formData.get("name") as string;
    const isSpecial = formData.get("isSpecial") === "true";
    const cutoffTime = formData.get("cutoffTime") as string;

    // Check if city name already exists
    const existingResponse = await admin.graphql(DELIVERY_CITIES_QUERY, {
      variables: { first: 100 },
    });
    const existingData = await existingResponse.json();
    const existingCities = (existingData.data?.metaobjects?.nodes ?? []).map(
      (node: {
        id: string;
        handle: string;
        fields: Array<{ key: string; value: string | null }>;
      }) => transformToDeliveryCity(node),
    );
    const cityExists = existingCities.some(
      (city: { name: string }) =>
        city.name.toLowerCase() === name.trim().toLowerCase(),
    );

    if (cityExists) {
      return {
        success: false,
        error: `City "${name}" already exists`,
      };
    }

    const response = await admin.graphql(
      `#graphql
        mutation CreateCity($metaobject: MetaobjectCreateInput!) {
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
            type: "$app:delivery_city",
            fields: [
              { key: "name", value: name.trim() },
              { key: "is_special", value: String(isSpecial) },
              { key: "cutoff_time", value: cutoffTime || "" },
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

  if (intent === "delete") {
    const id = formData.get("id") as string;

    const response = await admin.graphql(
      `#graphql
        mutation DeleteCity($id: ID!) {
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

export default function DeliveryCities() {
  const { cities } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [cityName, setCityName] = useState("");
  const [cutoffTime, setCutoffTime] = useState("");
  const [isSpecial, setIsSpecial] = useState(false);

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("City saved successfully");
      // Reset form after successful submission
      setCityName("");
      setCutoffTime("");
      setIsSpecial(false);
    } else if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    fetcher.submit(
      {
        intent: "create",
        name: cityName,
        cutoffTime: cutoffTime,
        isSpecial: isSpecial ? "true" : "false",
      },
      { method: "POST" },
    );
  };

  return (
    <s-page heading="Delivery Cities">
      <s-link slot="breadcrumb-actions" href="/app/delivery">
        ← Back to Delivery Settings
      </s-link>

      <s-section heading="Add New City">
        <form onSubmit={handleCreate}>
          <s-stack direction="block" gap="base">
            <s-text-field
              label="City Name"
              value={cityName}
              placeholder="e.g., Dubai"
              required
              onInput={(e) =>
                setCityName(
                  (e.currentTarget as unknown as { value: string }).value,
                )
              }
            />

            <div>
              <label
                htmlFor="cutoffTime"
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontWeight: 500,
                  fontSize: "14px",
                }}
              >
                Cutoff Time
              </label>
              <input
                id="cutoffTime"
                type="time"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #8c9196",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              />
            </div>

            <s-checkbox
              label="Special City (stricter rules)"
              checked={isSpecial}
              onChange={() => setIsSpecial(!isSpecial)}
            />

            <s-button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add City"}
            </s-button>
          </s-stack>
        </form>
      </s-section>

      <s-section heading="Configured Cities">
        {cities.length === 0 ? (
          <s-paragraph>
            No cities configured yet. Add your first city above.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="small">
            {cities.map(
              (city: {
                gid: string;
                id: string;
                name: string;
                isSpecial: boolean;
                cutoffTime?: string;
              }) => (
                <s-box key={city.gid} padding="base" background="subdued">
                  <s-stack direction="inline" gap="base" alignItems="center">
                    <s-stack direction="block" gap="small" inlineSize="auto">
                      <s-text type="strong">{city.name}</s-text>
                      <s-stack direction="inline" gap="small">
                        {city.isSpecial && (
                          <s-badge tone="warning">Special</s-badge>
                        )}
                        {city.cutoffTime && (
                          <s-badge>Cutoff: {city.cutoffTime}</s-badge>
                        )}
                      </s-stack>
                    </s-stack>
                    <fetcher.Form method="POST" style={{ marginLeft: "auto" }}>
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={city.gid} />
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
