import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface WizardData {
  // Step 1: Company Setup
  company?: {
    legal_name: string;
    dba_name?: string;
    ein: string;
    entity_type: string;
    state_of_incorporation: string;
    date_of_incorporation?: string;
    physical_address: { line1: string; line2?: string; city: string; state: string; zip: string };
    mailing_address?: { line1: string; line2?: string; city: string; state: string; zip: string };
    mailing_same_as_physical?: boolean;
    primary_contact: { name: string; email: string; phone: string };
    payroll_contact?: { name: string; email: string; phone: string };
    hr_contact?: { name: string; email: string; phone: string };
    finance_contact?: { name: string; email: string; phone: string };
    naics_code?: string;
    business_description?: string;
    work_locations?: { state: string; city?: string }[];
    selected_tier?: string;
    selected_addons?: string[];
    benefit_type?: 'atlasone' | 'external' | 'none';
  };
  // Step 2: Tax & Compliance
  tax?: {
    irs_deposit_schedule?: 'semi_weekly' | 'monthly';
    prior_payroll_provider?: string;
    state_registrations?: Array<{
      state: string;
      withholding_account?: string;
      sui_account?: string;
      sui_rate?: number;
      filing_frequency?: string;
      local_tax_ids?: string;
      psd_codes?: string;
    }>;
    workers_comp?: {
      carrier?: string;
      policy_number?: string;
      class_codes?: string;
    };
    csa_uploaded?: boolean;
    coemployment_acknowledged?: boolean;
    ach_authorized?: boolean;
    funding_account?: { routing?: string; account_last4?: string; bank_name?: string };
  };
  // Step 3: Payroll Config
  payroll?: {
    pay_frequency: string;
    first_payroll_date?: string;
    check_date_offset?: number;
    default_earning_types?: string[];
    benefit_deductions?: string[];
    time_tracking_method?: 'native' | 'integration' | 'none';
  };
  // Step 4: Employee Import
  employees?: {
    imported_count?: number;
    import_method?: 'csv' | 'manual';
    csv_validated?: boolean;
    csv_errors?: string[];
    employee_data?: Array<{
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      hire_date: string;
      title?: string;
      department?: string;
      pay_type: 'salary' | 'hourly';
      salary?: number;
      hourly_rate?: number;
      pay_frequency?: string;
      work_state?: string;
    }>;
    ytd_data?: Array<{
      employee_email: string;
      gross_wages: number;
      federal_withholding: number;
      state_taxes: number;
      social_security: number;
      medicare: number;
      benefit_deductions: number;
    }>;
  };
  // Step 5: Review
  review?: {
    notes?: string;
    launch_confirmed?: boolean;
  };
}

export interface OnboardingWizard {
  id: string;
  company_id: string | null;
  current_step: number;
  status: string;
  mode: string;
  wizard_data: WizardData;
  created_by: string;
  completed_at: string | null;
  launched_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useClientOnboardingWizards() {
  return useQuery({
    queryKey: ['client-onboarding-wizards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_onboarding_wizards')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as OnboardingWizard[];
    },
  });
}

export function useClientOnboardingWizard(id: string) {
  return useQuery({
    queryKey: ['client-onboarding-wizard', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_onboarding_wizards')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as OnboardingWizard;
    },
    enabled: !!id,
  });
}

export function useCreateOnboardingWizard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (mode: 'white_glove' | 'self_serve') => {
      const { data, error } = await supabase
        .from('client_onboarding_wizards')
        .insert({
          mode,
          created_by: user!.id,
          status: 'in_progress',
          current_step: 1,
          wizard_data: {},
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as OnboardingWizard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-onboarding-wizards'] });
      toast({ title: 'Onboarding started', description: 'New client onboarding wizard created.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });
}

export function useSaveWizardStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      wizardId,
      step,
      data,
      companyId,
    }: {
      wizardId: string;
      step: number;
      data: Partial<WizardData>;
      companyId?: string;
    }) => {
      // Get current wizard data
      const { data: current, error: fetchError } = await supabase
        .from('client_onboarding_wizards')
        .select('wizard_data')
        .eq('id', wizardId)
        .single();
      if (fetchError) throw fetchError;

      const merged = { ...(current?.wizard_data as object || {}), ...data };

      const updates: Record<string, unknown> = {
        wizard_data: merged,
        current_step: step + 1,
      };
      if (companyId) updates.company_id = companyId;

      const { data: updated, error } = await supabase
        .from('client_onboarding_wizards')
        .update(updates as any)
        .eq('id', wizardId)
        .select()
        .single();
      if (error) throw error;
      return updated as unknown as OnboardingWizard;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-onboarding-wizard', data.id] });
      queryClient.invalidateQueries({ queryKey: ['client-onboarding-wizards'] });
    },
  });
}

