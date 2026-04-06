import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWCCodes } from '@/hooks/useWorkersComp';
import { useCompanies } from '@/hooks/useCompanies';
import { Search } from 'lucide-react';
import { format } from 'date-fns';

export function WCCodesTab() {
  const [search, setSearch] = useState('');
  const { data: codes = [], isLoading } = useWCCodes();
  const { data: companies = [] } = useCompanies();
  const companyMap = new Map(companies.map(c => [c.id, c.name]));

  const filtered = codes.filter(c =>
    !search ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()) ||
    c.state.toLowerCase().includes(search.toLowerCase()) ||
    (companyMap.get(c.company_id) || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search codes…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Rate / $100</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No class codes found</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">{c.code}</TableCell>
                  <TableCell className="text-sm">{c.description}</TableCell>
                  <TableCell className="text-sm">{companyMap.get(c.company_id) || '—'}</TableCell>
                  <TableCell>{c.state}</TableCell>
                  <TableCell className="font-mono">${c.rate_per_hundred.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(c.effective_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.expiration_date ? format(new Date(c.expiration_date), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${c.is_active ? 'border-emerald-500 text-emerald-600' : 'border-muted-foreground'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
