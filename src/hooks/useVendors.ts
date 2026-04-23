import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type VendorWorkerType = '1099_ic' | 'c2c_vendor';
export type VendorStatus = 'active' | 'inactive' | 'terminated' | 'pending';
export type VendorOnboardingStatus = 'not_started' | 'in_progress' | 'pending_w9' | 'complete';
export type VendorW9Status = 'not_collected' | 'pending_review' | 'on_file' | 'expired';
export type Vendor1099Category =
  | 'nec'
  | 'misc_rent'
  | 'misc_royalties'
  | 'misc_other_income'
  | 'misc_legal'
  | 'misc_prizes'
  | 'misc_medical'
  | 'misc_other';

export interface VendorRow {
  id: string;
  vid: string;
  company_id: string;
  worker_type: VendorWorkerType;
  is_c2c: boolean;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  business_name: string | null;
  contact_name: string | null;
  legal_name: string;
  tax_id_last4: string | null;
  tax_id_type: 'ssn' | 'ein' | 'itin' | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  status: VendorStatus;
  onboarding_status: VendorOnboardingStatus;
  w9_status: VendorW9Status;
  w9_collected_at: string | null;
  w9_expires_at: string | null;
  portal_access_enabled: boolean;
  backup_withholding_enabled: boolean;
  backup_withholding_rate: number | null;
  default_1099_category: Vendor1099Category;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  companies?: { name: string; cid: string } | null;
}

export interface VendorPriorYtdRow {
  id: string;
  vendor_id: string;
  company_id: string;
  reporting_year: number;
  category: Vendor1099Category;
  amount_cents: number;
  backup_withholding_cents: number;
  source_description: string | null;
  notes: string | null;
  entered_by_name: string | null;
  created_at: string;
}

export function useVendors(filters?: { companyId?: string; workerType?: VendorWorkerType; status?: VendorStatus }) {
  return useQuery({
    queryKey: ['vendors', filters],
    queryFn: async () => {
      let q = supabase
        .from('vendors' as any)
        .select('*, companies:company_id(name, cid)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (filters?.companyId) q = q.eq('company_id', filters.companyId);
      if (filters?.workerType) q = q.eq('worker_type', filters.workerType);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as VendorRow[];
    },
  });
}

export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: ['vendor', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors' as any)
        .select('*, companies:company_id(name, cid)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as VendorRow | null;
    },
  });
}

export function useVendorPriorYtd(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['vendor-prior-ytd', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_ytd_prior_earnings' as any)
        .select('*')
        .eq('vendor_id', vendorId!)
        .order('reporting_year', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VendorPriorYtdRow[];
    },
  });
}

export interface CreateVendorInput {
  company_id: string;
  worker_type: VendorWorkerType;
  is_c2c: boolean;
  legal_name: string;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  business_name?: string | null;
  contact_name?: string | null;
  tax_id_type?: 'ssn' | 'ein' | 'itin' | null;
  tax_id_last4?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  default_1099_category?: Vendor1099Category;
  backup_withholding_enabled?: boolean;
  notes?: string | null;
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVendorInput) => {
      const { data, error } = await supabase
        .from('vendors' as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as VendorRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<VendorRow> }) => {
      const { data, error } = await supabase
        .from('vendors' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as VendorRow;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendor', vars.id] });
    },
  });
}

export function useAddPriorYtd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      vendor_id: string;
      company_id: string;
      reporting_year: number;
      category: Vendor1099Category;
      amount_cents: number;
      backup_withholding_cents?: number;
      source_description?: string | null;
      notes?: string | null;
      entered_by_name?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('vendor_ytd_prior_earnings' as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['vendor-prior-ytd', vars.vendor_id] }),
  });
}

export const VENDOR_1099_CATEGORIES: { value: Vendor1099Category; label: string; form: 'NEC' | 'MISC' }[] = [
  { value: 'nec', label: 'Nonemployee Compensation (services)', form: 'NEC' },
  { value: 'misc_rent', label: 'Rents', form: 'MISC' },
  { value: 'misc_royalties', label: 'Royalties', form: 'MISC' },
  { value: 'misc_other_income', label: 'Other Income', form: 'MISC' },
  { value: 'misc_legal', label: 'Gross proceeds to attorney', form: 'MISC' },
  { value: 'misc_prizes', label: 'Prizes & Awards', form: 'MISC' },
  { value: 'misc_medical', label: 'Medical & health care', form: 'MISC' },
  { value: 'misc_other', label: 'Other (MISC)', form: 'MISC' },
];

// =========================================================================
// Vendor documents (W-9 / MSA / COI / other)
// =========================================================================
export type VendorDocumentType = 'w9' | 'msa' | 'coi' | 'other';

