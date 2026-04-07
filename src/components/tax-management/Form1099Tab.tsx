import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Download, FileText, Eye, CheckCircle2, AlertTriangle, Upload } from 'lucide-react';

const fmt = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const MOCK_1099S = [
  { id: '1', vendorId: 'V1', name: 'Freelance Dev Corp', cid: 'C2', companyName: 'Acme Corp', taxYear: 2025, formType: '1099-NEC', totalPaid: 4500000, status: 'generated', changesDetected: false },
  { id: '2', vendorId: 'V2', name: 'Marketing Solutions LLC', cid: 'C2', companyName: 'Acme Corp', taxYear: 2025, formType: '1099-NEC', totalPaid: 2800000, status: 'filed', changesDetected: false },
  { id: '3', vendorId: 'V3', name: 'Office Supplies Inc', cid: 'C3', companyName: 'TechStart LLC', taxYear: 2025, formType: '1099-MISC', totalPaid: 1200000, status: 'generated', changesDetected: true },
  { id: '4', mid: 'M15', name: 'Alex Rivera (Contractor)', cid: 'C3', companyName: 'TechStart LLC', taxYear: 2025, formType: '1099-NEC', totalPaid: 7800000, status: 'generated', changesDetected: false },
];

const MOCK_1099CS = [
  { id: '1', vendorId: 'V3', name: 'Office Supplies Inc', cid: 'C3', correctionCode: '1 – Amount', originalAmount: 1200000, correctedAmount: 1350000, status: 'pending', reason: 'Late invoice adjustment' },
];

const statusClass: Record<string, string> = {
  generated: 'border-primary text-primary',
  filed: 'border-emerald-500 text-emerald-600',
  accepted: 'border-emerald-500 text-emerald-600',
  rejected: 'border-destructive text-destructive',
  pending: 'border-amber-500 text-amber-600',
};

export function Form1099Tab() {
  const [search, setSearch] = useState('');
  const [cidFilter, setCidFilter] = useState('all');
  const [successDialog, setSuccessDialog] = useState(false);
  const [generatedFileType, setGeneratedFileType] = useState('');

  const filtered1099s = MOCK_1099S.filter(f => {
    if (cidFilter !== 'all' && f.cid !== cidFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.cid.toLowerCase().includes(q) || (f.vendorId || '').toLowerCase().includes(q);
  });

  const handleGenerate = (type: string) => {
    setGeneratedFileType(type);
    setSuccessDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, vendor, CID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={cidFilter} onValueChange={setCidFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All CIDs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All CIDs</SelectItem>
            <SelectItem value="C2">C2 – Acme Corp</SelectItem>
            <SelectItem value="C3">C3 – TechStart</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 1099 Generation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> 1099 Generation (NEC/MISC)
              </CardTitle>
              <CardDescription>Generate year-end 1099 forms for independent contractors and vendors</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleGenerate('FIRE')}>
                <Upload className="h-4 w-4 mr-1" /> Generate FIRE File
              </Button>
              <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Download All PDFs</Button>
              <Button size="sm">Generate 1099 PDFs</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Payee</TableHead>
                <TableHead>CID</TableHead>
                <TableHead>Form Type</TableHead>
                <TableHead>Total Paid</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered1099s.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-sm">{f.vendorId || f.mid}</TableCell>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="font-mono text-sm">{f.cid}</TableCell>
                  <TableCell><Badge variant="outline">{f.formType}</Badge></TableCell>
                  <TableCell className="tabular-nums font-medium">{fmt(f.totalPaid)}</TableCell>
                  <TableCell>
                    {f.changesDetected
                      ? <AlertTriangle className="h-4 w-4 text-amber-500" />
                      : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={statusClass[f.status] ?? ''}>{f.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7"><Download className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 1099C Corrections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" /> 1099 Corrections
              </CardTitle>
              <CardDescription>Auto-detected corrections from payment adjustments since original filing</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleGenerate('FIRE Correction')}>
                <Upload className="h-4 w-4 mr-1" /> Generate FIRE Correction File
              </Button>
              <Button variant="outline" size="sm">Generate 1099C PDFs</Button>
              <Button size="sm">Mark as Filed</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {MOCK_1099CS.length === 0 ? (
            <p className="text-sm text-muted-foreground">No corrections detected.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor/MID</TableHead>
                  <TableHead>Payee</TableHead>
                  <TableHead>CID</TableHead>
                  <TableHead>Correction Code</TableHead>
                  <TableHead>Original Amount</TableHead>
                  <TableHead>Corrected Amount</TableHead>
                  <TableHead>Difference</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_1099CS.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.vendorId}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-sm">{c.cid}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{c.correctionCode}</Badge></TableCell>
                    <TableCell className="tabular-nums">{fmt(c.originalAmount)}</TableCell>
                    <TableCell className="tabular-nums">{fmt(c.correctedAmount)}</TableCell>
                    <TableCell className="tabular-nums font-semibold">{fmt(c.correctedAmount - c.originalAmount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{c.reason}</TableCell>
                    <TableCell><Badge variant="outline" className={statusClass[c.status] ?? ''}>{c.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs">Preview</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">Approve</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={successDialog} onOpenChange={setSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              {generatedFileType} File Generated
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Your {generatedFileType} file has been generated successfully.</p>
            <div className="rounded-lg border p-3 space-y-1 text-sm">
              <p><span className="text-muted-foreground">File:</span> <span className="font-mono">1099_FIRE_2025.txt</span></p>
              <p><span className="text-muted-foreground">Records:</span> {MOCK_1099S.length}</p>
              <p><span className="text-muted-foreground">Format:</span> IRS FIRE System Specification</p>
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Next steps:</strong> Upload this file to the IRS FIRE system at <span className="font-mono text-xs">fire.irs.gov</span>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuccessDialog(false)}>Close</Button>
            <Button><Download className="h-4 w-4 mr-1" /> Download File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
