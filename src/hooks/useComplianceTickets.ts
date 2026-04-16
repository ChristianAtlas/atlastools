import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ComplianceItem } from './useCompliance';

/**
 * Compliance Tickets — thin layer over compliance_items that:
 *  - Auto-generates tickets for known gaps (missing 8973, expired licenses, etc.)
 *  - Provides a unified queryable inbox
 *  - Supports a checklist stored in metadata.checklist
 *
 * A "ticket" is just a compliance_items row. We tag the source via
 * metadata.ticket_source = 'form_8973' | 'license_expiring' | 'manual' | ...
 */

export type TicketSource =
  | 'form_8973_missing'
  | 'form_8973_unsigned'
  | 'license_expiring'
  | 'license_expired'
  | 'tax_account_missing'
  | 'item_overdue'
  | 'manual';

export interface ChecklistStep {
  id: string;
  label: string;
  done: boolean;
}

export interface TicketMetadata {
  ticket_source?: TicketSource;
  source_id?: string; // e.g. form_8973_filing_id, license_id
  checklist?: ChecklistStep[];
  link?: string; // deep link to the source detail page
  [k: string]: unknown;
}

export type ComplianceTicket = ComplianceItem & { metadata: TicketMetadata };

const TICKET_TAG_KEY = 'ticket_source';

