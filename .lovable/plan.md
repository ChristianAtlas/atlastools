

## Plan: "Last Payroll" Card for Client Admin Dashboard

### What
Replace the simple StatCard approach with a custom "Last Payroll" card matching the reference design — showing check date, pay period, and a donut chart with the cash required amount in the center.

### Design (matching reference image)
- **Card title**: "Last payroll" (bold, top-left) with a "..." menu icon (top-right)
- **Info row**: Two grey boxes — "Check date" (pay_date) and "Pay period" (period start → end)
- **Donut chart**: Centered, showing cash breakdown segments with the total "$X,XXX.XX Cash required" in the center

### Donut Segments
From the `payroll_runs` table columns:
- `net_pay_cents` — Net wages (dark purple)
- `employer_taxes_cents` + `employee_taxes_cents` — Taxes (medium purple)  
- `workers_comp_cents` — Workers' Comp (light purple)
- `employer_benefits_cents` — ER Benefits (lightest purple)

Total = `total_employer_cost_cents` (or sum of above if zero)

### Data Source
Filter `payrollRuns` for latest run with status in `['completed', 'paid', 'processing', 'funded']`, sorted by `pay_date` desc. Uses existing `usePayrollRuns()` hook already in Dashboard.

### Technical Changes

**File: `src/pages/Dashboard.tsx`**
1. Add a new `LastPayrollCard` component (inline in the file) that:
   - Takes the latest completed payroll run as a prop
   - Renders the card header, date info boxes, and an SVG donut chart
   - Formats `total_employer_cost_cents` as the center label
   - Uses `pay_date`, `pay_period_start`, `pay_period_end` for the info row
2. Render `LastPayrollCard` below the stat cards row, only for client admins (`!isSuperAdmin`)
3. Keep the existing 3-column stat card grid unchanged

**Donut chart**: Pure SVG with `stroke-dasharray`/`stroke-dashoffset` arcs — no charting library needed. Four segments color-coded in purples matching the reference.

**No new files or DB changes required.** All columns already exist on `payroll_runs`.

