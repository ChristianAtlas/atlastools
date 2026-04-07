import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { useWCCodes, useCreateWCCode, useUpdateWCCode } from '@/hooks/useWorkersComp';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  companyId: string;
}

interface ParsedRow {
  code: string;
  description: string;
  state: string;
  rate: number;
  rate_basis: 'per_hundred' | 'per_hour';
  effective_date: string;
  action: 'create' | 'update';
  existingId?: string;
  error?: string;
}

export function WCBulkUploadDialog({ open, onOpenChange, policyId, companyId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: existingCodes = [] } = useWCCodes();
  const createCode = useCreateWCCode();
  const updateCode = useUpdateWCCode();
  const queryClient = useQueryClient();

  const handleDownloadTemplate = () => {
    const csv = 'code,description,state,rate,rate_basis\n8810,Clerical Office Employees,CA,0.45,per_hundred\n5183,Plumbing,TX,3.20,per_hundred\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wc_codes_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      toast.error('CSV must have a header row and at least one data row');
      return;
    }

    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const codeIdx = header.indexOf('code');
    const descIdx = header.indexOf('description');
    const stateIdx = header.indexOf('state');
    const rateIdx = header.indexOf('rate');
    const basisIdx = header.indexOf('rate_basis');

    if (codeIdx === -1 || rateIdx === -1) {
      toast.error('CSV must contain "code" and "rate" columns');
      return;
    }

    const parsed: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.every(c => !c)) continue;

      const code = cols[codeIdx] || '';
      const rate = parseFloat(cols[rateIdx] || '0');
      const state = stateIdx >= 0 ? (cols[stateIdx] || '').toUpperCase() : '';
      const desc = descIdx >= 0 ? cols[descIdx] || '' : '';
      const basis = basisIdx >= 0 && cols[basisIdx] === 'per_hour' ? 'per_hour' as const : 'per_hundred' as const;

      let error: string | undefined;
      if (!code) error = 'Missing code';
      else if (isNaN(rate) || rate < 0) error = 'Invalid rate';

      // Check if code+state exists already
      const existing = existingCodes.find(
        ec => ec.code === code && ec.state === state && ec.company_id === companyId
      );

      parsed.push({
        code,
        description: desc || existing?.description || '',
        state: state || existing?.state || '',
        rate,
        rate_basis: basis,
        effective_date: effectiveDate,
        action: existing ? 'update' : 'create',
        existingId: existing?.id,
        error,
      });
    }

    setRows(parsed);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => parseCSV(reader.result as string);
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    const valid = rows.filter(r => !r.error);
    if (!valid.length) {
      toast.error('No valid rows to process');
      return;
    }

    setUploading(true);
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const row of valid) {
      try {
        if (row.action === 'update' && row.existingId) {
          await updateCode.mutateAsync({
            id: row.existingId,
            rate_per_hundred: row.rate,
            rate_basis: row.rate_basis,
            effective_date: row.effective_date,
            ...(row.description ? { description: row.description } : {}),
          });
          updated++;
        } else {
          await createCode.mutateAsync({
            code: row.code,
            description: row.description,
            state: row.state,
            rate_per_hundred: row.rate,
            rate_basis: row.rate_basis,
            effective_date: row.effective_date,
            is_active: true,
            policy_id: policyId,
            company_id: companyId,
          });
          created++;
        }
      } catch {
        errors++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ['wc_codes'] });
    setUploading(false);
    toast.success(`Done: ${created} created, ${updated} updated${errors ? `, ${errors} failed` : ''}`);
    setRows([]);
    onOpenChange(false);
  };

  const errorCount = rows.filter(r => r.error).length;
  const updateCount = rows.filter(r => !r.error && r.action === 'update').length;
  const createCount = rows.filter(r => !r.error && r.action === 'create').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload WC Codes</DialogTitle>
          <DialogDescription>
            Upload a CSV to create or update class codes and rates effective a specific date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label>Effective Date</Label>
              <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-1.5" />Template
            </Button>
          </div>

          <div>
            <Label>CSV File</Label>
            <div
              className="mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to select a CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">Required columns: code, rate. Optional: description, state, rate_basis</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          {rows.length > 0 && (
            <>
              <div className="flex gap-2 flex-wrap">
                {createCount > 0 && (
                  <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />{createCount} new
                  </Badge>
                )}
                {updateCount > 0 && (
                  <Badge variant="outline" className="border-blue-500 text-blue-600">
                    <FileText className="h-3 w-3 mr-1" />{updateCount} updates
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="outline" className="border-destructive text-destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />{errorCount} errors
                  </Badge>
                )}
              </div>

              {errorCount > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {errorCount} row(s) have errors and will be skipped.
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-md max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Basis</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i} className={r.error ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-mono text-sm">{r.code}</TableCell>
                        <TableCell className="text-sm">{r.state}</TableCell>
                        <TableCell className="font-mono text-sm">${r.rate.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.rate_basis === 'per_hundred' ? '/ $100' : '/ hr'}
                        </TableCell>
                        <TableCell>
                          {r.error ? (
                            <span className="text-xs text-destructive">{r.error}</span>
                          ) : (
                            <Badge variant="outline" className={`text-[10px] ${r.action === 'update' ? 'border-blue-500 text-blue-600' : 'border-emerald-500 text-emerald-600'}`}>
                              {r.action}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1" onClick={handleUpload} disabled={uploading || (createCount + updateCount === 0)}>
                  {uploading ? 'Processing…' : `Apply ${createCount + updateCount} Changes`}
                </Button>
                <Button variant="outline" onClick={() => { setRows([]); if (fileRef.current) fileRef.current.value = ''; }}>
                  Clear
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
