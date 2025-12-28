# Shopify Delivery Rules App - Database Migration Summary

## Overview

Migrated the app from Shopify Metaobjects (GraphQL-based) to direct Prisma database queries.

## Changes Made

### 1. **Type Definitions** (`app/services/types/delivery.ts`)

- ✅ Updated `DeliveryCity` interface:
  - `id`: Changed from `string` to `number`
  - `shop`: Added field for multi-tenancy
  - `isActive`: Added field
  - Removed optional `cutoffTime`

- ✅ Updated `TimeSlot` interface:
  - `id`: Changed from `string` to `number`
  - `shop`: Added field
  - `isActive`: Added field
  - Removed `isGloballyDisabled` (replaced with `isActive`)

- ✅ New interface `DateDisableRule`:
  - Handles date range disabling (replaces single-date logic)
  - Supports city-specific disabling
  - Includes date range fields

- ✅ Updated `SlotDisableRule`:
  - `id`: Changed to `number`
  - `timeSlotId`: Changed to `number`
  - `cityId`: Changed to `number | undefined`
  - Supports date ranges

- ✅ Updated `DeliveryConfig`:
  - Added `shop` field
  - `dateDisableRules`: New field with date range support
  - Removed `disabledDates` array

- ✅ Updated `CheckoutFields`:
  - `deliveryTimeSlot`: Changed from `string` to `number`

### 2. **Configuration Service** (`app/services/deliveryConfigService.ts`)

- ✅ Removed all GraphQL queries (DELIVERY_CITIES_QUERY, TIME_SLOTS_QUERY, etc.)
- ✅ Removed metaobject transformation functions
- ✅ **New functions**:
  - `loadDeliveryConfig(prisma, shop)`: Load all config for a shop
  - `loadCities(prisma, shop)`: Get active cities
  - `loadTimeSlots(prisma, shop)`: Get active time slots
  - `loadDateDisableRules(prisma, shop)`: Get date disable rules
  - `loadSlotDisableRules(prisma, shop)`: Get slot disable rules
  - `getCityById()`, `getTimeSlotById()`: Fetch single records
  - `createCity()`, `updateCity()`: City CRUD
  - `createTimeSlot()`, `updateTimeSlot()`: Time slot CRUD
  - `createDateDisableRule()`: Create date disable rule
  - `createSlotDisableRule()`: Create slot disable rule

### 3. **Date Availability Service** (`app/services/dateAvailabilityService.ts`)

- ✅ Added `isDateInDisableRange()`: Check if date falls in disable range
- ✅ Added `buildDisabledDateSet()`: Expand date ranges into individual dates
- ✅ Updated `getAvailableDates()`: Support both string arrays and date range objects

### 4. **Slot Availability Service** (`app/services/slotAvailabilityService.ts`)

- ✅ Updated to use date ranges instead of single dates
- ✅ Updated `checkSlotAvailability()`: Now checks `isActive` instead of `isGloballyDisabled`
- ✅ Changed `cityId` parameter type from `string` to `number`

### 5. **Routes Updated**

- ✅ `app.delivery.cities.tsx`:
  - Removed GraphQL queries
  - Now uses `loadCities()` and CRUD functions from service
  - Changed ID type from `gid: string` to `id: number`

- ✅ `app.delivery.slots.tsx`:
  - Removed GraphQL queries
  - Now uses `loadTimeSlots()` and CRUD functions
  - Changed `isGloballyDisabled` toggle to `isActive` toggle

- ⏳ `app.delivery.dates.tsx`: Still needs migration from GraphQL
- ⏳ `app.delivery.rules.tsx`: Still needs migration from GraphQL

## Remaining Tasks

### Type Errors to Fix

Due to strict TypeScript checking, there are import errors in routes that still reference old GraphQL functions. These need updating:

1. **`app/routes/app._index.tsx`**: Remove `fetchDeliveryConfig` import
2. **`app/routes/app.delivery._index.tsx`**: Remove `fetchDeliveryConfig` import
3. **`app/routes/app.delivery.dates.tsx`**:
   - Remove `DISABLED_DATES_QUERY` import
   - Implement with Prisma: `loadDateDisableRules()`
   - Implement creation with: `createDateDisableRule()`

4. **`app/routes/app.delivery.rules.tsx`**:
   - Remove all GraphQL query imports
   - Implement with Prisma functions for both date and slot rules
   - Update to handle date ranges instead of single dates

5. **`app/routes/app.delivery.test.tsx`**:
   - Update ID types from `string` to `number`
   - Remove `fetchDeliveryConfig` usage
   - Use `loadDeliveryConfig()` instead

### Database Schema Notes

- The schema uses `cuttoffTime` (typo!) not `cutoffTime` in the City model
- All numeric IDs are `Int` from Prisma
- DateTime fields are Date objects in Prisma

## Migration Checklist

- [x] Update type definitions
- [x] Update deliveryConfigService with Prisma queries
- [x] Update dateAvailabilityService for date ranges
- [x] Update slotAvailabilityService for numeric IDs
- [x] Migrate app.delivery.cities.tsx
- [x] Migrate app.delivery.slots.tsx
- [ ] Migrate app.delivery.dates.tsx
- [ ] Migrate app.delivery.rules.tsx
- [ ] Update app.\_index.tsx
- [ ] Update app.delivery.\_index.tsx
- [ ] Update app.delivery.test.tsx
- [ ] Test all functionality
- [ ] Run typecheck with no errors

## Key Differences from GraphQL Approach

| Aspect         | GraphQL (Before)                  | Prisma (After)        |
| -------------- | --------------------------------- | --------------------- |
| City ID        | string (handle)                   | number (auto)         |
| Slot ID        | string (handle)                   | number (auto)         |
| Disabled Dates | Array of single dates             | Array of date ranges  |
| Slot Disable   | Global flag + rules               | Date range rules only |
| Query Pattern  | GraphQL + transformations         | Direct Prisma queries |
| Date Format    | Flexible (YYYY-MM-DD, DD/MM/YYYY) | ISO Date strings      |
| Multi-tenancy  | Via shop field                    | Via shop field        |

## Notes for Developers

1. **Always include `shop` field** when querying to ensure multi-tenancy
2. **Use formatDateToString()** when converting Prisma Dates to YYYY-MM-DD
3. **Remember the typo**: City model field is `cuttoffTime` not `cutoffTime`
4. **Date ranges** are now inclusive on both ends
5. **Inactive slots/cities** are soft-deleted via `isActive` flag, not hard-deleted
