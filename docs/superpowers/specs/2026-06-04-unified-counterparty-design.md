# Unified Counterparty Design

## Summary

This design replaces separate customer and supplier master records with a single unified `Counterparty` model. A counterparty represents the real-world company or person that the business transacts with, while role flags determine whether that party participates in sales, procurement, or both.

The goal is to make finance, sales, procurement, and after-sales reference the same business identity from day one. This removes name-based guesswork, supports a company being both a customer and a supplier, and makes cross-module ledger visibility reliable.

## Goals

- Establish one source of truth for customer/supplier identity.
- Allow a single counterparty to be both a customer and a supplier.
- Make finance search, AR/AP ledger views, and source tracing operate on entity IDs instead of free-text names.
- Reuse one create/edit flow for both customer and supplier entry points.
- Keep phase 1 implementation focused enough for one plan and one delivery stream.

## Non-Goals

- Automatic deduplication or fuzzy name matching.
- A separate counterparty administration center page.
- Role-specific profile tables such as `CustomerProfile` or `SupplierProfile`.
- Legacy data migration tooling beyond what is needed to move the current new-system dataset to the new schema.
- Advanced relationship graphs, parent-child organizations, or multi-branch entity modeling.

## Current State

Today the system stores `Customer` and `Supplier` as separate tables. Sales orders point to customers, purchase orders point to suppliers, and financial bills store a free-text `partner` string. This makes the following cases unreliable:

- One company that appears in both sales and procurement creates two separate identities.
- Finance cannot safely show a complete AR/AP position for that company without guessing by name.
- Similar names can be confused, while true same-entity records can remain split.

Because the system is still early, we can correct the model at the foundation instead of adding a later reconciliation layer.

## Recommended Approach

Use one unified `Counterparty` table with simple role flags:

- `isCustomer`
- `isSupplier`

This is the lightest design that still gives us a clean identity model. It is simpler than maintaining a parent `Counterparty` plus separate customer/supplier profile tables, while remaining much safer than trying to link or merge two separate master tables later.

## Domain Model

### Counterparty

`Counterparty` becomes the single master record for any external business party.

Suggested fields:

- `id`
- `code`
- `name`
- `normalizedName`
- `contactPerson`
- `phone`
- `email`
- `address`
- `remarks`
- `isCustomer`
- `isSupplier`
- `isActive`
- `createdAt`
- `updatedAt`

### Field Notes

- `code` should use a unified series such as `CP-0001`.
- `name` is the user-facing legal or trading name.
- `normalizedName` supports exact duplicate prevention and search normalization.
- `isCustomer` and `isSupplier` define the roles visible in each module.
- `isActive` should be used for phase 1 retirement instead of hard deletion when records are referenced.

## Schema Changes

### Add

- `Counterparty`

### Replace Existing Foreign Keys

- `SalesOrder.customerId` -> `SalesOrder.counterpartyId`
- `PurchaseOrder.supplierId` -> `PurchaseOrder.counterpartyId`
- `AfterSalesCase.customerId` -> `AfterSalesCase.counterpartyId`

### Finance Changes

Replace free-text partner storage with:

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

- A counterparty must have at least one role selected.
- Sales flows can only select counterparties where `isCustomer = true`.
- Procurement flows can only select counterparties where `isSupplier = true`.
- Finance flows can select any active counterparty, because either role may participate in receivables or payables.

### Name Rules

- `Counterparty.name` is required.
- `Counterparty.normalizedName` must be unique in phase 1.
- Phase 1 duplicate handling is strict exact-match normalization, not fuzzy matching.
- If a new record collides with an existing normalized name, the system should guide the user to edit the existing counterparty and add the missing role instead of creating a duplicate.

### Deletion and Deactivation Rules

- If a counterparty is referenced by sales orders, purchase orders, after-sales cases, or financial bills, hard deletion is blocked.
- Phase 1 should prefer deactivation (`isActive = false`) over destructive deletion.
- A role cannot be removed if existing business records still depend on that role. For example, `isCustomer` cannot be turned off while sales or after-sales records exist for that counterparty.

## User Flows

### Create from Sales

When the user clicks "New Customer", the system opens the shared counterparty form with:

- `isCustomer = true` preselected
- `isSupplier = false` by default

The user may optionally enable supplier role in the same flow.

### Create from Procurement

When the user clicks "New Supplier", the system opens the same shared form with:

