# Implementation Plan: Ethiopian Roads Table Consistency and Functionality

## Goal
Improve table consistency, remove unnecessary buttons, implement draggable column resizing, and link reimbursement calculations between the Contract Amount and Fee Invoice pages.

## Proposed Changes

### 1. Table Row Standardization
- **Goal:** Make row structures consistent for Construction Staff, Reimbursable Expenses, and Invoice/Payment tables across `ContractAmountTab.tsx` and `MonthlyInvoiceCalculationTable.tsx`.
- **Action:** Review table header and cell definitions in both components. Align columns (e.g., Position, Unit, Rate, Quantity, Amount) and ensure consistent styling.

### 2. UI Cleanup
- **Goal:** Remove "Add DLP Position" and "Add Reimbursable" buttons from the `Fee Invoices & Payments` page (`MonthlyInvoiceCalculationTable.tsx`).
- **Action:** Locate the button components and remove them from the UI.

### 3. Draggable Column Separators
- **Goal:** Allow users to dynamically resize column widths for `.col-engineer`, `.col-contractor`, and `.col-firm`.
- **Action:** 
    - Reuse or adapt `src/components/ColumnResizer.tsx` if applicable, or implement a standard draggable handler using `onMouseDown` events to update column width state in the parent components.

### 4. Linking Table B to Sub Total 2
- **Goal:** Ensure changes in `Table B - Reimbursable Direct Expenses Schedule` in the Contract Amount page reflect in `Sub Total 2 - Reimbursable Operating Direct Costs Calculation` on the Fee Invoices & Payments page.
- **Action:** 
    - The current codebase appears to save contract amount data in the project state (`onUpdateProject`). I need to ensure `MonthlyInvoiceCalculationTable.tsx` is properly reading and synchronizing with the updated `reimbursableList` from the `consultant.contractAmountSchedule.condition1` state.

## Verification
- Run `compile_applet` to ensure no build errors.
- Verify table structure in UI.
- Test draggable resizing for the specified columns.
- Test that updating Table B in Contract Amount updates Sub Total 2 in Invoice/Payments.
