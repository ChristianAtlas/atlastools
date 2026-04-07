import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, Download, AlertTriangle, CheckCircle2, Info, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  CLIENT_REPORTING_STATES,
  STATE_NAMES,
  useClientSuiRates,
  useBulkUpsertClientSuiRates,
  type ClientSuiRate,
} from '@/hooks/useTaxManagement';
import { useCompanies } from '@/hooks/useCompanies';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ParsedRow {
  cid: string;
  company_id: string | null;
  company_name: string | null;
  state_code: string;
  rate: number;
  effective_date: string;
  error?: string;
  action: 'create' | 'update' | 'error';
}

export function ClientSuiUploadTab() {
  const { data: allRates = [], isLoading } = useClientSuiRates();
  const { data: companies = [] } = useCompanies();
  const bulkUpsert = useBulkUpsertClientSuiRates();

  const [search, setSearch] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csv = 'CID,State,Rate,Effective Date\nC2,CA,0.034,2026-01-01\nC3,WA,0.021,2026-01-01';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_sui_rates_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split('\n').slice(1); // skip header
      const rows: ParsedRow[] = [];

      for (const line of lines) {
        const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        if (parts.length < 4) continue;

        const [cid, stateCode, rateStr, effectiveDate] = parts;
        const rate = parseFloat(rateStr);
        const stateUpper = stateCode.toUpperCase();

        // Find company by CID
        const company = companies.find(c => c.cid === cid);

        let error: string | undefined;
        if (!cid) error = 'Missing CID';
        else if (!company) error = `CID "${cid}" not found`;
        else if (!stateUpper || stateUpper.length !== 2) error = 'Invalid state';
        else if (!CLIENT_REPORTING_STATES.includes(stateUpper as any)) error = `${stateUpper} is a PEO-reporting state`;
        else if (isNaN(rate) || rate < 0 || rate > 1) error = 'Invalid rate (must be 0-1)';
        else if (!effectiveDate || isNaN(Date.parse(effectiveDate))) error = 'Invalid date';

        // Check if existing
        const existing = allRates.find(
          r => r.company_id === company?.id && r.state_code === stateUpper && r.effective_date === effectiveDate
        );

        rows.push({
          cid,
          company_id: company?.id ?? null,
          company_name: company?.name ?? null,
          state_code: stateUpper,
          rate,
          effective_date: effectiveDate,
          error,
          action: error ? 'error' : existing ? 'update' : 'create',
        });
      }

      setParsedRows(rows);
      setShowPreview(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUpload = async () => {
    const valid = parsedRows.filter(r => r.action !== 'error' && r.company_id);
    if (valid.length === 0) {
      toast.error('No valid rows to upload');
      return;
    }

    try {
      await bulkUpsert.mutateAsync(
        valid.map(r => ({
          company_id: r.company_id!,
          state_code: r.state_code,
          rate: r.rate,
          effective_date: r.effective_date,
          uploaded_via: 'csv_bulk',
        }))
      );
      toast.success(`${valid.length} rate(s) uploaded successfully`);
      setParsedRows([]);
      setShowPreview(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Current rates view
  const today = new Date().toISOString().slice(0, 10);
  const currentRates = allRates.filter(r => r.effective_date <= today);
  const uniqueRates: Record<string, ClientSuiRate> = {};
  for (const r of currentRates) {
    const key = `${r.company_id}_${r.state_code}`;
    if (!uniqueRates[key] || r.effective_date > uniqueRates[key].effective_date) {
      uniqueRates[key] = r;
    }
  }
  const displayRates = Object.values(uniqueRates).filter(r => {
    if (!search) return true;
    const company = companies.find(c => c.id === r.company_id);
    const q = search.toLowerCase();
    return (
      r.state_code.toLowerCase().includes(q) ||
      company?.name.toLowerCase().includes(q) ||
      company?.cid.toLowerCase().includes(q)
    );
  });

  const errorCount = parsedRows.filter(r => r.action === 'error').length;
  const validCount = parsedRows.filter(r => r.action !== 'error').length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Client SUI Rate Upload
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Client-reporting states use the client's own experience rate. No invisible SUI markup is applied since this is their rate and risk. Backdated rate changes trigger automatic SUI adjustments.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>
              {CLIENT_REPORTING_STATES.length} client-reporting states: {CLIENT_REPORTING_STATES.join(', ')}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> Template
            </Button>
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Upload CSV
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>CSV Format</AlertTitle>
            <AlertDescription>
              Columns: <code className="text-xs bg-muted px-1 rounded">CID, State, Rate, Effective Date</code>. Rate should be decimal (e.g. 0.034 = 3.4%). Backdated effective dates will automatically generate SUI adjustment invoices/credits.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Upload Preview */}
      {showPreview && parsedRows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">Upload Preview</CardTitle>
              <CardDescription>
                {validCount} valid, {errorCount} errors – review before confirming
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setParsedRows([]); setShowPreview(false); }}>Cancel</Button>
              <Button size="sm" onClick={handleUpload} disabled={validCount === 0 || bulkUpsert.isPending}>
                {bulkUpsert.isPending ? 'Uploading...' : `Confirm ${validCount} Rate(s)`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>CID</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Issue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.map((r, i) => (
                  <TableRow key={i} className={r.action === 'error' ? 'bg-destructive/5' : ''}>
                    <TableCell>
                      {r.action === 'error' ? (
                        <Badge variant="destructive" className="text-xs">Error</Badge>
                      ) : r.action === 'update' ? (
                        <Badge variant="secondary" className="text-xs">Update</Badge>
                      ) : (
                        <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300">New</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{r.cid}</TableCell>
                    <TableCell className="text-sm">{r.company_name ?? '—'}</TableCell>
                    <TableCell className="font-medium">{r.state_code}</TableCell>
                    <TableCell>{isNaN(r.rate) ? '—' : `${(r.rate * 100).toFixed(3)}%`}</TableCell>
                    <TableCell className="text-sm">{r.effective_date}</TableCell>
                    <TableCell className="text-sm text-destructive">{r.error ?? ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Current Rates Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Current Client SUI Rates</CardTitle>
              <CardDescription>{displayRates.length} active rate assignments</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by CID, company, state..."
                className="pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : displayRates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No client SUI rates found. Upload a CSV to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CID</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Upload Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRates.map(r => {
                  const company = companies.find(c => c.id === r.company_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{company?.cid ?? '—'}</TableCell>
                      <TableCell className="text-sm">{company?.name ?? '—'}</TableCell>
                      <TableCell className="font-medium">{r.state_code} <span className="text-muted-foreground text-xs">– {STATE_NAMES[r.state_code]}</span></TableCell>
                      <TableCell><Badge variant="outline">{(r.rate * 100).toFixed(3)}%</Badge></TableCell>
                      <TableCell className="text-sm">{r.effective_date}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {r.uploaded_via === 'csv_bulk' ? 'CSV Upload' : 'Manual'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
