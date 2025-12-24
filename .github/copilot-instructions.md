# Shopify Delivery Rules App

## Project Overview

Embedded Shopify app managing cart-level delivery rules (cities, dates, time slots, cutoffs). Built on React Router 7 + Shopify App Bridge + Prisma. Uses Shopify Dev MCP for AI-assisted development.

## Tech Stack & Architecture

| Layer               | Technology                                                      |
| ------------------- | --------------------------------------------------------------- |
| Framework           | React Router 7 (migrated from Remix)                            |
| Shopify Integration | `@shopify/shopify-app-react-router`, App Bridge React           |
| Database            | Prisma + SQLite (sessions in `prisma/schema.prisma`)            |
| UI Components       | Shopify semantic HTML (`<s-page>`, `<s-button>`, `<s-section>`) |
| API Version         | `2026-01` (see `shopify.app.toml`)                              |

### Key Files

- `app/shopify.server.ts` - Auth, session storage, Shopify client setup
- `app/routes/app.tsx` - App shell with `<AppProvider>` and nav
- `app/routes/app._index.tsx` - Main page with GraphQL mutation examples
- `app/db.server.ts` - Prisma singleton (dev hot-reload safe)

## Developer Commands

```bash
pnpm dev              # Start dev server (uses shopify app dev)
pnpm build            # Production build
pnpm setup            # Run prisma generate + migrate deploy
pnpm typecheck        # Type check with react-router typegen
pnpm deploy           # Deploy app to Shopify
```

## Route Patterns

Routes in `app/routes/` follow React Router file conventions:

- `app.tsx` - Parent layout for `/app/*` routes
- `app._index.tsx` - Index route for `/app`
- `auth.$.tsx` - Catch-all auth handler
- `webhooks.*.tsx` - Webhook handlers (no UI)

### Authentication Pattern

```tsx
// Every app route MUST authenticate
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  // Use admin.graphql() for API calls
};
```

### GraphQL Pattern

```tsx
const response = await admin.graphql(\`#graphql
  mutation CreateProduct(\$product: ProductCreateInput!) {
    productCreate(product: \$product) {
      product { id title }
    }
  }
\`, { variables: { product: { title: "..." } } });
```

## Delivery Rules Domain

This app manages cart-level delivery rules used by a Cart Drawer UI, replacing hardcoded logic with Admin-manageable configuration.

### Data Sources (Priority Order)

1. **Metaobjects** (recommended for structured config)
2. **Shopify MCP APIs**
3. **Theme Settings** (fallback)

---

### 1. Delivery City Management

- Cities are admin-defined (one per line or structured list)
- City selection drives: slot availability, cutoff rules, special logistics
- Support "special cities" with stricter rules

**Copilot must:**

- Never hardcode city names
- Always read city data from MCP / Metaobjects / Theme Settings

---

### 2. Delivery Date Logic

**Product-Based Delay:**
| Tag Pattern | Delay |
|-------------|-------|
| `delay` / `cake-delay` | +1 day |
| `delay-2` / `cake-delay-2` | +2 days |
| `delay-3` / `cake-delay-3` | +3 days |

Apply highest delay found in cart.

**Disabled Dates:**

- Admin-configured, accept formats: `YYYY-MM-DD`, `DD/MM/YYYY`
- Disabled dates must not be selectable in date picker

**Copilot must:**

- Parse dates defensively
- Normalize all dates before comparison
- Never assume timezone; always document it

---

### 3. Delivery Time Slot Rules

**Time Slot List:**

- Slots are admin-defined (e.g., `09:30 AM - 12:00 PM`)
- Treat slots as indexed entities (`slot_1`, `slot_2`, `slot_3`)

**Disable Rules (apply in order):**

1. Global slot disable (admin toggle)
2. Date-specific disable
3. City + date-specific disable

Disabled slots must appear but be unselectable.

---

### 4. City Cutoff Time Logic

- Certain cities may have earlier cutoff times
- If cutoff is passed: same-day delivery disabled, next valid date becomes minimum

**Copilot must:**

- Compare current time vs cutoff safely
- Never hardcode cutoff values
- Allow future extension per city

---

### 5. Checkout Enable Rules

Checkout button must remain **disabled** unless ALL are true:

- ✅ Full Name filled
- ✅ Phone Number filled
- ✅ Delivery Address selected
- ✅ Delivery Date selected
- ✅ Delivery Time Slot selected

**Copilot must:**

- Centralize validation logic
- Avoid duplicated checks across components

---

### Architecture Constraints

❌ **Never hardcode** cities, dates, slots, delays  
❌ **No string-matching logic without normalization**  
❌ **No business logic inside UI components**  
✅ **Pure functions** for rule evaluation  
✅ **Separate:** config loading → rule calculation → UI rendering  
✅ **Schema-driven logic** preferred  
✅ **Every rule must be:** testable, extensible, documented

---

### Service Modules

| Module                         | Responsibility                    |
| ------------------------------ | --------------------------------- |
| `deliveryConfigService`        | Load config from Metaobjects/MCP  |
| `cartDelayCalculator`          | Calculate delay from product tags |
| `dateAvailabilityService`      | Filter disabled dates             |
| `slotAvailabilityService`      | Apply slot disable rules          |
| `cityCutoffService`            | Check cutoff times by city        |
| `checkoutEligibilityValidator` | Validate checkout fields          |

Each module: takes structured input, returns deterministic output, has no Shopify UI dependencies

## Database Changes

After modifying `prisma/schema.prisma`:

```bash
pnpm prisma migrate dev --name describe_change
pnpm prisma generate
```

## Extensions

Extensions go in `extensions/` directory. Generate with:

```bash
pnpm generate extension
```
