# Unified Counterparty Design

## Summary

This design replaces separate customer and supplier master records with one unified `Counterparty` model. A counterparty represents the real-world company or person that the business transacts with, and a single `roleType` field determines whether that party participates in sales, procurement, or both.

The project is still new and has no legacy production data, so phase 1 should optimize for a clean domain model rather than compatibility layers. The goal is to make finance, sales, procurement, and after-sales reference the same business identity from day one, while preventing duplicate names and keeping the role model simple.

## Goals

- Establish one source of truth for customer and supplier identity.
- Allow a single counterparty to be both a customer and a supplier.
- Prevent duplicate names at both display and normalized levels.
- Make finance search, AR/AP ledger views, and source tracing operate on entity IDs instead of free-text names.
- Reuse one create/edit flow for both customer and supplier entry points.

## Non-Goals

- Automatic deduplication or fuzzy name matching.
- Legacy data migration tooling for old production datasets.
- A separate counterparty administration center page.
- Role-specific profile tables such as `CustomerProfile` or `SupplierProfile`.
- Advanced relationship graphs, parent-child organizations, or multi-branch entity modeling.

## Current State

Today the system stores `Customer` and `Supplier` as separate tables. Sales orders point to customers, purchase orders point to suppliers, and financial bills still depend on partner-name semantics in part of the design. This creates avoidable duplication and makes it too easy for one company to exist in two places.

Because this is a new project without real legacy data, we can replace that split model directly instead of designing merge rules, staged backfills, or compatibility shims.

## Approaches Considered

### Recommended: One `roleType` field

Store roles in one field on `Counterparty`:

- `CUSTOMER`
- `SUPPLIER`
- `BOTH`

This keeps the data model explicit and matches the product language of a single "role field". It also maps naturally from the UI: selecting one checkbox sets `CUSTOMER` or `SUPPLIER`, and selecting both sets `BOTH`.

### Alternative: Two booleans

Use `isCustomer` and `isSupplier`.

This works functionally, but it spreads one concept across two fields and is less aligned with the product decision to treat role as one explicit property.

### Alternative: Separate role table

Model roles through a join table such as `CounterpartyRole`.

This is more flexible than needed for phase 1 and would add complexity without solving a real current problem.

## Recommended Approach

Use one unified `Counterparty` table with a required `roleType` field and strict name uniqueness. The system should not allow duplicate `name` values, and it should also enforce uniqueness on `normalizedName` so case-only or whitespace-only variants are rejected.

## Domain Model

### Counterparty

`Counterparty` becomes the single master record for any external business party.

Suggested fields:

- `id`
- `code`
- `name`
- `normalizedName`
- `roleType`
- `contactPerson`
- `phone`
- `email`
- `address`
- `remarks`
- `isActive`
- `createdAt`
- `updatedAt`

### Role Field

`roleType` is a required string or enum-like value with these phase 1 values:

- `CUSTOMER`
- `SUPPLIER`
- `BOTH`

### Field Notes

- `code` should use a unified sequence such as `CP-0001`.
- `name` is the user-facing legal or trading name and must be unique.
- `normalizedName` is derived from `name`, normalizes case and whitespace, and must also be unique.
- `roleType` defines module visibility and validation.
- `isActive` should be used for phase 1 retirement instead of hard deletion when records are referenced.

## Schema Changes

### Add

- `Counterparty`

### Replace Existing Foreign Keys

- `SalesOrder.customerId` -> `SalesOrder.counterpartyId`
- `PurchaseOrder.supplierId` -> `PurchaseOrder.counterpartyId`
- `AfterSalesCase.customerId` -> `AfterSalesCase.counterpartyId`

### Finance Changes

Replace free-text or name-based partner handling with:

- `FinancialBill.counterpartyId`
- `FinancialBill.counterpartyNameSnapshot`
- `FinancialBill.sourceType`
- `FinancialBill.sourceId`

`sourceType` phase 1 values:

- `MANUAL`
- `SALES_ORDER`
- `PURCHASE_ORDER`

`sourceId` points to the originating business record when one exists. `counterpartyNameSnapshot` preserves historical display stability if the counterparty name changes later.

## Business Rules

### Role Rules

- Every counterparty must have exactly one `roleType` value.
- Sales flows can only select counterparties whose `roleType` is `CUSTOMER` or `BOTH`.
- Procurement flows can only select counterparties whose `roleType` is `SUPPLIER` or `BOTH`.
- After-sales flows can only select counterparties whose `roleType` is `CUSTOMER` or `BOTH`.
- Finance flows can select any active counterparty, because either role may participate in receivables or payables.

