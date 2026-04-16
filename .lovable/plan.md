

# Phase 2B Hardened Migration Plan

User flagged 4 real risks. I'm folding them into a revised plan. No execution yet.

## Issues Acknowledged

1. `payroll_run_employees` has no `company_id` — must derive via `payroll_runs.company_id` + `check_date/period_end`.
2. `employee_wc_assignments` should derive company via `wc_codes → wc_policies.company_id`, not `employees.company_id`.
3. Direct UPDATE backfill is unsafe — use staging/candidate mapping tables.
4. Bidirectional sync trigger is unsafe — only auto-fill `employment_record_id` from `employee_id`, never the reverse.
5. Don't auto-synthesize employment records for orphans — quarantine for human review.

## Revised Migration Sequence (Migration 2B.1 only — additive)

### Step 1 — Add nullable columns + indexes
```sql
ALTER TABLE payroll_run_employees    ADD COLUMN employment_record_id uuid REFERENCES employment_records(id);
ALTER TABLE compensation_records     ADD COLUMN employment_record_id uuid REFERENCES employment_records(id);
ALTER TABLE employee_wc_assignments  ADD COLUMN employment_record_id uuid REFERENCES employment_records(id);
-- employee_deductions.employment_record_id added in Phase 2A
CREATE INDEX ... on each
```

### Step 2 — Build candidate mapping tables (one per target)

```sql
CREATE TABLE _b2_map_compensation_records (
  source_id uuid PRIMARY KEY,
  candidate_er_id uuid,
  match_count int,
  match_strategy text,   -- 'unique', 'ambiguous', 'orphan'
  notes text
);
-- Same shape for the 3 other tables.
```

**Per-table candidate logic:**

| Target | Employee key | Company key source | Date key |
|---|---|---|---|
| `compensation_records` | `employee_id` | `employees.company_id` | `effective_date` |
| `employee_deductions` | `employee_id` | `employees.company_id` | `COALESCE(effective_date, start_date)` |
| `payroll_run_employees` | `employee_id` | `payroll_runs.company_id` (JOIN) | `COALESCE(pr.check_date, pr.period_end, pr.created_at)` |
| `employee_wc_assignments` | `employee_id` | `wc_policies.company_id` via `wc_codes` | `COALESCE(assignment.effective_date, policy.effective_date)` |

**Match query pattern:**
```sql
INSERT INTO _b2_map_<table>
SELECT t.id,
       er.id,
       count(*) OVER (PARTITION BY t.id) AS match_count,
       CASE WHEN count(*) OVER (PARTITION BY t.id) = 1 THEN 'unique'
            WHEN count(*) OVER (PARTITION BY t.id) > 1 THEN 'ambiguous'
       END
FROM <table> t
LEFT JOIN <derive company> ...
LEFT JOIN employment_records er
  ON er.employee_id = t.employee_id
 AND er.company_id  = derived_company_id
 AND er.effective_date <= derived_date
 AND (er.end_date IS NULL OR er.end_date >= derived_date);
```
Rows with no ER match get `match_strategy='orphan'`.

### Step 3 — Validation gates (must run + report before any UPDATE)

```sql
SELECT match_strategy, count(*) FROM _b2_map_compensation_records GROUP BY 1;
-- Repeat for all 4 tables.
```
**Hard stop** if any `ambiguous` rows exist. Surface them to user, resolve manually, re-run mapping.

### Step 4 — Update only `unique` matches
```sql
UPDATE compensation_records t
SET employment_record_id = m.candidate_er_id
FROM _b2_map_compensation_records m
WHERE m.source_id = t.id AND m.match_strategy = 'unique';
```

### Step 5 — Quarantine orphans
```sql
CREATE TABLE _b2_orphans_<table> AS
SELECT t.* FROM <table> t
JOIN _b2_map_<table> m ON m.source_id = t.id
WHERE m.match_strategy IN ('orphan', 'ambiguous');
```
**Do NOT** auto-create synthetic `employment_records`. Report to user for manual triage.

### Step 6 — One-way sync trigger (forward only)

```sql
CREATE FUNCTION fill_employment_record_id() RETURNS trigger AS $$
BEGIN
  IF NEW.employment_record_id IS NULL AND NEW.employee_id IS NOT NULL THEN
    SELECT id INTO NEW.employment_record_id
    FROM employment_records
    WHERE employee_id = NEW.employee_id
      AND end_date IS NULL
    ORDER BY effective_date DESC
    LIMIT 1;
  END IF;
  -- NO reverse fill. If employment_record_id is set without employee_id,
  -- raise EXCEPTION (frontend must provide both during dual-write window).
  IF NEW.employment_record_id IS NOT NULL AND NEW.employee_id IS NULL THEN
    RAISE EXCEPTION 'employee_id must be provided alongside employment_record_id during dual-write window';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
```
Attach BEFORE INSERT/UPDATE on the 4 re-anchored tables.

**Rationale:** rehire/transfer scenarios mean `employee_id → ER` has multiple valid candidates. Forcing the frontend to specify ER explicitly (after refactor) avoids silently picking the wrong job.

### Step 7 — Defer FK NOT NULL until cutover (Migration 2B.2)
After all orphans triaged AND frontend writes both columns for 7 days clean, then:
```sql
ALTER TABLE ... ALTER COLUMN employment_record_id SET NOT NULL;
DROP COLUMN employee_id;
```

## Open Questions Before I Execute

1. **`external_benefit_deductions`** — schema check needed. Should I include it in 2B.1 or leave for a follow-up after I inspect its columns?
2. **Quarantined orphans** — when found, do you want (a) migration aborts, (b) migration completes and emits a CSV report at `/mnt/documents/`, or (c) auto-create one synthetic ER per orphan with `effective_date = MIN(orphan dates)` and flag it?
3. **WC assignment date** — confirm `COALESCE(assignment.effective_date, wc_policies.effective_date)` is the right precedence (vs. preferring policy date when assignment is NULL).
4. **Dual-write trigger scope** — OK to raise EXCEPTION when `employment_record_id` is set without `employee_id`? This forces frontend cleanliness but could surface bugs loudly during the transition.

Reply with answers and I'll execute Migration 2B.1 (additive + mapping tables + one-way sync trigger). Frontend stays untouched.

