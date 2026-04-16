
The user wants a Mermaid ER diagram of the core relationships: Company → Employee → Payroll → Tax → Invoice. I have all the schema info I need from context.

Plan:
1. Generate a Mermaid `.mmd` file at `/mnt/documents/` showing the key tables and their logical relationships (no physical FKs exist per schema, but logical relationships via `company_id`, `employee_id`, `payroll_run_id`, etc.).
2. Include: companies, employees, employment_records, compensation_records, payroll_runs, payroll_run_employees, client_sui_rates, peo_sui_rates, sui_adjustments, invoices, invoice_line_items, payment_attempts, billing_profiles.
3. Emit the artifact tag so the user can preview/download.
4. Add a brief validation note below confirming the relationship chain is intact (all join keys exist).

## Diagram Plan
```text
companies (CID)
  ├── employees (company_id)
  │     ├── employment_records
  │     ├── compensation_records
  │     └── employee_wc_assignments
  ├── payroll_runs (company_id)
  │     └── payroll_run_employees (employee_id, payroll_run_id)
  ├── client_sui_rates / sui_adjustments  ← peo_sui_rates (state)
  ├── billing_profiles
  └── invoices (company_id)
        ├── invoice_line_items
        └── payment_attempts
```

## Validation Summary (will include in chat)
- Company → Employee: `employees.company_id` ✓
- Employee → Payroll: `payroll_run_employees.employee_id` + `payroll_run_id` ✓
- Payroll → Tax: `payroll_runs.company_id` joins `client_sui_rates.company_id` by state ✓
- Payroll → Invoice: `generate-payroll-invoice` edge fn links `payroll_run_id` → `invoices` ✓
- Company → Invoice: `invoices.company_id` ✓
- Note: No physical FKs in DB — relationships enforced at app layer + RLS via `company_id`.
