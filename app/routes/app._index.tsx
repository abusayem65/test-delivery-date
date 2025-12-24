import { boundary } from "@shopify/shopify-app-react-router/server";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { fetchDeliveryConfig } from "../services/deliveryConfigService";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const config = await fetchDeliveryConfig(admin);

  // Calculate some derived stats
  const specialCitiesCount = config.cities.filter((c) => c.isSpecial).length;
  const citiesWithCutoff = config.cities.filter((c) => c.cutoffTime).length;

  return {
    citiesCount: config.cities.length,
    specialCitiesCount,
    citiesWithCutoff,
    slotsCount: config.timeSlots.length,
    disabledDatesCount: config.disabledDates.length,
    rulesCount: config.slotDisableRules.length,
    // Check if app is configured
    isConfigured: config.cities.length > 0 && config.timeSlots.length > 0,
  };
};

export default function Index() {
  const {
    citiesCount,
    specialCitiesCount,
    citiesWithCutoff,
    slotsCount,
    disabledDatesCount,
    rulesCount,
    isConfigured,
  } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Delivery Rules">
      <s-button slot="primary-action" href="/app/delivery">
        Manage Settings
      </s-button>

      {/* Status Banner */}
      {!isConfigured && (
        <s-banner tone="warning" heading="Complete your setup">
          Configure your delivery cities and time slots to enable cart delivery
          scheduling. <s-link href="/app/delivery">Go to settings</s-link>
        </s-banner>
      )}

      {isConfigured && (
        <s-banner tone="success" heading="App configured">
          Your delivery rules are active and ready for customers.
        </s-banner>
      )}

      {/* Metrics Cards */}
      <s-section padding="base">
        <s-grid
          gridTemplateColumns="@container (inline-size <= 400px) 1fr, 1fr auto 1fr auto 1fr auto 1fr"
          gap="small"
        >
          <s-clickable
            href="/app/delivery/cities"
            paddingBlock="small-400"
            paddingInline="small-100"
            borderRadius="base"
          >
            <s-grid gap="small-300">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-icon type="location" />
                <s-heading>Cities</s-heading>
              </s-stack>
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-text type="strong">{citiesCount}</s-text>
                {specialCitiesCount > 0 && (
                  <s-badge tone="info">{specialCitiesCount} special</s-badge>
                )}
              </s-stack>
            </s-grid>
          </s-clickable>
          <s-divider direction="block" />
          <s-clickable
            href="/app/delivery/slots"
            paddingBlock="small-400"
            paddingInline="small-100"
            borderRadius="base"
          >
            <s-grid gap="small-300">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-icon type="clock" />
                <s-heading>Time Slots</s-heading>
              </s-stack>
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-text type="strong">{slotsCount}</s-text>
                <s-badge tone="success">Active</s-badge>
              </s-stack>
            </s-grid>
          </s-clickable>
          <s-divider direction="block" />
          <s-clickable
            href="/app/delivery/dates"
            paddingBlock="small-400"
            paddingInline="small-100"
            borderRadius="base"
          >
            <s-grid gap="small-300">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-icon type="calendar" />
                <s-heading>Blocked Dates</s-heading>
              </s-stack>
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-text type="strong">{disabledDatesCount}</s-text>
                {disabledDatesCount > 0 && (
                  <s-badge tone="warning">Disabled</s-badge>
                )}
              </s-stack>
            </s-grid>
          </s-clickable>
          <s-divider direction="block" />
          <s-clickable
            href="/app/delivery/rules"
            paddingBlock="small-400"
            paddingInline="small-100"
            borderRadius="base"
          >
            <s-grid gap="small-300">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-icon type="automation" />
                <s-heading>Slot Rules</s-heading>
              </s-stack>
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-text type="strong">{rulesCount}</s-text>
                {rulesCount > 0 && <s-badge tone="neutral">Active</s-badge>}
              </s-stack>
            </s-grid>
          </s-clickable>
        </s-grid>
      </s-section>

      {/* Quick Actions - Interstitial Navigation */}
      <s-section heading="Quick Actions">
        <s-box border="base" borderRadius="base">
          <s-clickable
            padding="small-100"
            href="/app/delivery/cities"
            accessibilityLabel="Manage delivery cities and cutoff times"
          >
            <s-grid
              gridTemplateColumns="1fr auto"
              alignItems="center"
              gap="base"
            >
              <s-box>
                <s-heading>Delivery Cities</s-heading>
                <s-paragraph color="subdued">
                  Configure cities with cutoff times and special delivery rules.
                </s-paragraph>
              </s-box>
              <s-icon type="chevron-right" />
            </s-grid>
          </s-clickable>
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>
          <s-clickable
            padding="small-100"
            href="/app/delivery/slots"
            accessibilityLabel="Manage delivery time slots"
          >
            <s-grid
              gridTemplateColumns="1fr auto"
              alignItems="center"
              gap="base"
            >
              <s-box>
                <s-heading>Time Slots</s-heading>
                <s-paragraph color="subdued">
                  Define delivery time windows customers can select at checkout.
                </s-paragraph>
              </s-box>
              <s-icon type="chevron-right" />
            </s-grid>
          </s-clickable>
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>
          <s-clickable
            padding="small-100"
            href="/app/delivery/dates"
            accessibilityLabel="Manage disabled delivery dates"
          >
            <s-grid
              gridTemplateColumns="1fr auto"
              alignItems="center"
              gap="base"
            >
              <s-box>
                <s-heading>Disabled Dates</s-heading>
                <s-paragraph color="subdued">
                  Block holidays, maintenance days, or any dates from delivery.
                </s-paragraph>
              </s-box>
              <s-icon type="chevron-right" />
            </s-grid>
          </s-clickable>
          <s-box paddingInline="small-100">
            <s-divider />
          </s-box>
          <s-clickable
            padding="small-100"
            href="/app/delivery/rules"
            accessibilityLabel="Manage slot disable rules"
          >
            <s-grid
              gridTemplateColumns="1fr auto"
              alignItems="center"
              gap="base"
            >
              <s-box>
                <s-heading>Slot Rules</s-heading>
                <s-paragraph color="subdued">
                  Create advanced rules to disable slots per city or date.
                </s-paragraph>
              </s-box>
              <s-icon type="chevron-right" />
            </s-grid>
          </s-clickable>
        </s-box>
      </s-section>

      {/* How It Works Section */}
      <s-section heading="How It Works">
        <s-grid
          gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))"
          gap="base"
        >
          <s-box
            border="base"
            borderRadius="base"
            padding="base"
            background="base"
          >
            <s-grid gap="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-badge tone="info">1</s-badge>
                <s-heading>Configure Cities</s-heading>
              </s-stack>
              <s-paragraph color="subdued">
                Add delivery cities with optional cutoff times and special city
                designations.
              </s-paragraph>
            </s-grid>
          </s-box>
          <s-box
            border="base"
            borderRadius="base"
            padding="base"
            background="base"
          >
            <s-grid gap="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-badge tone="info">2</s-badge>
                <s-heading>Set Time Slots</s-heading>
              </s-stack>
              <s-paragraph color="subdued">
                Define time windows for deliveries like "9:00 AM - 12:00 PM" or
                "2:00 PM - 5:00 PM".
              </s-paragraph>
            </s-grid>
          </s-box>
          <s-box
            border="base"
            borderRadius="base"
            padding="base"
            background="base"
          >
            <s-grid gap="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-badge tone="info">3</s-badge>
                <s-heading>Add Rules</s-heading>
              </s-stack>
              <s-paragraph color="subdued">
                Block dates and create rules to fine-tune slot availability by
                city or date.
              </s-paragraph>
            </s-grid>
          </s-box>
        </s-grid>
      </s-section>

      {/* Aside - Tools & Resources */}
      <s-section slot="aside" heading="Tools">
        <s-stack direction="block" gap="small">
          <s-link href="/app/delivery/test">
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-icon type="calculator" />
              Test Delivery Calculator
            </s-stack>
          </s-link>
          <s-link
            href="https://admin.shopify.com/content/metaobjects"
            target="_blank"
          >
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-icon type="metaobject" />
              View Metaobjects
            </s-stack>
          </s-link>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Configuration Stats">
        <s-stack direction="block" gap="small">
          <s-paragraph>
            <s-text type="strong">Cities with cutoff: </s-text>
            <s-text>{citiesWithCutoff}</s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">Special cities: </s-text>
            <s-text>{specialCitiesCount}</s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">Active time slots: </s-text>
            <s-text>{slotsCount}</s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text type="strong">Blocked dates: </s-text>
            <s-text>{disabledDatesCount}</s-text>
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Need Help?">
        <s-paragraph color="subdued">
          Learn how delivery rules are applied to your cart drawer and checkout
          experience.
        </s-paragraph>
        <s-button href="/app/delivery" variant="secondary">
          View Documentation
        </s-button>
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
