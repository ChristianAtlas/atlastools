import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useCompanies } from '@/hooks/useCompanies';
import { useDebounce } from '@/hooks/useDebounce';

const STATUS_OPTIONS = ['active', 'onboarding', 'suspended', 'terminated'] as const;

export default function Companies() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const debouncedSearch = useDebounce(search, 300);
  const { data: companies = [], isLoading } = useCompanies(debouncedSearch || undefined);

  const toggleStatus = (s: string) => {
    setStatusFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const filtered = statusFilters.length === 0
    ? companies
    : companies.filter(c => statusFilters.includes(c.status));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Companies"
        description={`${filtered.length} client companies`}
        actions={<Button size="sm" onClick={() => navigate('/onboarding/client/new')}><Plus className="h-4 w-4 mr-1.5" />Add Company</Button>}
      />

      <div className="flex items-center gap-3 flex-wrap animate-in-up stagger-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border bg-card pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2 transition-shadow"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map(s => (
            <Button
              key={s}
              variant={statusFilters.includes(s) ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => toggleStatus(s)}
            >
              {s}
            </Button>
          ))}
          {statusFilters.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setStatusFilters([])}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">{search || statusFilters.length > 0 ? 'No companies match your filters.' : 'No companies yet. Add your first company to get started.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in-up stagger-2">
          {filtered.map(company => (
            <div key={company.id} className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/companies/${company.id}`)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary tabular-nums">{company.cid}</span>
                    <h3 className="font-semibold">{company.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">EIN: {company.ein}</p>
                </div>
                <StatusBadge status={company.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="font-medium tabular-nums">{company.employee_count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">State</p>
                  <p className="font-medium">{company.state}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Primary Contact</p>
                  <p className="font-medium">{company.primary_contact_name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
