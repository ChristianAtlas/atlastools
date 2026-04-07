import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users, Plus, Search, Mail, Send, Clock, FileEdit, Eye } from 'lucide-react';
import { useCommunications, COMM_STATUSES } from '@/hooks/useCommunications';
import { useDebounce } from '@/hooks/useDebounce';
import { format } from 'date-fns';

export default function Communications() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data: communications = [], isLoading } = useCommunications({
    status: statusFilter,
    search: debouncedSearch || undefined,
  });

  if (role && role !== 'super_admin') return <Navigate to="/" replace />;

  const getStatusBadge = (status: string) => {
    const s = COMM_STATUSES.find(c => c.value === status);
    return <Badge variant="outline" className={s?.color ?? ''}>{s?.label ?? status}</Badge>;
  };

  const drafts = communications.filter(c => c.status === 'draft');
  const scheduled = communications.filter(c => c.status === 'scheduled');
  const sent = communications.filter(c => c.status === 'sent' || c.status === 'cancelled' || c.status === 'failed');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communications & Outreach"
        description="Send mass communications to companies or employees"
      />

      {/* Action Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/communications/new?audience=company')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Send Company Outreach</CardTitle>
                <CardDescription>Email client admins & employer contacts</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/communications/new?audience=employee')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Send Employee Outreach</CardTitle>
                <CardDescription>Email employees & contractors</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Communication History</CardTitle>
            <Button size="sm" onClick={() => navigate('/communications/new')}>
              <Plus className="h-4 w-4 mr-1.5" /> New Communication
            </Button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by subject, creator..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {COMM_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({communications.length})</TabsTrigger>
              <TabsTrigger value="drafts"><FileEdit className="h-3.5 w-3.5 mr-1" />Drafts ({drafts.length})</TabsTrigger>
              <TabsTrigger value="scheduled"><Clock className="h-3.5 w-3.5 mr-1" />Scheduled ({scheduled.length})</TabsTrigger>
              <TabsTrigger value="sent"><Send className="h-3.5 w-3.5 mr-1" />Sent ({sent.length})</TabsTrigger>
            </TabsList>

            {(['all', 'drafts', 'scheduled', 'sent'] as const).map(tab => {
              const items = tab === 'all' ? communications : tab === 'drafts' ? drafts : tab === 'scheduled' ? scheduled : sent;
              return (
                <TabsContent key={tab} value={tab}>
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
                  ) : items.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No communications found.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Audience</TableHead>
                          <TableHead>Recipients</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map(comm => (
                          <TableRow key={comm.id} className="cursor-pointer" onClick={() => navigate(`/communications/${comm.id}`)}>
                            <TableCell className="font-medium max-w-[250px] truncate">{comm.subject || '(No subject)'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {comm.audience_type === 'company' ? <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> : <Users className="h-3.5 w-3.5 text-muted-foreground" />}
                                <span className="text-sm capitalize">{comm.audience_type}</span>
                              </div>
                            </TableCell>
                            <TableCell className="tabular-nums">{comm.recipient_count}</TableCell>
                            <TableCell className="text-sm">{comm.creator_name ?? '—'}</TableCell>
                            <TableCell className="text-sm">{format(new Date(comm.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell>{getStatusBadge(comm.status)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={e => { e.stopPropagation(); navigate(`/communications/${comm.id}`); }}>
                                <Eye className="h-3.5 w-3.5" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