### Name Rules

- `Counterparty.name` is required and unique.
- `Counterparty.normalizedName` is required and unique.
- Phase 1 duplicate handling is strict exact-match normalization, not fuzzy matching.
- If a new record collides with an existing normalized name, the system should reject creation and direct the user to update the existing counterparty instead.

### Deletion and Deactivation Rules

- If a counterparty is referenced by sales orders, purchase orders, after-sales cases, or financial bills, hard deletion is blocked.
- Phase 1 should prefer deactivation (`isActive = false`) over destructive deletion.
- Changing `roleType` must be blocked when the new role would invalidate existing records. For example, a counterparty with sales orders cannot be changed from `BOTH` or `CUSTOMER` to `SUPPLIER`.

## User Flows

### Create from Sales

When the user clicks "New Customer", the system opens the shared counterparty form with customer role preselected.

If the user only selects customer role, the saved value is `CUSTOMER`. If the user selects both customer and supplier, the saved value is `BOTH`.

### Create from Procurement

When the user clicks "New Supplier", the system opens the same shared form with supplier role preselected.

If the user only selects supplier role, the saved value is `SUPPLIER`. If the user selects both customer and supplier, the saved value is `BOTH`.

### Shared Form Fields

- Name
- Contact person
- Phone
- Email
- Address
- Remarks
- Role selection: customer, supplier

The UI may present two checkboxes for input, but the persisted backend field is one `roleType` value. Editing a customer or supplier should open the same unified counterparty form.

## Module Behavior

### Sales

- The sales customer list becomes a filtered counterparty list where `roleType IN ('CUSTOMER', 'BOTH')`.
- Sales order create and edit flows select a `counterpartyId`.
- Sales order validation rejects counterparties that do not have customer capability.

### Procurement

- The supplier list becomes a filtered counterparty list where `roleType IN ('SUPPLIER', 'BOTH')`.
- Purchase order create and edit flows select a `counterpartyId`.
- Procurement validation rejects counterparties that do not have supplier capability.

### Finance

- Manual AR/AP entry must select a counterparty instead of typing a free-text partner name.
- Finance search must search counterparties, not raw bill strings.
- Selecting a counterparty opens a unified ledger modal.

The phase 1 counterparty ledger modal should show:

- Counterparty name
- Role badge based on `roleType`
- Accounts receivable summary
- Accounts payable summary
- Net position
- Related financial bill list
- Related sales order list
- Related purchase order list

Each related financial bill row should show:

- Bill type
- Amount
- Outstanding amount
- Source type
- Source number or source record reference

### After-Sales

- After-sales customer references move to `counterpartyId`.
- After-sales create and edit flows may only select counterparties with customer capability.

## API Design

### Counterparty Endpoints

- `GET /counterparties`
  - Supports keyword search
  - Supports `role=customer|supplier|both`
  - Excludes inactive records by default
- `POST /counterparties`
- `PATCH /counterparties/:id`
- `DELETE /counterparties/:id`
  - Expected to enforce block-or-deactivate rules
- `GET /counterparties/:id/ledger`
  - Returns summary AR/AP metrics plus related sales orders, purchase orders, and financial bills

### Payload Expectations

Counterparty create and update payloads should use:

- `name`
- `roleType`
- `contactPerson`
- `phone`
- `email`
- `address`
- `remarks`
- `isActive`

All module create and edit APIs that currently accept `customerId`, `supplierId`, or finance `partner` input should be updated to use `counterpartyId` and server-side role validation.

Finance create and edit APIs should also manage:

- `counterpartyNameSnapshot`
- `sourceType`
- `sourceId`

The backend remains the final authority on:

- role correctness
- duplicate rejection
- deactivation safety
- ledger aggregation

## Frontend Design

### Shared Building Blocks

- `useCounterparties`
- `CounterpartyForm`
- `CounterpartyPicker`
- `CounterpartyLedgerModal`

These components and hooks should become the common layer used by sales, procurement, finance, and after-sales.

### Page Changes

- `SalesManagement.tsx`
  - Replace customer-specific master data usage with filtered counterparties
  - Open shared form with customer role preselected
- `ProcurementManagement.tsx`
  - Replace supplier-specific master data usage with filtered counterparties
  - Open shared form with supplier role preselected
- `FinanceARAP.tsx`
  - Replace free-text partner entry with counterparty selection
  - Add counterparty search
  - Add unified ledger modal