export function useLaunchClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      wizardId,
      wizardData,
    }: {
      wizardId: string;
      wizardData: WizardData;
    }) => {
      const companyInfo = wizardData.company!;
      const payrollInfo = wizardData.payroll;
      const employeeData = wizardData.employees?.employee_data || [];
      // Collect all unique work states from company + employees
      const workStates = Array.from(new Set([
        companyInfo.state_of_incorporation,
        ...(companyInfo.work_locations?.map(l => l.state) || []),
        ...employeeData.map(e => e.work_state).filter(Boolean) as string[],
      ]));

      // 1. Create company record
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyInfo.legal_name,
          legal_name: companyInfo.legal_name,
          dba_name: companyInfo.dba_name || null,
          ein: companyInfo.ein,
          entity_type: companyInfo.entity_type,
          state: companyInfo.state_of_incorporation,
          date_of_incorporation: companyInfo.date_of_incorporation || null,
          address_line1: companyInfo.physical_address.line1,
          address_line2: companyInfo.physical_address.line2 || null,
          city: companyInfo.physical_address.city,
          zip: companyInfo.physical_address.zip,
          mailing_address_line1: companyInfo.mailing_same_as_physical
            ? companyInfo.physical_address.line1
            : companyInfo.mailing_address?.line1 || null,
          mailing_city: companyInfo.mailing_same_as_physical
            ? companyInfo.physical_address.city
            : companyInfo.mailing_address?.city || null,
          mailing_state: companyInfo.mailing_same_as_physical
            ? companyInfo.physical_address.state
            : companyInfo.mailing_address?.state || null,
          mailing_zip: companyInfo.mailing_same_as_physical
            ? companyInfo.physical_address.zip
            : companyInfo.mailing_address?.zip || null,
          primary_contact_name: companyInfo.primary_contact.name,
          primary_contact_email: companyInfo.primary_contact.email,
          primary_contact_phone: companyInfo.primary_contact.phone,
          naics_code: companyInfo.naics_code || null,
          business_description: companyInfo.business_description || null,
          status: 'active',
          employee_count: wizardData.employees?.employee_data?.length || 0,
          settings: {
            payroll_contact: companyInfo.payroll_contact || null,
            hr_contact: companyInfo.hr_contact || null,
            finance_contact: companyInfo.finance_contact || null,
            work_locations: companyInfo.work_locations || [],
            selected_tier: companyInfo.selected_tier || null,
            selected_addons: companyInfo.selected_addons || [],
            benefit_type: companyInfo.benefit_type || null,
            pay_frequency: payrollInfo?.pay_frequency || 'biweekly',
            time_tracking: payrollInfo?.time_tracking_method || 'none',
            irs_deposit_schedule: wizardData.tax?.irs_deposit_schedule || null,
          },
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // 2. Create employees and invitation records
      // employeeData already declared above
      if (employeeData.length > 0) {
        const employeeRows = employeeData.map(emp => ({
          company_id: company.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          email: emp.email,
          phone: emp.phone || null,
          start_date: emp.hire_date,
          title: emp.title || null,
          department: emp.department || null,
          pay_type: emp.pay_type as 'salary' | 'hourly',
          annual_salary_cents: emp.pay_type === 'salary' ? Math.round((emp.salary || 0) * 100) : null,
          hourly_rate_cents: emp.pay_type === 'hourly' ? Math.round((emp.hourly_rate || 0) * 100) : null,
          pay_frequency: (emp.pay_frequency || payrollInfo?.pay_frequency || 'biweekly') as 'weekly' | 'biweekly' | 'semimonthly' | 'monthly',
          state: emp.work_state || companyInfo.state_of_incorporation,
          status: 'active' as const,
        }));

        const { data: createdEmployees, error: empError } = await supabase
          .from('employees')
          .insert(employeeRows)
          .select('id, email, first_name, last_name');
        if (empError) throw empError;

        // Create invitation records for each employee
        if (createdEmployees && createdEmployees.length > 0) {
          const invitationRows = createdEmployees.map(emp => ({
            employee_id: emp.id,
            company_id: company.id,
            email: emp.email,
            full_name: `${emp.first_name} ${emp.last_name}`,
            status: 'pending',
          }));
          await supabase.from('employee_invitations').insert(invitationRows);
        }
      }

      // 3. Create state compliance registrations
      const stateRegs = wizardData.tax?.state_registrations || [];
      if (stateRegs.length > 0) {
        const licenseRows = stateRegs.flatMap(reg => {
          const items = [];
          if (reg.withholding_account) {
            items.push({
              entity_type: 'client',
              entity_id: company.id,
              company_id: company.id,
              license_type: 'state_withholding',
              state_code: reg.state,
              account_number: reg.withholding_account,
              filing_frequency: reg.filing_frequency || null,
              status: 'active',
            });
          }
          if (reg.sui_account) {
            items.push({
              entity_type: 'client',
              entity_id: company.id,
              company_id: company.id,
              license_type: 'sui_account',
              state_code: reg.state,
              account_number: reg.sui_account,
              sui_rate: reg.sui_rate || null,
              filing_frequency: reg.filing_frequency || null,
              status: 'active',
            });
          }
          return items;
        });
        if (licenseRows.length > 0) {
          await supabase.from('compliance_licenses').insert(licenseRows);
        }
      }

      // 4. Auto-generate comprehensive compliance checklist
      const complianceItems = generateComplianceChecklist(
        company.id,
        wizardData,
        workStates,
        employeeData,
      );
      if (complianceItems.length > 0) {
        await supabase.from('compliance_items').insert(complianceItems);
      }

      // 5. Mark wizard as launched
      await supabase
        .from('client_onboarding_wizards')
        .update({
          status: 'completed',
          company_id: company.id,
          completed_at: new Date().toISOString(),
          launched_at: new Date().toISOString(),
          current_step: 6,
        })
        .eq('id', wizardId);

      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-onboarding-wizards'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      toast({ title: 'Client launched!', description: 'Company, employees, and compliance records created.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Launch failed', description: err.message, variant: 'destructive' });
    },
  });
}