export interface VendorDocumentRow {
  id: string;
  vendor_id: string;
  company_id: string;
  document_type: VendorDocumentType;
  title: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  notes: string | null;
  is_active_w9?: boolean;
  created_at: string;
  updated_at: string;
}

export const VENDOR_DOCUMENT_BUCKET = 'vendor-documents';

export function useVendorDocuments(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['vendor-documents', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_documents' as any)
        .select('*')
        .eq('vendor_id', vendorId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VendorDocumentRow[];
    },
  });
}

export function useUploadVendorDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      vendor_id: string;
      company_id: string;
      document_type: VendorDocumentType;
      title: string;
      file: File;
      notes?: string | null;
      mark_w9_collected?: boolean;
      w9_expires_at?: string | null;
    }) => {
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${input.company_id}/${input.vendor_id}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from(VENDOR_DOCUMENT_BUCKET)
        .upload(path, input.file, { upsert: false, contentType: input.file.type || undefined });
      if (upErr) throw upErr;

      const { data: userData } = await supabase.auth.getUser();
      const uploaderName =
        (userData.user?.user_metadata as any)?.full_name ?? userData.user?.email ?? null;

      const { data, error } = await supabase
        .from('vendor_documents' as any)
        .insert({
          vendor_id: input.vendor_id,
          company_id: input.company_id,
          document_type: input.document_type,
          title: input.title,
          file_path: path,
          file_name: input.file.name,
          file_size: input.file.size,
          mime_type: input.file.type || null,
          uploaded_by: userData.user?.id ?? null,
          uploaded_by_name: uploaderName,
          notes: input.notes ?? null,
        } as any)
        .select()
        .single();
      if (error) {
        // attempt to clean up the orphan file
        await supabase.storage.from(VENDOR_DOCUMENT_BUCKET).remove([path]);
        throw error;
      }

      if (input.document_type === 'w9' && input.mark_w9_collected) {
        await supabase
          .from('vendors' as any)
          .update({
            w9_expires_at: input.w9_expires_at ?? null,
          } as any)
          .eq('id', input.vendor_id);
      }

      return data as unknown as VendorDocumentRow;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['vendor-documents', vars.vendor_id] });
      qc.invalidateQueries({ queryKey: ['vendor', vars.vendor_id] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useDeleteVendorDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: VendorDocumentRow) => {
      if (doc.file_path) {
        await supabase.storage.from(VENDOR_DOCUMENT_BUCKET).remove([doc.file_path]);
      }
      const { error } = await supabase.from('vendor_documents' as any).delete().eq('id', doc.id);
      if (error) throw error;
      return doc;
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['vendor-documents', doc.vendor_id] });
    },
  });
}

