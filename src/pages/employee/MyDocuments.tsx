import { useState } from 'react';
import { FileText, Download, Eye, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/PageHeader';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { Loader2 } from 'lucide-react';

interface DocItem {
  id: string;
  title: string;
  category: string;
  date: string;
  status: 'signed' | 'pending' | 'available';
  type: string;
}

const mockDocs: DocItem[] = [
  { id: '1', title: 'W-4 Federal Tax Withholding', category: 'tax', date: '2026-01-15', status: 'signed', type: 'PDF' },
  { id: '2', title: 'State Tax Withholding Form', category: 'tax', date: '2026-01-15', status: 'pending', type: 'PDF' },
  { id: '3', title: 'Employee Handbook Acknowledgment', category: 'company', date: '2025-12-01', status: 'pending', type: 'PDF' },
  { id: '4', title: 'Direct Deposit Authorization', category: 'payroll', date: '2026-01-10', status: 'signed', type: 'PDF' },
  { id: '5', title: 'Benefits Enrollment Confirmation', category: 'benefits', date: '2026-01-01', status: 'available', type: 'PDF' },
  { id: '6', title: 'I-9 Employment Eligibility', category: 'compliance', date: '2025-11-15', status: 'signed', type: 'PDF' },
  { id: '7', title: 'Offer Letter', category: 'company', date: '2025-11-01', status: 'signed', type: 'PDF' },
  { id: '8', title: '2025 W-2', category: 'tax', date: '2026-01-31', status: 'available', type: 'PDF' },
];

const statusBadge = (s: DocItem['status']) => {
  const map = {
    signed: 'bg-success/10 text-success border-success/30',
    pending: 'bg-warning/10 text-warning border-warning/30',
    available: 'bg-info/10 text-info border-info/30',
  };
  return map[s] ?? '';
};

const categories = ['all', 'tax', 'payroll', 'benefits', 'company', 'compliance'];

export default function MyDocuments() {
  const { isLoading } = useCurrentEmployee();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = mockDocs.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = tab === 'all' || d.category === tab;
    return matchSearch && matchCat;
  });

  const pendingCount = mockDocs.filter(d => d.status === 'pending').length;

  return (
    <div className="space-y-6">
      <PageHeader title="My Documents" description={`${mockDocs.length} documents · ${pendingCount} require action`} />

      <Card className="animate-in-up">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">Documents</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {categories.map(c => (
                <TabsTrigger key={c} value={c} className="capitalize text-xs">{c}</TabsTrigger>
              ))}
            </TabsList>

            <div className="mt-4 divide-y">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No documents found</p>
              ) : (
                filtered.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {doc.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusBadge(doc.status)}>{doc.status}</Badge>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Download className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