// Validate EIN format: XX-XXXXXXX
export function validateEIN(ein: string): boolean {
  return /^\d{2}-\d{7}$/.test(ein);
}

// CSV template columns
export const CSV_TEMPLATE_HEADERS = [
  'first_name', 'last_name', 'email', 'phone', 'hire_date',
  'title', 'department', 'pay_type', 'salary', 'hourly_rate',
  'pay_frequency', 'work_state',
];

export function parseEmployeeCSV(csvText: string) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return { data: [], errors: ['CSV must have a header row and at least one data row'] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const errors: string[] = [];
  const data: WizardData['employees']['employee_data'] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = values[j] || ''; });

    if (!row.first_name) { errors.push(`Row ${i}: Missing first_name`); continue; }
    if (!row.last_name) { errors.push(`Row ${i}: Missing last_name`); continue; }
    if (!row.email) { errors.push(`Row ${i}: Missing email`); continue; }
    if (!row.hire_date) { errors.push(`Row ${i}: Missing hire_date`); continue; }

    data.push({
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone || undefined,
      hire_date: row.hire_date,
      title: row.title || undefined,
      department: row.department || undefined,
      pay_type: (row.pay_type === 'hourly' ? 'hourly' : 'salary') as 'salary' | 'hourly',
      salary: row.salary ? parseFloat(row.salary) : undefined,
      hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
      pay_frequency: row.pay_frequency || undefined,
      work_state: row.work_state || undefined,
    });
  }

  return { data, errors };
}

// ─── State-specific compliance requirements ───────────────────────────────────

interface ComplianceItemRow {
  entity_type: string;
  entity_id: string;
  company_id: string;
  title: string;
  category: string;
  subcategory?: string;
  priority: string;
  status: string;
  state_code?: string;
  risk_level?: string;
  description?: string;
  is_recurring?: boolean;
  recurrence_interval?: string;
  blocker?: boolean;
}