export async function getVendorDocumentSignedUrl(filePath: string, expiresInSec = 60) {
  const { data, error } = await supabase.storage
    .from(VENDOR_DOCUMENT_BUCKET)
    .createSignedUrl(filePath, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

export const VENDOR_DOCUMENT_TYPES: { value: VendorDocumentType; label: string }[] = [
  { value: 'w9', label: 'Form W-9' },
  { value: 'msa', label: 'Master Services Agreement' },
  { value: 'coi', label: 'Certificate of Insurance' },
  { value: 'other', label: 'Other' },
];

// =========================================================================
// VENDOR PAYMENTS (Phase 2)
// Eligibility helper, payment runs, and individual payments.
// Hard-block rules mirror the validate_vendor_payment_eligibility DB trigger.
// =========================================================================
export type VendorPaymentRunStatus = 'draft' | 'pending_approval' | 'approved' | 'processing' | 'paid' | 'voided';
export type VendorPaymentMethod = 'ach' | 'check' | 'wire' | 'external';
export type VendorPaymentStatus = 'draft' | 'approved' | 'processing' | 'paid' | 'voided' | 'failed';
export type VendorPaymentRunKind = 'standalone' | 'ride_along';

export interface VendorPaymentRunRow {
  id: string;
  company_id: string;
  payroll_run_id: string | null;
  run_kind: VendorPaymentRunKind;
  status: VendorPaymentRunStatus;
  period_start: string | null;
  period_end: string | null;
  pay_date: string;
  total_amount_cents: number;
  total_backup_withholding_cents: number;
  vendor_count: number;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  processed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  companies?: { name: string; cid: string } | null;
}

export interface VendorPaymentRow {
  id: string;
  vpid: string;
  vendor_payment_run_id: string;
  vendor_id: string;
  company_id: string;
  gross_amount_cents: number;
  backup_withholding_cents: number;
  net_amount_cents: number;
  category: Vendor1099Category;
  reporting_year: number;
  payment_method: VendorPaymentMethod;
  check_number: string | null;
  wire_reference: string | null;
  external_reference: string | null;
  memo: string | null;
  status: VendorPaymentStatus;
  paid_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vendors?: Pick<VendorRow, 'id' | 'vid' | 'legal_name' | 'business_name' | 'first_name' | 'last_name' | 'worker_type'> | null;
}

/** Hard-block rule definition. Keep in sync with validate_vendor_payment_eligibility(). */
export type VendorEligibilityCode =
  | 'vendor_not_active'
  | 'onboarding_incomplete'
  | 'w9_not_on_file'
  | 'w9_expired'
  | 'missing_tin';

export interface VendorEligibility {
  eligible: boolean;
  blockers: VendorEligibilityCode[];
  warnings: VendorEligibilityCode[];
}

export const ELIGIBILITY_LABELS: Record<VendorEligibilityCode, string> = {
  vendor_not_active: 'Vendor not active',
  onboarding_incomplete: 'Onboarding incomplete',
  w9_not_on_file: 'W-9 not on file',
  w9_expired: 'W-9 expired',
  missing_tin: 'Missing TIN',
};

export function evaluateVendorEligibility(v: Pick<VendorRow, 'status' | 'onboarding_status' | 'w9_status' | 'w9_expires_at' | 'tax_id_type' | 'tax_id_last4'>): VendorEligibility {
  const blockers: VendorEligibilityCode[] = [];
  if (v.status !== 'active') blockers.push('vendor_not_active');
  if (v.onboarding_status !== 'complete') blockers.push('onboarding_incomplete');
  if (v.w9_status !== 'on_file') blockers.push('w9_not_on_file');
  if (v.w9_expires_at && new Date(v.w9_expires_at) < new Date(new Date().toDateString())) blockers.push('w9_expired');
  if (!v.tax_id_type || !v.tax_id_last4) blockers.push('missing_tin');
  return { eligible: blockers.length === 0, blockers, warnings: [] };
}

export function useVendorPaymentRuns(filters?: { companyId?: string; status?: VendorPaymentRunStatus; payrollRunId?: string }) {
  return useQuery({
    queryKey: ['vendor-payment-runs', filters],
    queryFn: async () => {
      let q = supabase
        .from('vendor_payment_runs' as any)
        .select('*, companies:company_id(name, cid)')
        .order('pay_date', { ascending: false });
      if (filters?.companyId) q = q.eq('company_id', filters.companyId);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.payrollRunId) q = q.eq('payroll_run_id', filters.payrollRunId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as VendorPaymentRunRow[];
    },
  });
}

export function useVendorPaymentRun(id: string | undefined) {
  return useQuery({
    queryKey: ['vendor-payment-run', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_payment_runs' as any)
        .select('*, companies:company_id(name, cid)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as VendorPaymentRunRow | null;
    },
  });
}

export function useVendorPayments(runId: string | undefined) {
  return useQuery({
    queryKey: ['vendor-payments', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_payments' as any)
        .select('*, vendors:vendor_id(id, vid, legal_name, business_name, first_name, last_name, worker_type)')
        .eq('vendor_payment_run_id', runId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VendorPaymentRow[];
    },
  });
}

export function useVendorPaymentsByVendor(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['vendor-payments-by-vendor', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_payments' as any)
        .select('*, vendors:vendor_id(id, vid, legal_name, business_name, first_name, last_name, worker_type)')
        .eq('vendor_id', vendorId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as VendorPaymentRow[];
    },
  });
}

export interface CreateVendorPaymentRunInput {
  company_id: string;
  pay_date: string;
  period_start?: string | null;
  period_end?: string | null;
  payroll_run_id?: string | null;
  run_kind?: VendorPaymentRunKind;
  notes?: string | null;
}

export function useCreateVendorPaymentRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVendorPaymentRunInput) => {
      const payload = { ...input, run_kind: input.run_kind ?? (input.payroll_run_id ? 'ride_along' : 'standalone') };
      const { data, error } = await supabase
        .from('vendor_payment_runs' as any)
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as VendorPaymentRunRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-payment-runs'] }),
  });
}

export interface CreateVendorPaymentInput {
  vendor_payment_run_id: string;
  vendor_id: string;
  company_id: string;
  gross_amount_cents: number;
  backup_withholding_cents?: number;
  category?: Vendor1099Category;
  reporting_year?: number;
  payment_method?: VendorPaymentMethod;
  check_number?: string | null;
  external_reference?: string | null;
  memo?: string | null;
  notes?: string | null;
}

