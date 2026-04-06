import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Upload, FileText, File, Search, Filter, Loader2, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/hooks/useCompanies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';

interface ComplianceDoc {
  id: string;
  entity_type: string;
  entity_id: string;
  company_id: string | null;
  title: string;
  description: string | null;
  document_type: string;
  file_name: string | null;
  file_size: number | null;
  uploaded_by_name: string | null;
  status: string | null;
  created_at: string;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const debouncedSearch = useDebounce(search, 300);

  const { data: companies = [] } = useCompanies();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['client_documents', companyFilter, debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('compliance_documents')
        .select('*')
        .eq('entity_type', 'client')
        .order('created_at', { ascending: false });

      if (companyFilter && companyFilter !== 'all') {
        query = query.eq('company_id', companyFilter);
      }
      if (debouncedSearch) {
        query = query.or(`title.ilike.%${debouncedSearch}%,document_type.ilike.%${debouncedSearch}%,file_name.ilike.%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ComplianceDoc[];
    },
  });

  const companyMap = Object.fromEntries(companies.map(c => [c.id, c.name]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Documents"
        description="Client-level documents across all worksite employers"
        actions={<Button size="sm"><Upload className="h-4 w-4 mr-1.5" />Upload</Button>}
      />

      <div className="flex items-center gap-3 animate-in-up stagger-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border bg-card pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2 transition-shadow"
          />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground animate-in-up stagger-2">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {search || companyFilter !== 'all'
              ? 'No documents match your filters.'
              : 'No client documents uploaded yet.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden animate-in-up stagger-2">
          <div className="divide-y">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer">
                <div className="rounded-lg bg-primary/10 p-2">
                  {['tax', 'w-9', 'w-4'].some(t => doc.document_type.toLowerCase().includes(t))
                    ? <FileText className="h-5 w-5 text-primary" />
                    : <File className="h-5 w-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.document_type}
                    {doc.company_id && companyMap[doc.company_id]
                      ? ` · ${companyMap[doc.company_id]}`
                      : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {doc.uploaded_by_name ?? '—'} · {formatSize(doc.file_size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
