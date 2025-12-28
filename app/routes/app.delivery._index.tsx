import { boundary } from "@shopify/shopify-app-react-router/server";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import prisma from "../db.server";
import { loadDeliveryConfig } from "../services/deliveryConfigService";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await loadDeliveryConfig(prisma, shop);

  return {
    citiesCount: config.cities.length,
    slotsCount: config.timeSlots.length,
    disabledDatesCount: config.dateDisableRules.length,
    rulesCount: config.slotDisableRules.length,
  };
};

export default function DeliverySettings() {
  const { citiesCount, slotsCount, disabledDatesCount, rulesCount } =
    useLoaderData<typeof loader>();

  return (
    <s-page heading="Delivery Settings">
      <s-section heading="Overview">
        <s-paragraph>
          Manage your delivery rules configuration. All settings are stored in
          the database and can be managed through this app.
        </s-paragraph>
      </s-section>

      <s-stack direction="block" gap="base">
        <s-section heading="Delivery Cities">
          <s-stack direction="block" gap="small">
            <s-paragraph>
              Configure cities available for delivery with their cutoff times.
            </s-paragraph>
            <s-stack direction="inline" gap="small">
              <s-badge>{citiesCount} cities configured</s-badge>
              <s-button href="/app/delivery/cities">Manage Cities</s-button>
            </s-stack>
          </s-stack>
        </s-section>

        <s-section heading="Time Slots">
          <s-stack direction="block" gap="small">
            <s-paragraph>
              Define delivery time windows customers can choose from.
            </s-paragraph>
            <s-stack direction="inline" gap="small">
              <s-badge>{slotsCount} slots configured</s-badge>
              <s-button href="/app/delivery/slots">Manage Time Slots</s-button>
            </s-stack>
          </s-stack>
        </s-section>

        <s-section heading="Disabled Dates">
          <s-stack direction="block" gap="small">
            <s-paragraph>
              Block specific dates from delivery (holidays, maintenance, etc.).
            </s-paragraph>
            <s-stack direction="inline" gap="small">
              <s-badge>{disabledDatesCount} dates disabled</s-badge>
              <s-button href="/app/delivery/dates">Manage Dates</s-button>
            </s-stack>
          </s-stack>
        </s-section>

        <s-section heading="Slot Disable Rules">
          <s-stack direction="block" gap="small">
            <s-paragraph>
              Create rules to disable specific slots on certain dates or for
              specific cities.
            </s-paragraph>
            <s-stack direction="inline" gap="small">
              <s-badge>{rulesCount} rules active</s-badge>
              <s-button href="/app/delivery/rules">Manage Rules</s-button>
            </s-stack>
          </s-stack>
        </s-section>
      </s-stack>

      <s-section slot="aside" heading="Quick Links">
        <s-stack direction="block" gap="small">
          <s-link href="/app/delivery/test">Test Delivery Calculator</s-link>
          <s-link
            href="https://admin.shopify.com/content/metaobjects"
            target="_blank"
          >
            Open Metaobjects in Admin
          </s-link>
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
