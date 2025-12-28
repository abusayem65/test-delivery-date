import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "app/db.server";
import { authenticate } from "app/shopify.server";
import type { FormEvent } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { redirect, useFetcher, useLoaderData } from "react-router";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const cityId = parseInt(params.id as string, 10);

  const city = await db.city.findFirst({
    where: { id: cityId, shop },
  });

  if (!city) {
    throw new Response("City not found", { status: 404 });
  }

  return { city };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const cityId = parseInt(params.id as string, 10);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await db.city.delete({
      where: { id: cityId, shop },
    });
    return redirect("/app/delivery/cities");
  }

  switch (intent) {
    case "update": {
      const name = formData.get("name") as string;
      const cutoffTime = formData.get("cutoffTime") as string;
      const isSpecial = formData.get("isSpecial") === "on";
      await db.city.update({
        where: { id: cityId, shop },
        data: {
          name,
          cuttoffTime: cutoffTime,
          isSpecial,
        },
      });
      return redirect("/app/delivery/cities");
    }
    case "delete": {
      await db.city.delete({
        where: { id: cityId, shop },
      });
      return redirect("/app/delivery/cities");
    }
    default: {
      return null;
    }
  }
};

export default function EditCityPage() {
  const { city } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const handleDeteleteCity = (id: number) => {
    fetcher.submit(
      {
        intent: "delete",
        id: id,
      },
      { method: "POST" },
    );
  };
  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const cutoffTime = formData.get("cutoffTime") as string;
    const isSpecial = formData.get("isSpecial") === "on";
    const id = city.id;

    fetcher.submit(
      {
        intent: "update",
        id: id,
        name: name,
        cutoffTime: cutoffTime,
        isSpecial: isSpecial ? "true" : "false",
      },
      { method: "POST" },
    );
  };

  return (
    <s-page heading="Edit City">
      <s-link slot="breadcrumb-actions" href="/app/delivery/cities">
        Cities
      </s-link>
      <s-section heading="City Details">
        <form method="POST" data-save-bar onSubmit={handleUpdate}>
          <s-stack direction="block" gap="base">
            <s-text-field
              label="City Name"
              name="name"
              defaultValue={city.name}
              placeholder="e.g., Dubai"
              required
            />

            <s-stack direction="block">
              <label htmlFor="cutoffTime">Cutoff Time</label>
              <input
                id="cutoffTime"
                name="cutoffTime"
                type="time"
                defaultValue={city.cuttoffTime || ""}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #8c9196",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              />
            </s-stack>

            <s-checkbox
              label="Special City"
              name="isSpecial"
              defaultChecked={city.isSpecial}
            />
          </s-stack>
        </form>
      </s-section>
      <s-stack
        direction="inline"
        gap="base"
        justifyContent="end"
        alignItems="center"
      >
        <s-button
          variant="primary"
          tone="critical"
          commandFor="delete-modal"
          command="--show"
        >
          Delete
        </s-button>
        <s-modal id="delete-modal" heading="Delete City?">
          <s-stack gap="base">
            <s-text>Are you sure you want to delete City {city.name}?</s-text>
            <s-text tone="caution">This action cannot be undone.</s-text>
          </s-stack>

          <s-button
            slot="primary-action"
            variant="primary"
            tone="critical"
            commandFor="delete-modal"
            command="--hide"
            onClick={() => handleDeteleteCity(city.id)}
          >
            Delete City
          </s-button>
          <s-button
            slot="secondary-actions"
            variant="secondary"
            commandFor="delete-modal"
            command="--hide"
          >
            Cancel
          </s-button>
        </s-modal>
      </s-stack>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useLoaderData());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