// States that require specific local/city tax registrations
const STATES_WITH_LOCAL_TAX = ['PA', 'OH', 'IN', 'KY', 'MD', 'MI', 'AL', 'CO', 'DE', 'NY'];
// States with paid family leave requirements
const STATES_WITH_PFL = ['CA', 'CT', 'CO', 'DE', 'MA', 'MD', 'NJ', 'NY', 'OR', 'RI', 'WA'];
// States with state disability insurance
const STATES_WITH_SDI = ['CA', 'HI', 'NJ', 'NY', 'RI'];
// States with additional new hire reporting requirements beyond federal
const ALL_STATES_NEW_HIRE = true; // All states require new hire reporting

function generateComplianceChecklist(
  companyId: string,
  wizardData: WizardData,
  workStates: string[],
  employees: NonNullable<WizardData['employees']>['employee_data'],
): ComplianceItemRow[] {
  const items: ComplianceItemRow[] = [];
  const base = { entity_type: 'client' as const, entity_id: companyId, company_id: companyId };
  const tax = wizardData.tax;
  const registeredStates = new Set((tax?.state_registrations || []).map(r => r.state));

  // ── FEDERAL-LEVEL ITEMS ──────────────────────────────────────────────────

  items.push({
    ...base,
    title: 'Verify FEIN with IRS',
    category: 'tax_registration',
    subcategory: 'federal',
    priority: 'critical',
    status: 'pending',
    risk_level: 'high',
    description: 'Confirm Employer Identification Number is valid and matches IRS records.',
    blocker: true,
  });

  items.push({
    ...base,
    title: 'Execute Client Service Agreement',
    category: 'legal',
    subcategory: 'peo_agreement',
    priority: 'critical',
    status: tax?.csa_uploaded ? 'compliant' : 'pending',
    risk_level: tax?.csa_uploaded ? 'low' : 'high',
    description: 'PEO co-employment agreement must be fully executed before payroll processing.',
    blocker: true,
  });

  items.push({
    ...base,
    title: 'Authorize ACH funding',
    category: 'banking',
    subcategory: 'ach_authorization',
    priority: 'critical',
    status: tax?.ach_authorized ? 'compliant' : 'pending',
    risk_level: tax?.ach_authorized ? 'low' : 'high',
    description: 'Direct debit authorization required for payroll funding.',
    blocker: true,
  });

  items.push({
    ...base,
    title: 'Co-employment acknowledgement',
    category: 'legal',
    subcategory: 'peo_agreement',
    priority: 'high',
    status: tax?.coemployment_acknowledged ? 'compliant' : 'pending',
    risk_level: 'medium',
    description: 'Client must acknowledge co-employment relationship terms.',
  });

  items.push({
    ...base,
    title: 'Set up workers compensation coverage',
    category: 'workers_comp',
    subcategory: 'policy',
    priority: 'critical',
    status: tax?.workers_comp?.carrier ? 'compliant' : 'pending',
    risk_level: tax?.workers_comp?.carrier ? 'low' : 'high',
    description: 'Workers compensation insurance must be active before employees can begin work.',
    blocker: true,
  });

  items.push({
    ...base,
    title: 'Configure IRS deposit schedule',
    category: 'tax_registration',
    subcategory: 'federal',
    priority: 'high',
    status: tax?.irs_deposit_schedule ? 'compliant' : 'pending',
    risk_level: 'medium',
    description: `IRS deposit schedule: ${tax?.irs_deposit_schedule === 'semi_weekly' ? 'Semi-Weekly' : tax?.irs_deposit_schedule === 'monthly' ? 'Monthly' : 'Not set'}.`,
  });

  items.push({
    ...base,
    title: 'Quarterly federal tax filing (Form 941)',
    category: 'tax_filing',
    subcategory: 'federal',
    priority: 'high',
    status: 'pending',
    risk_level: 'medium',
    description: 'Employer quarterly federal tax return due by the last day of the month following each quarter.',
    is_recurring: true,
    recurrence_interval: 'quarterly',
  });

  items.push({
    ...base,
    title: 'Annual federal unemployment tax (FUTA - Form 940)',
    category: 'tax_filing',
    subcategory: 'federal',
    priority: 'high',
    status: 'pending',
    risk_level: 'medium',
    description: 'Annual FUTA return due by January 31 of the following year.',
    is_recurring: true,
    recurrence_interval: 'annual',
  });

  items.push({
    ...base,
    title: 'Year-end W-2 preparation and filing',
    category: 'tax_filing',
    subcategory: 'federal',
    priority: 'high',
    status: 'pending',
    risk_level: 'medium',
    description: 'W-2 forms must be furnished to employees by January 31 and filed with SSA.',
    is_recurring: true,
    recurrence_interval: 'annual',
  });

  // ── STATE-LEVEL ITEMS (per work state) ───────────────────────────────────

  for (const state of workStates) {
    const isRegistered = registeredStates.has(state);
    const stateReg = (tax?.state_registrations || []).find(r => r.state === state);

    // State withholding registration
    items.push({
      ...base,
      title: `${state} — State withholding tax registration`,
      category: 'tax_registration',
      subcategory: 'state_withholding',
      priority: 'critical',
      status: stateReg?.withholding_account ? 'compliant' : 'pending',
      state_code: state,
      risk_level: stateReg?.withholding_account ? 'low' : 'high',
      description: `State income tax withholding account for ${state}. ${stateReg?.withholding_account ? `Account: ****${stateReg.withholding_account.slice(-4)}` : 'Not registered.'}`,
      blocker: !stateReg?.withholding_account,
    });

    // SUI registration
    items.push({
      ...base,
      title: `${state} — State Unemployment Insurance (SUI) registration`,
      category: 'tax_registration',
      subcategory: 'sui',
      priority: 'critical',
      status: stateReg?.sui_account ? 'compliant' : 'pending',
      state_code: state,
      risk_level: stateReg?.sui_account ? 'low' : 'high',
      description: `SUI account for ${state}. ${stateReg?.sui_rate ? `Rate: ${stateReg.sui_rate}%` : 'Rate not set.'}`,
      blocker: !stateReg?.sui_account,
    });

    // State quarterly tax filing
    items.push({
      ...base,
      title: `${state} — Quarterly state tax filing`,
      category: 'tax_filing',
      subcategory: 'state_quarterly',
      priority: 'high',
      status: 'pending',
      state_code: state,
      risk_level: 'medium',
      description: `Quarterly withholding and SUI filing for ${state}.`,
      is_recurring: true,
      recurrence_interval: 'quarterly',
    });

    // New hire reporting (required by all states)
    const employeesInState = (employees || []).filter(e => (e.work_state || wizardData.company?.state_of_incorporation) === state);
    if (employeesInState.length > 0) {
      items.push({
        ...base,
        title: `${state} — New hire reporting (${employeesInState.length} employee${employeesInState.length > 1 ? 's' : ''})`,
        category: 'new_hire_reporting',
        subcategory: 'state_new_hire',
        priority: 'high',
        status: 'pending',
        state_code: state,
        risk_level: 'high',
        description: `All new hires must be reported to ${state} within 20 days of hire date. ${employeesInState.length} employee(s) pending.`,
      });
    }

    // Local tax registration (state-specific)
    if (STATES_WITH_LOCAL_TAX.includes(state)) {
      items.push({
        ...base,
        title: `${state} — Local/city tax registration`,
        category: 'tax_registration',
        subcategory: 'local_tax',
        priority: 'high',
        status: stateReg?.local_tax_ids ? 'compliant' : 'pending',
        state_code: state,
        risk_level: stateReg?.local_tax_ids ? 'low' : 'medium',
        description: `${state} requires local/city tax registration for municipalities with employees. ${state === 'PA' ? 'PSD codes required.' : ''}`,
      });
    }

    // Paid Family Leave (state-specific)
    if (STATES_WITH_PFL.includes(state)) {
      items.push({
        ...base,
        title: `${state} — Paid Family & Medical Leave enrollment`,
        category: 'benefits_compliance',
        subcategory: 'paid_family_leave',
        priority: 'high',
        status: 'pending',
        state_code: state,
        risk_level: 'medium',
        description: `${state} mandates paid family/medical leave. Employer must register and begin contributions.`,
        is_recurring: true,
        recurrence_interval: 'quarterly',
      });
    }

    // State Disability Insurance (state-specific)
    if (STATES_WITH_SDI.includes(state)) {
      items.push({
        ...base,
        title: `${state} — State Disability Insurance (SDI) registration`,
        category: 'benefits_compliance',
        subcategory: 'sdi',
        priority: 'high',
        status: 'pending',
        state_code: state,
        risk_level: 'medium',
        description: `${state} requires employer registration for state disability insurance program.`,
      });
    }

    // Unregistered state warning
    if (!isRegistered) {
      items.push({
        ...base,
        title: `${state} — Complete state registration`,
        category: 'tax_registration',
        subcategory: 'missing_registration',
        priority: 'critical',
        status: 'at_risk',
        state_code: state,
        risk_level: 'critical',
        description: `No tax registrations found for ${state}. Withholding and SUI accounts must be registered before processing payroll.`,
        blocker: true,
      });
    }
  }

  // ── DOCUMENT REQUIREMENTS ────────────────────────────────────────────────

  items.push({
    ...base,
    title: 'Collect Form I-9 for all employees',
    category: 'document_compliance',
    subcategory: 'i9',
    priority: 'critical',
    status: 'pending',
    risk_level: 'high',
    description: `Employment Eligibility Verification (I-9) required for all ${(employees || []).length} employee(s) within 3 business days of hire.`,
    blocker: true,
  });

  items.push({
    ...base,
    title: 'Collect Form W-4 for all employees',
    category: 'document_compliance',
    subcategory: 'w4',
    priority: 'critical',
    status: 'pending',
    risk_level: 'high',
    description: `Federal W-4 withholding certificates required for all ${(employees || []).length} employee(s).`,
    blocker: true,
  });

  // State W-4 equivalents for each work state
  for (const state of workStates) {
    const stateW4Names: Record<string, string> = {
      CA: 'DE 4', AZ: 'A-4', IL: 'IL-W-4', NY: 'IT-2104', VA: 'VA-4',
      GA: 'G-4', NC: 'NC-4', OH: 'IT 4', PA: 'Local Earned Income Tax form',
      NJ: 'NJ-W4', MA: 'M-4', CT: 'CT-W4', MN: 'W-4MN',
    };
    const formName = stateW4Names[state] || `${state} state withholding form`;
    items.push({
      ...base,
      title: `Collect ${state} state withholding form (${formName})`,
      category: 'document_compliance',
      subcategory: 'state_w4',
      priority: 'high',
      status: 'pending',
      state_code: state,
      risk_level: 'medium',
      description: `State withholding certificate for ${state} employees.`,
    });
  }

  items.push({
    ...base,
    title: 'Collect direct deposit authorization forms',
    category: 'document_compliance',
    subcategory: 'direct_deposit',
    priority: 'medium',
    status: 'pending',
    risk_level: 'low',
    description: 'Direct deposit enrollment forms for all employees electing direct deposit.',
  });

  items.push({
    ...base,
    title: 'Verify benefit enrollment elections',
    category: 'document_compliance',
    subcategory: 'benefits_enrollment',
    priority: 'medium',
    status: wizardData.company?.benefit_type === 'none' ? 'compliant' : 'pending',
    risk_level: 'low',
    description: 'Employee benefit enrollment/waiver forms for medical, dental, vision, and 401(k).',
  });

  // ── LABOR LAW POSTING REQUIREMENTS ──────────────────────────────────────

  items.push({
    ...base,
    title: 'Federal labor law poster compliance',
    category: 'labor_law',
    subcategory: 'federal_posting',
    priority: 'medium',
    status: 'pending',
    risk_level: 'medium',
    description: 'Federal labor law posters (FLSA, FMLA, OSHA, EEO, etc.) must be displayed at each work location.',
  });

  for (const state of workStates) {
    items.push({
      ...base,
      title: `${state} — State labor law poster compliance`,
      category: 'labor_law',
      subcategory: 'state_posting',
      priority: 'medium',
      status: 'pending',
      state_code: state,
      risk_level: 'medium',
      description: `${state} state-specific labor law posters required at each work location.`,
    });
  }

  // ── YTD DATA COMPLIANCE ─────────────────────────────────────────────────

  if (wizardData.tax?.prior_payroll_provider) {
    items.push({
      ...base,
      title: 'Verify YTD payroll data from prior provider',
      category: 'payroll_transition',
      subcategory: 'ytd_reconciliation',
      priority: 'high',
      status: wizardData.employees?.ytd_data?.length ? 'in_progress' : 'pending',
      risk_level: 'high',
      description: `Reconcile YTD wages, taxes, and deductions from ${wizardData.tax.prior_payroll_provider}.`,
    });

    items.push({
      ...base,
      title: 'Obtain prior payroll tax filings',
      category: 'payroll_transition',
      subcategory: 'prior_filings',
      priority: 'high',
      status: 'pending',
      risk_level: 'medium',
      description: `Request copies of quarterly 941 filings and state tax filings from ${wizardData.tax.prior_payroll_provider}.`,
    });
  }

  return items;
}
