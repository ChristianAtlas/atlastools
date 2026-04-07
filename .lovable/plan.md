

# Employee Portal Implementation Plan

## Overview
Build 7 employee-facing pages replicating the atlasonepayroll.app prototype, styled with the existing dark navy/coral theme. All data flows through shared Supabase tables and React Query hooks, ensuring changes made by employees, client admins, or super admins are reflected everywhere in real-time.

## Data Flow Architecture

All views (employee portal, admin detail pages, super admin views) read from and write to the same Supabase tables via shared hooks. React Query's cache invalidation ensures updates propagate instantly across views.

```text
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  EE Portal   │     │  Client Admin    │     │  Super Admin     │
│  (My Profile,│     │  (Company Detail,│     │  (Employee Detail│
│   My Pay...) │     │   Employees...)  │     │   Edit Dialog...)│
└──────┬───────┘     └────────┬─────────┘     └────────┬─────────┘
       │                      │                        │
       ▼                      ▼                        ▼
   ┌─────────────────────────────────────────────────────┐
   │         Shared React Query Hooks                    │
   │  useEmployee, useUpdateEmployee, usePTO,            │
   │  useTimecards, useCompensationRecords               │
   └──────────────────────┬──────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Supabase Tables     │
              │   (employees, pto_*,  │
              │    timecards, etc.)   │
              │   + Realtime channels │
              └───────────────────────┘
```

Key principle: No local-only state for persistent data. Every edit (address, tax, compensation, etc.) goes through `useUpdateEmployee` or the relevant mutation hook, which invalidates the shared query cache. Realtime subscriptions (already set up in `useEmployee`) push changes from other users' edits.

## Pages to Build

### 1. Employee Dashboard (`/`) -- conditional on role
- Next pay date card, time off snapshot, recent paystubs, to-do items
- Data from: `useEmployee` (profile), `usePTOBalances` (time off), `useTimecards` (hours)
- Verification letter CTA linking to `/verification-letter`

### 2. My Pay (`/my-pay`)
- Paystub list with period selector, earnings/deductions/taxes breakdown, YTD summary
- Initially mock paystub data structured for future real table
- Download/email actions (static for now)

### 3. Time Off (`/time-off`)
- Balance cards, request form, upcoming/past requests
- Wired to existing `usePTOBalances`, `usePTORequests`, `useUpdatePTORequest`
- Employee submits requests; admin/super admin approvals flow back via same hooks

### 4. Time Card (`/time-card`)
- Weekly timesheet entry grid
- Wired to existing `useTimecards` hook
- Save/submit actions write to `timecards` table

### 5. Benefits (`/benefits`)
- Summary cards, enrolled benefits list with cost breakdown
- Static/mock data initially (no benefits table yet)

### 6. My Documents (`/my-documents`)
- Filterable document list with category tabs
- Static/mock initially; structure for future `compliance_documents` integration

### 7. My Profile (`/my-profile`)
- Tabbed form: Personal, Tax, Direct Deposit, Security
- **Reads from** `useEmployee` (same hook admin uses)
- **Writes via** `useUpdateEmployee` (same mutation admin uses)
- Employee edits address/phone/emergency contact -> invalidates `['employees']` cache -> admin views see update instantly
- Tax and Direct Deposit: placeholder fields for now

### 8. Verification Letter (`/verification-letter`)
- 3-step wizard: select fields, preview, download/print
- Pulls from employee record via `useEmployee`

## Sidebar & Routing Changes

**AppSidebar.tsx**: Add employee nav items (Dashboard, My Pay, Time Off, Time Card, Benefits, Documents, Profile). These are already gated by `roles: ['employee']`.

**App.tsx**: Add routes `/my-pay`, `/time-off`, `/time-card`, `/benefits`, `/my-documents`, `/my-profile`, `/verification-letter`. Update `/` to render `EmployeeDashboard` when role is `employee`.

## Cross-View Data Sync Details

| Data Changed | Written By | Hook Used | Views That Update |
|---|---|---|---|
| Address, phone, emergency contact | Employee or Admin | `useUpdateEmployee` | My Profile, Employee Detail, Company Detail |
| Compensation (pay rate, type) | Super Admin only | `useUpdateEmployee` | My Pay, Employee Detail, Company Detail |
| PTO request status | Admin approves | `useUpdatePTORequest` | Time Off (EE), PTO page (admin) |
| Timecard entries | Employee submits | `useTimecards` mutation | Time Card (EE), Payroll (admin) |
| Tax / Direct Deposit | Employee or Admin | `useUpdateEmployee` | My Profile, Employee Detail |

Realtime channels already configured in `useEmployee` and `useEmployees` ensure cross-session updates (e.g., admin edits while employee is viewing).

## File Structure
```text
src/pages/employee/
  EmployeeDashboard.tsx
  MyPay.tsx
  TimeOff.tsx
  TimeCard.tsx
  Benefits.tsx
  MyDocuments.tsx
  MyProfile.tsx
  VerificationLetter.tsx
```

## Steps
1. Create 8 employee page components under `src/pages/employee/`
2. Update `AppSidebar.tsx` with employee nav items
3. Add all new routes in `App.tsx` with role-conditional dashboard
4. Wire real data hooks (PTO, timecards, profile) -- no duplicated data fetching
5. Add employee self-edit capabilities in My Profile using existing `useUpdateEmployee`
6. Ensure all mutation hooks invalidate shared query keys for cross-view sync

