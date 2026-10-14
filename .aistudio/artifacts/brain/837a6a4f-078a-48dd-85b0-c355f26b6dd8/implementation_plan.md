# Implementation Plan: Fix Cumulative Invoice Calculations

The current invoice calculation logic in `MonthlyInvoiceCalculationTable.tsx` has issues correctly aggregating cumulative data from previously saved invoices, leading to incorrect values for "Preceding" amounts and final invoice totals.

## Planned Changes

1.  **Refine Data Fetching**:
    - Ensure `allInvoices` properly retrieves all historical, finalized invoices from the database or state.
    - Add logic to explicitly filter out the invoice currently being edited to avoid self-inclusion in cumulative sums.

2.  **Update Cumulative Calculation Logic**:
    - Modify `syncStaffRowsFromAssignedPersonnel` to iterate through the filtered invoice list and aggregate `thisInvoiceQty` and `thisInvoiceAmount` accurately.
    - Ensure the logic correctly handles currency (ETB vs. optional USD).

3.  **Re-verify Calculation Dependencies**:
    - Review the `useEffect` hook that triggers re-calculations when `activeInvoice` changes to ensure it correctly triggers the updated cumulative function.

4.  **Validate Final Totals**:
    - Adjust the final invoice summation logic in Table 5 (`Consolidated Summary & Net Payment Computation`) to use the newly calculated cumulative totals.

## Verification

- Run `compile_applet` to ensure code integrity.
- Perform a manual test by creating/editing invoices and verifying that the "Preceding" amounts correctly reflect the sum of previous invoices.
