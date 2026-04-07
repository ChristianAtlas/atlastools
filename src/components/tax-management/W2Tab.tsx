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

const MOCK_W2S = [
  { id: '1', mid: 'M5', name: 'John Smith', cid: 'C2', companyName: 'Acme Corp', taxYear: 2025, grossWages: 8500000, federalWithheld: 1700000, stateWithheld: 595000, socialSecurity: 527000, medicare: 123250, status: 'generated', changesDetected: false },
  { id: '2', mid: 'M6', name: 'Sarah Johnson', cid: 'C2', companyName: 'Acme Corp', taxYear: 2025, grossWages: 7200000, federalWithheld: 1440000, stateWithheld: 504000, socialSecurity: 446400, medicare: 104400, status: 'filed', changesDetected: false },
  { id: '3', mid: 'M7', name: 'Mike Davis', cid: 'C3', companyName: 'TechStart LLC', taxYear: 2025, grossWages: 9500000, federalWithheld: 1900000, stateWithheld: 0, socialSecurity: 589000, medicare: 137750, status: 'generated', changesDetected: true },
  { id: '4', mid: 'M8', name: 'Lisa Chen', cid: 'C2', companyName: 'Acme Corp', taxYear: 2025, grossWages: 6800000, federalWithheld: 1360000, stateWithheld: 476000, socialSecurity: 421600, medicare: 98600, status: 'pending_correction', changesDetected: true },
];

const MOCK_W2CS = [
  { id: '1', mid: 'M7', name: 'Mike Davis', cid: 'C3', correctionType: 'SUI Wages', originalValue: 9500000, correctedValue: 9650000, status: 'pending', reason: 'Retro SUI wage adjustment from Q3' },
  { id: '2', mid: 'M8', name: 'Lisa Chen', cid: 'C2', correctionType: 'State Income Tax', originalValue: 476000, correctedValue: 498000, status: 'pending', reason: 'CA SIT correction from amended payroll' },
];

const statusClass: Record<string, string> = {
  generated: 'border-primary text-primary',
  filed: 'border-emerald-500 text-emerald-600',
  accepted: 'border-emerald-500 text-emerald-600',
  rejected: 'border-destructive text-destructive',
  pending_correction: 'border-amber-500 text-amber-600',
  pending: 'border-amber-500 text-amber-600',
};

export function W2Tab() {
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('2025');
  const [cidFilter, setCidFilter] = useState('all');
  const [successDialog, setSuccessDialog] = useState(false);
  const [generatedFileType, setGeneratedFileType] = useState('');

  const filteredW2s = MOCK_W2S.filter(w => {
    if (cidFilter !== 'all' && w.cid !== cidFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return w.mid.toLowerCase().includes(q) || w.name.toLowerCase().includes(q) || w.cid.toLowerCase().includes(q);
  });

  const handleGenerate = (type: string) => {
    setGeneratedFileType(type);
    setSuccessDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by MID, name, CID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">TY 2025</SelectItem>
            <SelectItem value="2024">TY 2024</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cidFilter} onValueChange={setCidFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All CIDs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All CIDs</SelectItem>
            <SelectItem value="C2">C2 – Acme Corp</SelectItem>
            <SelectItem value="C3">C3 – TechStart</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* W-2 Generation Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> W-2 Generation
              </CardTitle>
              <CardDescription>Generate, preview, and file W-2 forms for tax year {yearFilter}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleGenerate('EFW2')}>
                <Upload className="h-4 w-4 mr-1" /> Generate EFW2 File
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Download All PDFs
              </Button>
              <Button size="sm">Generate Year-End W-2s</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>CID</TableHead>
                <TableHead>Gross Wages</TableHead>
                <TableHead>Federal W/H</TableHead>
                <TableHead>State W/H</TableHead>
                <TableHead>SS Tax</TableHead>
                <TableHead>Medicare</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredW2s.map(w => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-sm">{w.mid}</TableCell>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="font-mono text-sm">{w.cid}</TableCell>
                  <TableCell className="tabular-nums">{fmt(w.grossWages)}</TableCell>
                  <TableCell className="tabular-nums">{fmt(w.federalWithheld)}</TableCell>
                  <TableCell className="tabular-nums">{fmt(w.stateWithheld)}</TableCell>
                  <TableCell className="tabular-nums">{fmt(w.socialSecurity)}</TableCell>
                  <TableCell className="tabular-nums">{fmt(w.medicare)}</TableCell>
                  <TableCell>
                    {w.changesDetected
                      ? <AlertTriangle className="h-4 w-4 text-amber-500" />
                      : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusClass[w.status] ?? ''}>{w.status.replace('_', ' ')}</Badge>
                  </TableCell>
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

      {/* W-2C Corrections Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" /> W-2C Corrections
              </CardTitle>
              <CardDescription>Auto-detected corrections from payroll adjustments since original filing</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleGenerate('EFW2C')}>
                <Upload className="h-4 w-4 mr-1" /> Generate EFW2C File
              </Button>
              <Button variant="outline" size="sm">Generate W-2C PDFs</Button>
              <Button size="sm">Mark as Filed</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {MOCK_W2CS.length === 0 ? (
            <p className="text-sm text-muted-foreground">No corrections detected.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MID</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>CID</TableHead>
                  <TableHead>Correction Type</TableHead>
                  <TableHead>Original Value</TableHead>
                  <TableHead>Corrected Value</TableHead>
                  <TableHead>Difference</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_W2CS.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.mid}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-sm">{c.cid}</TableCell>
                    <TableCell className="text-sm font-medium">{c.correctionType}</TableCell>
                    <TableCell className="tabular-nums">{fmt(c.originalValue)}</TableCell>
                    <TableCell className="tabular-nums">{fmt(c.correctedValue)}</TableCell>
                    <TableCell className="tabular-nums font-semibold">{fmt(c.correctedValue - c.originalValue)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{c.reason}</TableCell>
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
              <p><span className="text-muted-foreground">File:</span> <span className="font-mono">{generatedFileType === 'EFW2' ? 'W2REPORT_2025.txt' : 'W2CREPORT_2025.txt'}</span></p>
              <p><span className="text-muted-foreground">Records:</span> {generatedFileType === 'EFW2' ? '4' : '2'}</p>
              <p><span className="text-muted-foreground">Format:</span> SSA {generatedFileType} Specification</p>
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Next steps:</strong> Upload this file to the SSA Business Services Online (BSO) portal at <span className="font-mono text-xs">ssa.gov/bso</span>
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