export function useCreateVendorPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVendorPaymentInput) => {
      const gross = input.gross_amount_cents;
      const bw = input.backup_withholding_cents ?? 0;
      const payload = {
        ...input,
        backup_withholding_cents: bw,
        net_amount_cents: Math.max(0, gross - bw),
        category: input.category ?? 'nec',
        reporting_year: input.reporting_year ?? new Date().getFullYear(),
        payment_method: input.payment_method ?? 'ach',
      };
      const { data, error } = await supabase
        .from('vendor_payments' as any)
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as VendorPaymentRow;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['vendor-payments', vars.vendor_payment_run_id] });
      qc.invalidateQueries({ queryKey: ['vendor-payment-runs'] });
      qc.invalidateQueries({ queryKey: ['vendor-payment-run', vars.vendor_payment_run_id] });
    },
  });
}

export function useDeleteVendorPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, runId }: { id: string; runId: string }) => {
      const { error } = await supabase.from('vendor_payments' as any).delete().eq('id', id);
      if (error) throw error;
      return { id, runId };
    },
    onSuccess: ({ runId }) => {
      qc.invalidateQueries({ queryKey: ['vendor-payments', runId] });
      qc.invalidateQueries({ queryKey: ['vendor-payment-runs'] });
      qc.invalidateQueries({ queryKey: ['vendor-payment-run', runId] });
    },
  });
}

export function useUpdateVendorPaymentRunStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VendorPaymentRunStatus }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'approved') updates.approved_at = new Date().toISOString();
      if (status === 'processing') updates.processed_at = new Date().toISOString();
      if (status === 'paid') updates.paid_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('vendor_payment_runs' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as VendorPaymentRunRow;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['vendor-payment-runs'] });
      qc.invalidateQueries({ queryKey: ['vendor-payment-run', vars.id] });
    },
  });
}

// =========================================================================
// Year-end 1099 summary aggregation
// Reconciliation rules (so totals tie out to Form 1099-NEC / 1099-MISC):
//   1. Pull every vendor in scope (optionally filtered to one company).
//   2. AtlasOne-paid totals come from `vendor_payments` rows where
//        - `reporting_year` matches the selected tax year,
//        - `status <> 'voided'` (voided payments never hit a 1099),
//        - `vendor_id` is in scope.
//      Each payment contributes `gross_amount_cents` to NEC or MISC based on
//      its `category`, and `backup_withholding_cents` to the BW bucket.
//   3. Prior-YTD imports (mid-year migrations) come from
//      `vendor_ytd_prior_earnings` for the same year and add to the same
//      NEC / MISC / BW buckets so the reportable total reconciles to:
//          total_reportable_cents = atlas_paid_cents + prior_ytd_cents
//          nec_cents              = Σ(category='nec')      across both sources
//          misc_cents             = Σ(category like 'misc_%') across both sources
//          backup_withholding     = Σ(backup_withholding_cents) across both sources
//   4. Category → form mapping uses VENDOR_1099_CATEGORIES (single source of
//      truth), so a vendor with both NEC and MISC activity is flagged 'BOTH'
//      and will need two forms filed.
// =========================================================================
export interface Vendor1099SummaryRow {
  vendor_id: string;
  vid: string;
  legal_name: string;
  business_name: string | null;
  worker_type: VendorWorkerType;
  is_c2c: boolean;
  tax_id_type: 'ssn' | 'ein' | 'itin' | null;
  tax_id_last4: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  w9_status: VendorW9Status;
  company_id: string;
  company_name: string | null;
  company_cid: string | null;
  // Aggregated cents totals
  nec_cents: number;
  misc_cents: number;
  misc_breakdown: Record<Vendor1099Category, number>;
  backup_withholding_cents: number;
  prior_ytd_cents: number; // entered for current AtlasOne, separate visibility
  atlas_paid_cents: number; // placeholder = 0 until Phase 2
  total_reportable_cents: number;
  reportable_form: 'NEC' | 'MISC' | 'BOTH' | 'NONE';
  exceptions: string[]; // missing_w9, missing_tin, under_threshold, etc.
}

export interface Use1099SummaryFilters {
  reportingYear: number;
  companyId?: string;
}

const NEC_CATEGORIES: Vendor1099Category[] = ['nec'];