- `AfterSalesManagement` or equivalent page
  - Replace customer-specific references with customer-capable counterparties

## Search and Ledger Behavior

Search should query the unified counterparty source and return actual entities, not guessed groupings from financial bills. A user should be able to find a company once and then see its full business footprint in one place.

Ledger aggregation rules:

- AR totals aggregate from receivable financial bills linked to the counterparty.
- AP totals aggregate from payable financial bills linked to the counterparty.
- Net position is `AR - AP`.
- Related sales and purchase records are included for context and source tracing, even if some finance records were created manually.

Phase 1 should sort related records by business date descending unless a more specific existing pattern already exists in the codebase.

## Error Handling

- Reject creation of a sales order when the selected counterparty does not have customer capability.
- Reject creation of a purchase order when the selected counterparty does not have supplier capability.
- Reject finance bill submission when the selected counterparty does not exist or is inactive.
- Reject hard deletion when the counterparty is referenced anywhere.
- Reject `roleType` changes that would invalidate existing linked records.
- Return explicit user-facing error messages that explain why the action is blocked and what the user should do next.

## Migration Strategy

Because this is a new project with no real legacy business data, phase 1 should use a clean replacement strategy instead of a compatibility migration strategy.

Migration principles:

- Introduce `Counterparty` as the canonical table.
- Replace customer and supplier foreign keys with `counterpartyId`.
- Replace finance partner-name input with explicit counterparty references.
- Remove obsolete frontend assumptions that customers and suppliers are different master record types.

No automatic merge logic, fuzzy matching, or legacy conflict resolution flow is required for phase 1.

## Testing Strategy

### Backend

Test:

- counterparty CRUD
- role filtering by `roleType`
- duplicate prevention via `name` and `normalizedName`
- sales role validation
- procurement role validation
- after-sales role validation
- finance counterparty validation
- ledger aggregation output
- deletion and deactivation safety rules

### Frontend

Test:

- shared counterparty form create and edit behavior
- role preselection from sales and procurement entry points
- conversion of checkbox input to persisted `roleType`
- filtered lists in sales and procurement
- counterparty picker behavior
- finance search and ledger modal rendering
- invalid-role submission handling

### Regression Coverage

Verify these scenarios end to end:

- One counterparty marked as `BOTH` appears correctly in both sales and procurement.
- Finance ledger for a dual-role counterparty shows AR, AP, net position, and related documents together.
- Changing a counterparty name does not break historical finance display because snapshot data remains stable.

## Risks and Mitigations

### Risk: Over-broad first phase

Mitigation:

- Keep phase 1 limited to sales, procurement, finance, and after-sales.
- Do not add a separate counterparty admin center.
- Do not add dedupe automation.

### Risk: Hidden assumptions in existing frontend pages

Mitigation:

- Centralize shared counterparty behavior in common form, picker, and modal primitives.
- Update each page to consume the same identity model instead of adding page-specific workarounds.

### Risk: Inconsistent role mapping between UI and persistence

Mitigation:

- Define one shared mapping between checkbox input and `roleType`.
- Cover that mapping in both frontend and backend tests.

### Risk: Historical display drift after renaming

Mitigation:

- Persist `counterpartyNameSnapshot` on financial bills.

## Out of Scope for Phase 1

- Fuzzy duplicate detection
- Automatic merge suggestions
- Hierarchical counterparties
- Multi-contact management
- Role-specific extension tables
- Separate reporting center beyond the ledger modal

## Open Implementation Constraints

These are fixed decisions for implementation planning, not open questions:

- The system will use one unified `Counterparty` table.
- Roles will be stored as one `roleType` field.
- `Counterparty.name` and `Counterparty.normalizedName` must both be unique.
- Sales and procurement entry points will open the same shared create and edit form.
- Finance will search and reference counterparties by ID, not partner name.
- The first delivery will cover sales, procurement, finance, and after-sales together.

## Acceptance Criteria

The design is successful when:

1. A user can create one counterparty and mark it as customer, supplier, or both.
2. The same counterparty can be selected from both sales and procurement flows without duplication.
3. Duplicate names, including case-only or whitespace-only variants, are rejected.
4. Finance manual bills reference a counterparty ID instead of a free-text partner string.
5. A finance user can search for a counterparty and open one modal showing combined AR/AP context and related records.
6. Role validation prevents invalid selections across modules.
7. Referenced counterparties cannot be accidentally deleted or changed to an incompatible role.
