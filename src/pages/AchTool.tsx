import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  ArrowDownCircle, ArrowUpCircle, Building2, User, FileDown,
  Plus, Info, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAchTransactions,
  useCreateAchTransaction,
  useUpdateAchTransaction,
  calculateSettleDate,
  type AchTransaction,
} from '@/hooks/useAchTool';
import { useCompanies } from '@/hooks/useCompanies';
import { useEmployees } from '@/hooks/useEmployees';

function centsToUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'border-amber-500 text-amber-600',
  submitted: 'border-blue-500 text-blue-600',
  settled: 'border-emerald-500 text-emerald-600',
  failed: 'border-destructive text-destructive',
  cancelled: 'border-muted-foreground text-muted-foreground',
};

export default function AchTool() {
  const { role } = useAuth();
  const { data: transactions = [], isLoading } = useAchTransactions();
  const { data: companies = [] } = useCompanies();
  const { data: employees = [] } = useEmployees();
  const createMutation = useCreateAchTransaction();
  const updateMutation = useUpdateAchTransaction();

  const [direction, setDirection] = useState<'credit' | 'debit'>('debit');
  const [entityType, setEntityType] = useState<'company' | 'employee'>('company');
  const [entityId, setEntityId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const settleDate = collectionDate ? calculateSettleDate(collectionDate) : '';

  const entityLabel = useMemo(() => {
    if (!entityId) return '';
    if (entityType === 'company') {
      const c = companies.find(co => co.id === entityId);
      return c ? `${c.cid} – ${c.name}` : '';
    } else {
      const e = employees.find(em => em.id === entityId);
      return e ? `${e.mid} – ${e.first_name} ${e.last_name}` : '';
    }
  }, [entityId, entityType, companies, employees]);

  if (role && role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }



  const handleSubmit = async () => {
    const amountCents = Math.round(parseFloat(amountStr) * 100);
    if (!entityId || !amountStr || isNaN(amountCents) || amountCents <= 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }
    if (!collectionDate) {
      toast.error('Collection date is required');
      return;
    }

    try {
      await createMutation.mutateAsync({
        direction,
        entity_type: entityType,
        entity_id: entityId,
        entity_label: entityLabel,
        amount_cents: amountCents,
        collection_date: collectionDate,
        settle_date: settleDate,
        internal_note: internalNote || null,
        created_by: null,
      });
      toast.success(`ACH ${direction} created successfully`);
      // Reset form
      setEntityId('');
      setAmountStr('');
      setCollectionDate('');
      setInternalNote('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleGenerateNacha = async (txn: AchTransaction) => {
    // Mark as submitted and record nacha generation time
    try {
      await updateMutation.mutateAsync({
        id: txn.id,
        status: 'submitted',
        nacha_generated_at: new Date().toISOString(),
      });
      toast.success('NACHA file generation placeholder — marked as submitted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="ACH Tool"
        description="One-off ACH credits and debits to company or member bank accounts"
      />

      {/* New Transaction Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" /> New ACH Transaction
          </CardTitle>
          <CardDescription>Create a one-off credit or debit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Direction & Entity Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v: 'credit' | 'debit') => setDirection(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">
                    <span className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-amber-600" /> Debit (collect from)
                    </span>
                  </SelectItem>
                  <SelectItem value="credit">
                    <span className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-emerald-600" /> Credit (send to)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={(v: 'company' | 'employee') => { setEntityType(v); setEntityId(''); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Company (CID)
                    </span>
                  </SelectItem>
                  <SelectItem value="employee">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Member (MID)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Entity Selection */}
          <div>
            <Label>{entityType === 'company' ? 'Select Company' : 'Select Member'}</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger>
                <SelectValue placeholder={entityType === 'company' ? 'Choose a company...' : 'Choose a member...'} />
              </SelectTrigger>
              <SelectContent>
                {entityType === 'company'
                  ? companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.cid} – {c.name}
                    </SelectItem>
                  ))
                  : employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.mid} – {e.first_name} {e.last_name}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div>
            <Label>Amount ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Collection Date</Label>
              <Input
                type="date"
                value={collectionDate}
                onChange={e => setCollectionDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Settle Date (auto-calculated)</Label>
              <Input
                type="date"
                value={settleDate}
                disabled
                className="bg-muted"
              />
              {settleDate && (
                <p className="text-xs text-muted-foreground mt-1">4 business days after collection</p>
              )}
            </div>
          </div>

          {/* Internal Note */}
          <div>
            <Label>Internal Note</Label>
            <Textarea
              placeholder="Reason for this transaction, reference numbers, etc."
              value={internalNote}
              onChange={e => setInternalNote(e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary */}
          {entityId && amountStr && collectionDate && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>{direction === 'debit' ? 'Debit' : 'Credit'}</strong>{' '}
                <strong>{amountStr ? `$${parseFloat(amountStr).toFixed(2)}` : ''}</strong>{' '}
                {direction === 'debit' ? 'from' : 'to'}{' '}
                <strong>{entityLabel}</strong>{' '}
                on <strong>{collectionDate}</strong>, settling <strong>{settleDate}</strong>
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? 'Creating...' : `Create ACH ${direction === 'debit' ? 'Debit' : 'Credit'}`}
          </Button>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <CardDescription>All ACH transactions — generate NACHA files for pending items</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ACH transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direction</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Settle</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(txn => (
                  <TableRow key={txn.id}>
                    <TableCell>
                      {txn.direction === 'debit' ? (
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <ArrowUpCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">Debit</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <ArrowDownCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">Credit</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {txn.entity_type === 'company' ? <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="text-sm">{txn.entity_label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{centsToUSD(txn.amount_cents)}</TableCell>
                    <TableCell className="text-sm">{txn.collection_date}</TableCell>
                    <TableCell className="text-sm">{txn.settle_date}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{txn.internal_note ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[txn.status] ?? ''}>
                        {txn.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {txn.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleGenerateNacha(txn)}
                          disabled={updateMutation.isPending}
                        >
                          <FileDown className="h-3.5 w-3.5" /> NACHA
                        </Button>
                      )}
                      {txn.status === 'submitted' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={async () => {
                            await updateMutation.mutateAsync({ id: txn.id, status: 'settled' });
                            toast.success('Marked as settled');
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Settle
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
