import { CallbackEvent } from "@shopify/polaris-types";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import prisma from "../db.server";
import {
  createCity,
  loadCities,
  updateCity,
} from "../services/deliveryConfigService";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const cities = await loadCities(prisma, shop);

  return { cities };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const name = formData.get("name") as string;
    const isSpecial = formData.get("isSpecial") === "true";
    const cutoffTime = formData.get("cutoffTime") as string;

    // Check if city name already exists
    const existingCities = await loadCities(prisma, shop);
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

    try {
      const newCity = await createCity(prisma, shop, {
        name: name.trim(),
        isSpecial,
        cutoffTime,
      });

      return {
        success: true,
        city: newCity,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create city",
      };
    }
  }

  if (intent === "update") {
    const id = parseInt(formData.get("id") as string);
    const name = formData.get("name") as string;
    const isSpecial = formData.get("isSpecial") === "true";
    const cutoffTime = formData.get("cutoffTime") as string;

    try {
      const updated = await updateCity(prisma, shop, id, {
        name: name.trim(),
        isSpecial,
        cutoffTime,
      });

      if (!updated) {
        return {
          success: false,
          error: "City not found",
        };
      }

      return {
        success: true,
        city: updated,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update city",
      };
    }
  }

  if (intent === "delete") {
    const id = parseInt(formData.get("id") as string);

    try {
      await updateCity(prisma, shop, id, { isActive: false });

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete city",
      };
    }
  }

  return { success: false, error: "Unknown intent" };
};

export default function DeliveryCities() {
  const { cities } = useLoaderData<typeof loader>();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Filter cities based on debounced query
  const filteredCities = debouncedQuery
    ? cities.filter((city) =>
        city.name.toLowerCase().includes(debouncedQuery.toLowerCase()),
      )
    : cities;

  const handleSearchInput = (event: CallbackEvent<"s-search-field">) => {
    const query = event.currentTarget.value;
    setSearchQuery(query);
  };

  return (
    <s-page heading="Delivery Cities">
      <s-link slot="breadcrumb-actions" href="/app/delivery">
         Back to Delivery Settings
      </s-link>

      <s-link
        slot="primary-action"
        href="/app/delivery/city/new"
      >
        Add City
      </s-link>

      {/* === */}
      {/* Empty state */}
      {/* This should only be visible if the merchant has not created any puzzles yet. */}
      {/* === */}
      {cities.length === 0 && (
        <s-section accessibilityLabel="Empty state section">
          <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
            <s-box maxInlineSize="200px" maxBlockSize="200px">
              {/* aspectRatio should match the actual image dimensions (width/height) */}
              <s-image
                aspectRatio="1/0.5"
                src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
                alt="A stylized graphic of four characters, each holding a puzzle piece"
              />
            </s-box>
            <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
              <s-stack alignItems="center">
                <s-heading>No Delivery Cities </s-heading>
                <s-paragraph>
                  Add delivery city to manage delivery availability and cutoff
                  times.
                </s-paragraph>
              </s-stack>
              <s-button-group>
                <s-button
                  slot="primary-action"
                  accessibilityLabel="Add a new puzzle"
                  href="/app/delivery/city/new"
                >
                  {" "}
                  Add city{" "}
                </s-button>
              </s-button-group>
            </s-grid>
          </s-grid>
        </s-section>
      )}

      {/* === */}
      {/* Table */}
      {/* This should only be visible if the merchant has created one or more puzzles. */}
      {/* === */}
      <s-section
        padding="none"
        accessibilityLabel="Delivery cities table section"
      >
        <s-table variant="auto">
          <s-grid slot="filters" gap="small-200" gridTemplateColumns="1fr auto">
            <s-search-field
              label="Search Cities"
              labelAccessibilityVisibility="exclusive"
              placeholder="Searching all cities"
              value={searchQuery}
              onInput={handleSearchInput}
            ></s-search-field>
            <s-button
              icon="sort"
              variant="secondary"
              accessibilityLabel="Sort"
              interestFor="sort-tooltip"
              commandFor="sort-actions"
            />
            <s-tooltip id="sort-tooltip">
              <s-text>Sort</s-text>
            </s-tooltip>
            <s-popover id="sort-actions">
              <s-stack gap="none">
                <s-box padding="small">
                  <s-choice-list label="Sort by" name="Sort by">
                    <s-choice value="puzzle-name" selected>
                      City name
                    </s-choice>
                    <s-choice value="created">Created</s-choice>
                    <s-choice value="status">Status</s-choice>
                  </s-choice-list>
                </s-box>
                <s-divider />
                <s-box padding="small">
                  <s-choice-list label="Order by" name="Order by">
                    <s-choice value="product-title" selected>
                      A-Z
                    </s-choice>
                    <s-choice value="created">Z-A</s-choice>
                  </s-choice-list>
                </s-box>
              </s-stack>
            </s-popover>
          </s-grid>
          {cities.length > 0 && filteredCities.length > 0 && (
            <>
              <s-table-header-row>
                <s-table-header listSlot="primary">Name</s-table-header>
                <s-table-header>Special City</s-table-header>
                <s-table-header>Cuttoff Time</s-table-header>
                <s-table-header>Status</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {filteredCities.map((city) => (
                  <s-table-row
                    key={city.id}
                    clickDelegate={`clickable-${city.id}`}
                  >
                    <s-table-cell>
                      <s-link
                        href={`/app/delivery/city/${city.id}`}
                        id={`clickable-${city.id}`}
                        accessibilityLabel="Mountain View puzzle thumbnail"
                      >
                        {city.name.toUpperCase()}
                      </s-link>
                    </s-table-cell>
                    <s-table-cell>
                      {city.isSpecial ? (
                        <s-badge color="strong">Yes</s-badge>
                      ) : (
                        <s-badge color="base">No</s-badge>
                      )}
                    </s-table-cell>
                    <s-table-cell>
                      <s-text color="base">
                        {city.cutoffTime || "Not set"}{" "}
                      </s-text>
                    </s-table-cell>
                    <s-table-cell>
                      {city.isActive ? (
                        <s-badge color="base" tone="success">
                          Active
                        </s-badge>
                      ) : (
                        <s-badge color="base" tone="critical">
                          Inactive
                        </s-badge>
                      )}
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </>
          )}
        </s-table>
        {/* === */}
        {/* No search results */}
        {/* === */}
        {cities.length > 0 && filteredCities.length === 0 && (
          <s-section accessibilityLabel="No results section">
            <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
              <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
                <s-stack alignItems="center">
                  <s-heading>No cities found</s-heading>
                  <s-paragraph>
                    Try adjusting your search to find what you&apos;re looking
                    for.
                  </s-paragraph>
                </s-stack>
              </s-grid>
            </s-grid>
          </s-section>
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