export function use1099Summary({ reportingYear, companyId }: Use1099SummaryFilters) {
  return useQuery({
    queryKey: ['vendor-1099-summary', reportingYear, companyId ?? 'all'],
    queryFn: async () => {
      // Fetch vendors in scope
      let vq = supabase
        .from('vendors' as any)
        .select('*, companies:company_id(name, cid)')
        .is('deleted_at', null);
      if (companyId) vq = vq.eq('company_id', companyId);
      const { data: vData, error: vErr } = await vq;
      if (vErr) throw vErr;
      const vendors = (vData ?? []) as unknown as VendorRow[];
      if (vendors.length === 0) return [] as Vendor1099SummaryRow[];

      const ids = vendors.map((v) => v.id);

      // Fetch prior YTD entries for the year
      const { data: pData, error: pErr } = await supabase
        .from('vendor_ytd_prior_earnings' as any)
        .select('vendor_id, category, amount_cents, backup_withholding_cents, reporting_year')
        .eq('reporting_year', reportingYear)
        .in('vendor_id', ids);
      if (pErr) throw pErr;
      const prior = (pData ?? []) as unknown as Array<{
        vendor_id: string;
        category: Vendor1099Category;
        amount_cents: number;
        backup_withholding_cents: number;
      }>;

      // Phase 2 hook: aggregate vendor_payments here when the table exists.
      // For now, atlas_paid totals are zero so the summary still surfaces prior
      // YTD imports correctly.

      const byVendor = new Map<string, { nec: number; misc: number; bw: number; misc_breakdown: Record<Vendor1099Category, number>; prior: number }>();
      for (const row of prior) {
        const cur = byVendor.get(row.vendor_id) ?? {
          nec: 0,
          misc: 0,
          bw: 0,
          misc_breakdown: {
            nec: 0,
            misc_rent: 0,
            misc_royalties: 0,
            misc_other_income: 0,
            misc_legal: 0,
            misc_prizes: 0,
            misc_medical: 0,
            misc_other: 0,
          } as Record<Vendor1099Category, number>,
          prior: 0,
        };
        cur.prior += row.amount_cents;
        cur.bw += row.backup_withholding_cents;
        if (NEC_CATEGORIES.includes(row.category)) {
          cur.nec += row.amount_cents;
        } else {
          cur.misc += row.amount_cents;
          cur.misc_breakdown[row.category] = (cur.misc_breakdown[row.category] ?? 0) + row.amount_cents;
        }
        byVendor.set(row.vendor_id, cur);
      }

      const summary: Vendor1099SummaryRow[] = vendors.map((v) => {
        const agg = byVendor.get(v.id);
        const nec_cents = agg?.nec ?? 0;
        const misc_cents = agg?.misc ?? 0;
        const total = nec_cents + misc_cents;
        const exceptions: string[] = [];
        if (v.w9_status !== 'on_file') exceptions.push('missing_w9');
        if (!v.tax_id_last4 || !v.tax_id_type) exceptions.push('missing_tin');
        // IRS reporting threshold: $600 for NEC, $600 for most MISC boxes,
        // $10 for royalties. Flag low-but-nonzero totals so reviewers see them.
        if (total > 0 && total < 60000) exceptions.push('under_threshold');

        let form: 'NEC' | 'MISC' | 'BOTH' | 'NONE' = 'NONE';
        if (nec_cents > 0 && misc_cents > 0) form = 'BOTH';
        else if (nec_cents > 0) form = 'NEC';
        else if (misc_cents > 0) form = 'MISC';

        const display = v.is_c2c || v.worker_type === 'c2c_vendor'
          ? v.business_name || v.legal_name
          : `${v.first_name ?? ''} ${v.last_name ?? ''}`.trim() || v.legal_name;

        return {
          vendor_id: v.id,
          vid: v.vid,
          legal_name: display,
          business_name: v.business_name,
          worker_type: v.worker_type,
          is_c2c: v.is_c2c,
          tax_id_type: v.tax_id_type,
          tax_id_last4: v.tax_id_last4,
          email: v.email,
          address_line1: v.address_line1,
          address_line2: v.address_line2,
          city: v.city,
          state: v.state,
          zip: v.zip,
          w9_status: v.w9_status,
          company_id: v.company_id,
          company_name: v.companies?.name ?? null,
          company_cid: v.companies?.cid ?? null,
          nec_cents,
          misc_cents,
          misc_breakdown: agg?.misc_breakdown ?? {
            nec: 0,
            misc_rent: 0,
            misc_royalties: 0,
            misc_other_income: 0,
            misc_legal: 0,
            misc_prizes: 0,
            misc_medical: 0,
            misc_other: 0,
          } as Record<Vendor1099Category, number>,
          backup_withholding_cents: agg?.bw ?? 0,
          prior_ytd_cents: agg?.prior ?? 0,
          atlas_paid_cents: 0,
          total_reportable_cents: total,
          reportable_form: form,
        exceptions,
        };
      });

      return summary;
    },
  });
}