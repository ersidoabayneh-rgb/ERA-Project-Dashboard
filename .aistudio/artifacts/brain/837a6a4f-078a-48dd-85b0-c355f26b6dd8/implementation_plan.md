# Implementation Plan & Completed Work: Monthly Record Locking Governance

## Goal
Implement statutory approval and locking governance for elapsed months & EFY history records on the Progress Comparisons page (`ProgressPlanView.tsx`), ensuring that Directorate Admins can approve and lock monthly records against editing and deletion, while only Master Admins can revert changes or unlock records.

## Key Changes Implemented

### 1. Data Schema & Types (`src/types.ts`)
- Defined audit and lock governance metadata fields on `ProgressPlanHistoryItem`:
  - `isLocked?: boolean`
  - `approvedByDirectorate?: boolean`
  - `approvedAt?: string`
  - `approvedBy?: string`
  - `lockedAt?: string`
  - `lockedBy?: string`
- Enforced role resolution using `isMasterAdminOnly` alongside role definitions.

### 2. Lock & Revert Authorization Logic (`src/components/ProgressPlanView.tsx`)
- **Approval & Lock Permission:** Directorate Admins (`isDirectorateAdmin`) and Master Admins can approve and lock records.
- **Revert & Unlock Permission:** Exclusively restricted to Master Admins (`isMasterAdmin`). When a locked record is selected, non-Master Admins are blocked with an explicit security alert.
- **Modification Guard:**
  - `handleSaveActiveToSnapshot`: Checks if an existing snapshot for the current month is locked. Non-Master Admins cannot overwrite or save changes to a locked month.
  - `handleDeleteSnapshot`: Blocked for locked records unless user is Master Admin.
  - `handleClearThisProjectHistory`: Blocked if any locked records exist unless user is Master Admin.
  - `handleClearAllProjectsHistory`: Restricted exclusively to Master Admin.
  - `handleOpenEditModal` & `handleSaveModalUpdates`: Blocked for locked records unless user is Master Admin.

### 3. Visual Indicators & Action Controls
- **Main Status Card:**
  - Added a top action button for Directorate Admins: `Approve & Lock ({monthLabel})` when viewing an unlocked active month.
  - Rendered a high-visibility lock banner above the comparison table:
    - Non-Master Admin view: displays `🔒 Monthly Record Validated & Locked by Directorate Admin` and details that modifications are restricted to Master Admin.
    - Master Admin view: displays `Master Admin Override Active` badge with a one-click `Revert / Unlock Record` button.
  - Disabled table inputs for Contractor, ERA, and Actual plans when the current month is locked for non-Master Admins.
  - Disabled month, quarter, and EFY period inputs when locked.
- **Left Panel (Archived/Elapsed Record):**
  - Displays lock status indicator with Master Admin revert action button.
  - Disabled `Save & Update to {monthLabel}` button when locked.
- **Right Panel (History List - Grid & List Views):**
  - Added `🔒 Locked` status badge on locked cards/rows and `Open` badge on unlocked ones.
  - Added dedicated Lock / Unlock action button:
    - Master Admin: `Revert / Unlock Record` button.
    - Directorate Admin: `Approve & Lock Record` button on open records.
    - Non-Master Admin on locked record: disabled lock indicator with tooltip.
  - Disabled Edit and Delete buttons on locked records for non-Master Admins.
- **Edit Modal:**
  - Rendered locked record notification banner with in-modal Master Admin `Revert Lock` button.
  - Disabled all input fields and the Save button when the record is locked unless accessed by Master Admin.

## Verification
- `lint_applet` passed with zero errors (`tsc --noEmit`).
- `compile_applet` verified production build success.