/** Fetch all tickets (compliance_items with a ticket_source tag) */
export function useComplianceTickets(filters?: {
  status?: string;
  source?: TicketSource;
  companyId?: string;
}) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`compliance-tickets-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compliance_items' }, () => {
        qc.invalidateQueries({ queryKey: ['compliance-tickets'] });
        qc.invalidateQueries({ queryKey: ['compliance-items'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return useQuery({
    queryKey: ['compliance-tickets', filters],
    queryFn: async () => {
      let q = supabase
        .from('compliance_items')
        .select('*')
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsFirst: false });
      if (filters?.companyId) q = q.eq('company_id', filters.companyId);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      const all = (data ?? []) as ComplianceTicket[];
      // Filter to ticket-tagged items (or include all if no source filter)
      const tickets = all.filter(t => {
        const md = (t.metadata || {}) as TicketMetadata;
        return md[TICKET_TAG_KEY] !== undefined;
      });
      if (filters?.source) {
        return tickets.filter(t => (t.metadata as TicketMetadata).ticket_source === filters.source);
      }
      return tickets;
    },
  });
}

export function useComplianceTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['compliance-tickets', 'one', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('compliance_items').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as ComplianceTicket;
    },
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ComplianceTicket> & { id: string }) => {
      const { data, error } = await supabase
        .from('compliance_items')
        .update(patch as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-tickets'] });
      qc.invalidateQueries({ queryKey: ['compliance-items'] });
      toast.success('Ticket updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * Sync missing-Form-8973 gaps into compliance_items as tickets.
 * Idempotent: skips companies that already have an open ticket.
 */
export function useSyncForm8973Tickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const [{ data: companies }, { data: filings }, { data: existing }] = await Promise.all([
        supabase.from('companies').select('id, name, cid').neq('status', 'terminated').is('deleted_at', null),
        supabase.from('form_8973_filings').select('company_id, status, signed_at'),
        supabase.from('compliance_items').select('id, company_id, metadata, status'),
      ]);

      const filingsByCompany = new Map<string, { status: string; signed_at: string | null }>();
      (filings ?? []).forEach(f => filingsByCompany.set(f.company_id, { status: f.status, signed_at: f.signed_at }));

      const openTicketKeys = new Set(
        (existing ?? [])
          .filter(i => i.status !== 'compliant' && i.status !== 'waived')
          .map(i => {
            const md = (i.metadata || {}) as TicketMetadata;
            return md.ticket_source ? `${md.ticket_source}:${i.company_id ?? ''}` : '';
          })
          .filter(Boolean)
      );

      const toInsert: any[] = [];
      for (const c of companies ?? []) {
        const f = filingsByCompany.get(c.id);
        if (!f) {
          // Missing entirely
          const key = `form_8973_missing:${c.id}`;
          if (!openTicketKeys.has(key)) {
            toInsert.push({
              entity_type: 'client',
              entity_id: c.id,
              company_id: c.id,
              category: 'Onboarding Compliance',
              subcategory: 'IRS Form 8973',
              title: `Form 8973 missing — ${c.name} (${c.cid})`,
              description: `Active client has no IRS Form 8973 filing on record. CPEO must file within 30 days of contract start.`,
              status: 'pending',
              priority: 'high',
              risk_level: 'high',
              blocker: false,
              metadata: { ticket_source: 'form_8973_missing', source_id: c.id, link: `/compliance?tab=form8973` },
            });
          }
        } else if (!f.signed_at && f.status !== 'compliant') {
          const key = `form_8973_unsigned:${c.id}`;
          if (!openTicketKeys.has(key)) {
            toInsert.push({
              entity_type: 'client',
              entity_id: c.id,
              company_id: c.id,
              category: 'Onboarding Compliance',
              subcategory: 'IRS Form 8973',
              title: `Form 8973 awaiting signature — ${c.name}`,
              description: `Filing exists but client signature has not been captured.`,
              status: 'in_progress',
              priority: 'high',
              risk_level: 'medium',
              metadata: { ticket_source: 'form_8973_unsigned', source_id: c.id, link: `/compliance?tab=form8973` },
            });
          }
        }
      }

      if (toInsert.length) {
        const { error } = await supabase.from('compliance_items').insert(toInsert as any);
        if (error) throw error;
      }
      return toInsert.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['compliance-tickets'] });
      qc.invalidateQueries({ queryKey: ['compliance-items'] });
      if (n > 0) toast.success(`${n} ticket${n > 1 ? 's' : ''} created`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * Sync expiring/expired license gaps into tickets.
 */
export function useSyncLicenseTickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const [{ data: licenses }, { data: existing }] = await Promise.all([
        supabase.from('compliance_licenses').select('*'),
        supabase.from('compliance_items').select('id, metadata, status'),
      ]);

      const openKeys = new Set(
        (existing ?? [])
          .filter(i => i.status !== 'compliant' && i.status !== 'waived')
          .map(i => {
            const md = (i.metadata || {}) as TicketMetadata;
            return md.ticket_source && md.source_id ? `${md.ticket_source}:${md.source_id}` : '';
          })
          .filter(Boolean)
      );

      const today = new Date();
      const in60days = new Date(); in60days.setDate(today.getDate() + 60);

      const toInsert: any[] = [];
      for (const lic of licenses ?? []) {
        if (!lic.expiration_date) continue;
        const exp = new Date(lic.expiration_date);
        const expired = exp < today;
        const expiring = !expired && exp <= in60days;
        if (!expired && !expiring) continue;

        const source: TicketSource = expired ? 'license_expired' : 'license_expiring';
        const key = `${source}:${lic.id}`;
        if (openKeys.has(key)) continue;

        toInsert.push({
          entity_type: lic.entity_type,
          entity_id: lic.entity_id,
          company_id: lic.company_id,
          category: 'Licensing',
          subcategory: lic.license_type,
          title: `${expired ? 'Expired' : 'Expiring'} license: ${lic.license_type}${lic.state_code ? ` (${lic.state_code})` : ''}`,
          description: `License ${lic.license_number ?? ''} expires on ${lic.expiration_date}.`,
          status: 'pending',
          priority: expired ? 'critical' : 'high',
          risk_level: expired ? 'critical' : 'high',
          due_date: lic.expiration_date,
          state_code: lic.state_code,
          blocker: expired,
          metadata: { ticket_source: source, source_id: lic.id, link: `/compliance?tab=licenses` },
        });
      }

      if (toInsert.length) {
        const { error } = await supabase.from('compliance_items').insert(toInsert as any);
        if (error) throw error;
      }
      return toInsert.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['compliance-tickets'] });
      if (n > 0) toast.success(`${n} license ticket${n > 1 ? 's' : ''} created`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleChecklistStep(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ stepId, done }: { stepId: string; done: boolean }) => {
      const { data: cur, error: e1 } = await supabase
        .from('compliance_items').select('metadata').eq('id', ticketId).single();
      if (e1) throw e1;
      const md = (cur?.metadata || {}) as TicketMetadata;
      const checklist = (md.checklist ?? []).map(s => s.id === stepId ? { ...s, done } : s);
      const newMd = { ...md, checklist };
      const { error } = await supabase.from('compliance_items').update({ metadata: newMd as any }).eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-tickets'] });
    },
  });
}
