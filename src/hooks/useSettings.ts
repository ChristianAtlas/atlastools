import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EnterpriseSetting {
  id: string;
  category: string;
  key: string;
  value: any;
  data_type: string;
  description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientOverride {
  id: string;
  company_id: string;
  setting_key: string;
  override_value: any;
  inherited: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettingAuditLog {
  id: string;
  setting_key: string;
  scope: string;
  company_id: string | null;
  old_value: any;
  new_value: any;
  changed_by: string | null;
  changed_by_email: string | null;
  reason: string | null;
  created_at: string;
}

export function useEnterpriseSettings() {
  return useQuery({
    queryKey: ['enterprise_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enterprise_settings')
        .select('*')
        .order('category', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EnterpriseSetting[];
    },
  });
}

export function useClientOverrides(companyId: string | null) {
  return useQuery({
    queryKey: ['client_overrides', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_setting_overrides')
        .select('*')
        .eq('company_id', companyId!);
      if (error) throw error;
      return (data ?? []) as ClientOverride[];
    },
  });
}

export function useSettingAuditLogs(scope?: string, companyId?: string | null) {
  return useQuery({
    queryKey: ['setting_audit_logs', scope, companyId],
    queryFn: async () => {
      let q = supabase.from('setting_audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (scope) q = q.eq('scope', scope);
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SettingAuditLog[];
    },
  });
}

export function useUpsertEnterpriseSetting() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ key, value, category, data_type, description, reason }: {
      key: string; value: any; category: string; data_type?: string; description?: string; reason?: string;
    }) => {
      // Check if exists
      const { data: existing } = await supabase
        .from('enterprise_settings')
        .select('id, value')
        .eq('key', key)
        .maybeSingle();

      const oldValue = existing?.value ?? null;

      const { error } = await supabase.from('enterprise_settings').upsert({
        key,
        value: JSON.stringify(value),
        category,
        data_type: data_type ?? 'string',
        description: description ?? null,
        updated_by: user?.id ?? null,
      }, { onConflict: 'key' });
      if (error) throw error;

      // Audit log
      await supabase.from('setting_audit_logs').insert({
        setting_key: key,
        scope: 'enterprise',
        old_value: oldValue,
        new_value: value,
        changed_by: user?.id ?? null,
        changed_by_email: user?.email ?? null,
        reason: reason ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise_settings'] });
      qc.invalidateQueries({ queryKey: ['setting_audit_logs'] });
      toast.success('Setting saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpsertClientOverride() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ companyId, key, value, reason }: {
      companyId: string; key: string; value: any; reason?: string;
    }) => {
      const { data: existing } = await supabase
        .from('client_setting_overrides')
        .select('id, override_value')
        .eq('company_id', companyId)
        .eq('setting_key', key)
        .maybeSingle();

      const oldValue = existing?.override_value ?? null;

      const { error } = await supabase.from('client_setting_overrides').upsert({
        company_id: companyId,
        setting_key: key,
        override_value: JSON.stringify(value),
        inherited: false,
        updated_by: user?.id ?? null,
      }, { onConflict: 'company_id,setting_key' });
      if (error) throw error;

      await supabase.from('setting_audit_logs').insert({
        setting_key: key,
        scope: 'client',
        company_id: companyId,
        old_value: oldValue,
        new_value: value,
        changed_by: user?.id ?? null,
        changed_by_email: user?.email ?? null,
        reason: reason ?? null,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client_overrides', vars.companyId] });
      qc.invalidateQueries({ queryKey: ['setting_audit_logs'] });
      toast.success('Client setting saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteClientOverride() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ companyId, key }: { companyId: string; key: string }) => {
      const { data: existing } = await supabase
        .from('client_setting_overrides')
        .select('override_value')
        .eq('company_id', companyId)
        .eq('setting_key', key)
        .maybeSingle();

      const { error } = await supabase
        .from('client_setting_overrides')
        .delete()
        .eq('company_id', companyId)
        .eq('setting_key', key);
      if (error) throw error;

      await supabase.from('setting_audit_logs').insert({
        setting_key: key,
        scope: 'client',
        company_id: companyId,
        old_value: existing?.override_value ?? null,
        new_value: null,
        changed_by: user?.id ?? null,
        changed_by_email: user?.email ?? null,
        reason: 'Reverted to enterprise default',
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client_overrides', vars.companyId] });
      qc.invalidateQueries({ queryKey: ['setting_audit_logs'] });
      toast.success('Reverted to enterprise default');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// Default enterprise settings definitions
export const ENTERPRISE_SETTING_DEFS: {
  key: string; label: string; category: string; data_type: string; defaultValue: any; description: string;
}[] = [
  // Platform
  { key: 'platform.legal_name', label: 'Legal Entity Name', category: 'platform', data_type: 'string', defaultValue: 'AtlasOne HR LLC', description: 'AtlasOne legal entity name' },
  { key: 'platform.dba_name', label: 'DBA Name', category: 'platform', data_type: 'string', defaultValue: 'AtlasOne HR', description: 'Doing business as name' },
  { key: 'platform.fein', label: 'FEIN', category: 'platform', data_type: 'string', defaultValue: '', description: 'Federal Employer ID' },
  { key: 'platform.support_email', label: 'Support Email', category: 'platform', data_type: 'string', defaultValue: 'support@atlasone.com', description: 'Platform support email' },
  { key: 'platform.payroll_ops_email', label: 'Payroll Ops Email', category: 'platform', data_type: 'string', defaultValue: 'payroll@atlasone.com', description: 'Payroll operations email' },
  { key: 'platform.compliance_email', label: 'Compliance Email', category: 'platform', data_type: 'string', defaultValue: 'compliance@atlasone.com', description: 'Compliance team email' },
  { key: 'platform.finance_email', label: 'Finance / AR Email', category: 'platform', data_type: 'string', defaultValue: 'finance@atlasone.com', description: 'Finance and AR email' },
  { key: 'platform.timezone', label: 'Default Timezone', category: 'platform', data_type: 'string', defaultValue: 'America/New_York', description: 'Platform default timezone' },
  { key: 'platform.currency', label: 'Default Currency', category: 'platform', data_type: 'string', defaultValue: 'USD', description: 'Default currency code' },
  // Payroll
  { key: 'payroll.semimonthly_salary_hours', label: 'Semi-Monthly Salary Hours', category: 'payroll', data_type: 'number', defaultValue: 86.67, description: 'Default salary hours per semi-monthly period' },
  { key: 'payroll.semimonthly_approval_days_before', label: 'Semi-Monthly Approval Cutoff (Days Before Check Date)', category: 'payroll', data_type: 'number', defaultValue: 4, description: 'Calendar days before check date for approval deadline' },
  { key: 'payroll.biweekly_timecard_cutoff', label: 'Bi-Weekly Timecard Cutoff', category: 'payroll', data_type: 'string', defaultValue: 'Monday 10:00 AM EST', description: 'Timecard submission deadline for bi-weekly' },
  { key: 'payroll.biweekly_approval_cutoff', label: 'Bi-Weekly Approval Cutoff', category: 'payroll', data_type: 'string', defaultValue: 'Tuesday 5:00 PM EST', description: 'Payroll approval deadline for bi-weekly' },
  { key: 'payroll.expedited_wire_cutoff', label: 'Expedited Wire Cutoff', category: 'payroll', data_type: 'string', defaultValue: 'Thursday 1:00 PM EST', description: 'Expedited wire funding deadline' },
  { key: 'payroll.auto_approve_semimonthly', label: 'Auto-Approve Semi-Monthly', category: 'payroll', data_type: 'boolean', defaultValue: true, description: 'Auto-approve semi-monthly payrolls' },
  { key: 'payroll.auto_approve_biweekly', label: 'Auto-Approve Bi-Weekly', category: 'payroll', data_type: 'boolean', defaultValue: false, description: 'Auto-approve bi-weekly payrolls' },
  { key: 'payroll.pay_date_weekend_shift', label: 'Pay Date Weekend Shift', category: 'payroll', data_type: 'string', defaultValue: 'previous_friday', description: 'How to handle pay dates falling on weekends' },
  { key: 'payroll.pay_date_holiday_shift', label: 'Pay Date Holiday Shift', category: 'payroll', data_type: 'string', defaultValue: 'previous_business_day', description: 'How to handle pay dates falling on holidays' },
  // Tax
  { key: 'tax.sui_markup_rate', label: 'SUI Markup Rate', category: 'tax', data_type: 'number', defaultValue: 0.025, description: 'Hidden SUI markup percentage (default 2.5%)' },
  { key: 'tax.wc_markup_rate', label: 'Workers\' Comp Markup Rate', category: 'tax', data_type: 'number', defaultValue: 0.015, description: 'Hidden WC markup percentage (default 1.5%)' },
  { key: 'tax.sui_billing_default', label: 'SUI Billing Default', category: 'tax', data_type: 'string', defaultValue: 'peo_rate', description: 'Default SUI billing method (peo_rate or client_reporting)' },
  { key: 'tax.futa_billing_enabled', label: 'FUTA Billing Enabled', category: 'tax', data_type: 'boolean', defaultValue: true, description: 'Whether FUTA is included in billing' },
  // Billing
  { key: 'billing.monthly_invoice_day', label: 'Monthly Invoice Day', category: 'billing', data_type: 'number', defaultValue: 1, description: 'Day of month for auto invoice generation' },
  { key: 'billing.payroll_invoice_trigger', label: 'Payroll Invoice Trigger', category: 'billing', data_type: 'string', defaultValue: 'payroll_processed', description: 'When payroll invoice generates' },
  { key: 'billing.default_due_timing', label: 'Default Due Timing', category: 'billing', data_type: 'string', defaultValue: 'due_immediately', description: 'Invoice due date default' },
  { key: 'billing.nsf_fee_cents', label: 'NSF Fee (cents)', category: 'billing', data_type: 'number', defaultValue: 5000, description: 'Fee charged for NSF events (in cents)' },
  { key: 'billing.max_payment_retries', label: 'Max Payment Retries', category: 'billing', data_type: 'number', defaultValue: 3, description: 'Maximum auto-retry attempts for failed payments' },
  { key: 'billing.collections_reminder_days', label: 'Collections Reminder (Days)', category: 'billing', data_type: 'number', defaultValue: 7, description: 'Days between auto collections reminders' },
  // Compliance
  { key: 'compliance.i9_deadline_days', label: 'I-9 Deadline (Days)', category: 'compliance', data_type: 'number', defaultValue: 3, description: 'Days after hire to complete I-9' },
  { key: 'compliance.new_hire_reporting_days', label: 'New Hire Reporting (Days)', category: 'compliance', data_type: 'number', defaultValue: 20, description: 'Days after hire to file new hire report' },
  { key: 'compliance.payroll_blocking_enabled', label: 'Payroll Blocking Enabled', category: 'compliance', data_type: 'boolean', defaultValue: true, description: 'Block payroll for employees with compliance flags' },
  { key: 'compliance.license_renewal_reminder_days', label: 'License Renewal Reminder (Days)', category: 'compliance', data_type: 'number', defaultValue: 60, description: 'Days before expiry to send license renewal reminder' },
];

export const SETTING_CATEGORIES = [
  { key: 'platform', label: 'Company / Platform', icon: 'Building2' },
  { key: 'payroll', label: 'Payroll Engine', icon: 'DollarSign' },
  { key: 'tax', label: 'Tax Settings', icon: 'Receipt' },
  { key: 'billing', label: 'Billing & Invoicing', icon: 'CreditCard' },
  { key: 'compliance', label: 'Compliance', icon: 'Shield' },
  { key: 'roles', label: 'Roles & Permissions', icon: 'Users' },
  { key: 'automations', label: 'Workflow Automations', icon: 'Zap' },
  { key: 'integrations', label: 'Integrations', icon: 'Plug' },
  { key: 'notifications', label: 'Notifications & Templates', icon: 'Bell' },
  { key: 'audit', label: 'Audit & Change History', icon: 'History' },
];

export const CLIENT_SETTING_SECTIONS = [
  { key: 'profile', label: 'Client Profile', icon: 'Building' },
  { key: 'payroll', label: 'Payroll Settings', icon: 'DollarSign' },
  { key: 'tax', label: 'Tax Settings', icon: 'Receipt' },
  { key: 'billing', label: 'Billing Settings', icon: 'CreditCard' },
  { key: 'compliance', label: 'Compliance', icon: 'Shield' },
  { key: 'hr', label: 'HR / Employment', icon: 'UserCheck' },
  { key: 'access', label: 'User Access', icon: 'Key' },
  { key: 'integrations', label: 'Integrations', icon: 'Plug' },
  { key: 'notes', label: 'Notes & Documents', icon: 'FileText' },
];
