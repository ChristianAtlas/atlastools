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
            w9_status: 'on_file',
            w9_collected_at: new Date().toISOString(),
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
// Year-end 1099 summary aggregation
// Combines AtlasOne-paid earnings (placeholder until Phase 2 vendor_payments
// ships) with manually entered prior YTD earnings, split into NEC vs MISC
// totals plus backup withholding totals per vendor / per category.
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