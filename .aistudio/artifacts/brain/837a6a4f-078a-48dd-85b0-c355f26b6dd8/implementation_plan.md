# Implementation Plan: ERP Dashboard Enhancements

## 1. Contract Amount Access Control
- **Backend**: Update `src/middleware/auth.ts` to check `user.role === 'director_general'`. Add check to contract amount API routes.
- **Frontend**: Update `FinancialDataPage` and `SupervisionConsultantView` to disable/hide edit controls based on `user.role`.

## 2. Contract Amount Validation & Locking Workflow
- **Database**: Add `status` (e.g., 'Draft', 'Submitted', 'Validated') to `contractAmount` objects in Firestore.
- **Backend**: API handlers for `updateContractAmount` will check `status !== 'Validated'`.
- **Frontend**: 
    - Add "Submit for Validation" button.
    - CPM Admin: Add "Validate" button. 
    - When `Validated`, disable all edit controls.

## 3. Group Report: Asphalt & Base Course Analytics
- **Backend**: Update query in `GroupReportGenerator` to aggregate actual and planned data for 'Asphalt' and 'Base Course'.
- **Frontend**: Add UI components to display these metrics.

## 4. Supervision Consultant Page: Contract & Scope Profile Table
- **Backend**: Create new collection/sub-collection in Firestore for Supervision Consultant Contract Tables.
- **Frontend**:
    - Add `SupervisionConsultantContractTable` component.
    - Implement dynamic row addition.
    - Implement submission/approval flow (Directorate Admin).
    - Locking mechanism upon approval.
    - Automatic new table creation on consultant change.
