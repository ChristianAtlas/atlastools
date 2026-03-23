import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useEmployees, empCentsToUSD, getInitials } from '@/hooks/useEmployees';
import { useDebounce } from '@/hooks/useDebounce';

export default function Employees() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data: employees = [], isLoading } = useEmployees(undefined, debouncedSearch || undefined);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        description={`${employees.length} employees across all companies`}
        actions={<Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Employee</Button>}
      />

      <div className="flex items-center gap-3 animate-in-up stagger-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border bg-card pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2 transition-shadow"
          />
        </div>
        <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1.5" />Filter</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden animate-in-up stagger-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Company</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Department</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Compensation</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/employees/${emp.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(emp.first_name, emp.last_name)}
                      </div>
                      <div>
                        <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.companies?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.department ?? '—'}</td>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {emp.pay_type === 'hourly'
                      ? empCentsToUSD(emp.hourly_rate_cents, 'hourly')
                      : empCentsToUSD(emp.annual_salary_cents, 'salary')}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No employees found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
