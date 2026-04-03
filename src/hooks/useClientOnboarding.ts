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
        .update(updates)
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
      const employeeData = wizardData.employees?.employee_data || [];
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
