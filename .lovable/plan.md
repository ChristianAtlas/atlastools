

## Client Admin Settings Page

Client admins currently have no settings entry in their sidebar, and the existing `/settings` route is built for super admins (browse all clients, edit enterprise defaults). This plan adds a focused, scoped settings experience for client admins covering only the options they're allowed to manage for their own company.

### Scope of editable options (client admin only)

Settings are scoped to `profile.company_id` — a client admin can never see or edit another client's data, nor enterprise defaults, nor pricing/markups.

1. **Company Profile** — display name, DBA, primary contact name/email/phone, mailing address, timezone (read-only fields: legal name, EIN, CID, status — only super admin can change).
2. **Payroll Preferences** — overrides for: auto-approve semi-monthly, auto-approve bi-weekly, pay date weekend shift, pay date holiday shift. Read-only display of cutoffs and approval deadlines (set by enterprise).
3. **Time Off Policies** — reuse `TimeOffPoliciesManager` scoped to their company.
4. **Timekeeping** — reuse `TimekeepingSettings` (toggle add-on + policy controls) scoped to their company. Pricing card hidden (super-admin only).
5. **Earnings & Deductions** — reuse `ClientEDSettings` scoped to their company (enable/disable enterprise types, add client-custom codes).
6. **Compliance Preferences** — overrides for: license renewal reminder days, new-hire reporting reminders. I-9 deadline and payroll blocking remain enterprise-locked (read-only).
7. **Notifications** — per-company recipient emails for payroll-ready, invoice-issued, compliance-alerts, and timecard-approval reminders.
8. **Integrations** — view connection status (read-only list); request changes via support.
9. **User Access** — list of users at the company with their role; invite new client admin or employee user (creates auth invite via existing patterns). No role escalation to super_admin.
10. **Change History** — audit log filtered to scope=`client` and their `company_id` only.

Sections explicitly **excluded** for client admins: enterprise defaults, SUI/WC markup rates, billing engine config, NSF fees, platform legal entity, all other clients, timekeeping pricing.

### Routing and access

- New route: `/client-settings` → `ClientSettingsPage`.
- Add "Settings" entry to `clientAdminNavGroups` in `src/components/AppSidebar.tsx` under "Finance & Admin" pointing to `/client-settings`.
- `RoleGate` guard: `client_admin` only. Super admins visiting are redirected to existing `/settings`.
- Existing `/settings` route remains super-admin only (add `RoleGate` redirect if `client_admin` lands there).

### Implementation outline

**New file** `src/pages/ClientSettingsPage.tsx`
- `PageHeader` with company name/CID badge.
- Tabs: Profile · Payroll · Time Off · Timekeeping · Earnings & Deductions · Compliance · Notifications · Users · History.
- Each section uses the existing `useUpsertClientOverride` / `useDeleteClientOverride` hooks for setting overrides (already enforce `company_id` scoping via RLS).
- Profile uses `useUpdateCompany` for company table fields client admins can edit (a new RLS policy may be needed — see below).
- "Inherits from enterprise default" badge on every overridable field with a Revert button.

**Reused components** (no changes):
- `TimeOffPoliciesManager`, `TimekeepingSettings`, `ClientEDSettings` — all already accept `companyId`.
- `useClientOverrides`, `useUpsertClientOverride`, `useDeleteClientOverride`, `useSettingAuditLogs`.

**Sidebar** `src/components/AppSidebar.tsx`
- Add `{ label: 'Settings', to: '/client-settings', icon: Settings }` to `clientAdminNavGroups` (new "Settings" group at bottom, mirroring super admin layout).

**Router** `src/App.tsx`
- Add `<Route path="/client-settings" element={<ClientSettingsPage />} />` inside the protected layout.

**Backend (migration)**
- Add RLS policy on `companies`: client admins can `UPDATE` their own company row but only for non-sensitive fields. Implemented via a `BEFORE UPDATE` trigger that blocks changes to `status`, `ein`, `legal_name`, `cid`, `is_demo` for non-super-admin users (super admin bypass via `has_role`).
- Confirm `client_setting_overrides` RLS allows client admins to insert/update/delete rows where `company_id = get_user_company(auth.uid())`. If missing, add it.
- Confirm `setting_audit_logs` SELECT for client admins is scoped to their `company_id` only.

### Out of scope (kept for super admin only)

Enterprise defaults, SUI/WC markups, billing/NSF/collection rules, platform identity, pricing for add-ons, cross-client browsing, audit logs from other clients.