- `isSupplier = true` preselected
- `isCustomer = false` by default

The user may optionally enable customer role in the same flow.

### Shared Form Fields

- Name
- Contact person
- Phone
- Email
- Address
- Remarks
- Role selection: customer, supplier

Editing a customer or supplier should open the same unified counterparty form. The system should stop presenting separate "customer master" and "supplier master" creation models as independent truths.

## Module Behavior

### Sales

- The sales customer list becomes a filtered counterparty list where `isCustomer = true`.
- Sales order create/edit flows select a `counterpartyId`.
- Sales order validation rejects non-customer counterparties in both frontend and backend.

### Procurement

- The supplier list becomes a filtered counterparty list where `isSupplier = true`.
- Purchase order create/edit flows select a `counterpartyId`.
- Procurement validation rejects non-supplier counterparties in both frontend and backend.

### Finance

- Manual AR/AP entry must select a counterparty instead of typing a free-text partner name.
- Finance search must search counterparties, not raw bill strings.
- Selecting a counterparty opens a unified ledger modal.

The phase 1 counterparty ledger modal should show:

- Counterparty name
- Role badges: customer, supplier
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
- After-sales create/edit flows may only select counterparties with customer role.

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

All module create/edit APIs that currently accept `customerId`, `supplierId`, or finance `partner` input should be updated to use `counterpartyId` and server-side role validation.

Finance create/edit APIs should also manage:

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
  - Replace customer-specific references with customer-role counterparties

## Search and Ledger Behavior

Search should query the unified counterparty source and return actual entities, not guessed groupings from financial bills. A user should be able to find a company once and then see its full business footprint in one place.

Ledger aggregation rules:

- AR totals aggregate from receivable financial bills linked to the counterparty.
- AP totals aggregate from payable financial bills linked to the counterparty.
- Net position is `AR - AP`.
- Related sales and purchase records are included for context and source tracing, even if some finance records were created manually.

Phase 1 should sort related records by business date descending unless a more specific existing pattern already exists in the codebase.

## Error Handling

- Reject creation of a sales order when the selected counterparty does not have customer role.
- Reject creation of a purchase order when the selected counterparty does not have supplier role.
- Reject finance bill submission when the selected counterparty does not exist or is inactive.
- Reject hard deletion when the counterparty is referenced anywhere.
- Reject role removal when dependent records still exist.
- Return explicit user-facing error messages that explain why the action is blocked and what the user should do next.

## Migration Strategy

Because the system is still early, phase 1 can take a direct migration path instead of building long-lived compatibility layers.

Migration principles:

- Introduce `Counterparty` as the canonical table.
- Move existing customer and supplier references to counterparties.
- Convert free-text finance partner data into explicit counterparty references wherever possible during migration.
- Remove obsolete frontend assumptions that customers and suppliers are different master record types.

This migration should still preserve history and should not rely on fuzzy matching. If ambiguous records exist, they should be resolved explicitly, not auto-merged.

## Testing Strategy

### Backend

Test:

- counterparty CRUD
- role filtering
- duplicate prevention via normalized name
- sales role validation
- procurement role validation
- finance counterparty validation
- ledger aggregation output
- deletion and deactivation safety rules

### Frontend

Test:

- shared counterparty form create/edit behavior
- role preselection from sales/procurement entry points
- filtered lists in sales and procurement
- counterparty picker behavior
- finance search and ledger modal rendering
- invalid-role submission handling

### Regression Coverage

Verify these scenarios end to end:

- One counterparty marked as both customer and supplier appears correctly in both modules.
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

- Centralize shared counterparty behavior in common form/picker/modal primitives.
- Update each page to consume the same identity model instead of adding page-specific workarounds.

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
- Roles will be stored as `isCustomer` and `isSupplier`.
- Sales and procurement entry points will open the same shared create/edit form.
- Finance will search and reference counterparties by ID, not partner name.
- The first delivery will cover sales, procurement, finance, and after-sales together.

## Acceptance Criteria

The design is successful when:

1. A user can create one counterparty and mark it as both customer and supplier.
2. The same counterparty can be selected from both sales and procurement flows without duplication.
3. Finance manual bills reference a counterparty ID instead of a free-text partner string.
4. A finance user can search for a counterparty and open one modal showing combined AR/AP context and related records.
5. Role validation prevents invalid selections across modules.
6. Referenced counterparties cannot be accidentally deleted or stripped of required roles.
