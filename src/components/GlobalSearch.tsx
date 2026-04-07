import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, User, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

interface CompanyResult {
  id: string;
  name: string;
  cid: string;
  ein: string;
  status: string;
}

interface EmployeeResult {
  id: string;
  first_name: string;
  last_name: string;
  mid: string;
  email: string;
  company_id: string;
  company_name?: string;
  status: string;
}

export function GlobalSearch() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<CompanyResult[]>([]);
  const [employees, setEmployees] = useState<EmployeeResult[]>([]);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = role === 'super_admin';
  const canSearchCompanies = isSuperAdmin;
  const canSearchEmployees = isSuperAdmin || role === 'client_admin';

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setCompanies([]);
      setEmployees([]);
      return;
    }

    setLoading(true);
    const trimmed = q.trim();
    const ilike = `%${trimmed}%`;

    try {
      const promises: Promise<void>[] = [];

      if (canSearchCompanies) {
        promises.push(
          supabase
            .from('companies')
            .select('id, name, cid, ein, status')
            .or(`name.ilike.${ilike},cid.ilike.${ilike},ein.ilike.${ilike}`)
            .is('deleted_at', null)
            .limit(5)
            .then(({ data }) => {
              setCompanies((data as CompanyResult[]) || []);
            })
        );
      }

      if (canSearchEmployees) {
        promises.push(
          supabase
            .from('employees')
            .select('id, first_name, last_name, mid, email, company_id, status')
            .or(`first_name.ilike.${ilike},last_name.ilike.${ilike},mid.ilike.${ilike},email.ilike.${ilike}`)
            .is('deleted_at', null)
            .limit(5)
            .then(({ data }) => {
              setEmployees((data as EmployeeResult[]) || []);
            })
        );
      }

      await Promise.all(promises);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [canSearchCompanies, canSearchEmployees]);

  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery);
      setOpen(true);
    } else {
      setCompanies([]);
      setEmployees([]);
      setOpen(false);
    }
  }, [debouncedQuery, search]);

  const handleSelect = (type: 'company' | 'employee', id: string) => {
    setQuery('');
    setOpen(false);
    if (type === 'company') {
      navigate(`/companies/${id}`);
    } else {
      navigate(`/employees/${id}`);
    }
  };

  if (!canSearchCompanies && !canSearchEmployees) return null;

  const hasResults = companies.length > 0 || employees.length > 0;
  const showDropdown = open && debouncedQuery.length >= 2;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={canSearchCompanies ? "Search CID, company, EIN, employee..." : "Search employee, MID..."}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => debouncedQuery.length >= 2 && setOpen(true)}
        className="h-8 pl-8 pr-8 text-sm"
      />
      {query && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => { setQuery(''); setOpen(false); }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
            </div>
          )}

          {!loading && !hasResults && (
            <div className="px-3 py-3 text-sm text-muted-foreground text-center">No results found</div>
          )}

          {companies.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">Companies</div>
              {companies.map(c => (
                <button
                  key={c.id}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left transition-colors"
                  onClick={() => handleSelect('company', c.id)}
                >
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-mono">{c.cid}</span>
                      <span className="mx-1">·</span>
                      EIN: {c.ein}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{c.status}</Badge>
                </button>
              ))}
            </div>
          )}

          {employees.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">Employees</div>
              {employees.map(e => (
                <button
                  key={e.id}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left transition-colors"
                  onClick={() => handleSelect('employee', e.id)}
                >
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{e.first_name} {e.last_name}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-mono">{e.mid}</span>
                      <span className="mx-1">·</span>
                      {e.email}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{e.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
