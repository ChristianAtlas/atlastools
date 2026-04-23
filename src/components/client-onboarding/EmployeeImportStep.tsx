import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, Users, AlertCircle, CheckCircle2, Plus, Trash2, DollarSign, ShieldCheck, Briefcase } from 'lucide-react';
import { parseEmployeeCSV, CSV_TEMPLATE_HEADERS, type WizardData } from '@/hooks/useClientOnboarding';
import { useToast } from '@/hooks/use-toast';
import { useWCCodes } from '@/hooks/useWorkersComp';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

interface Props {
  data: WizardData;
  onSave: (data: Partial<WizardData>) => void;
  onBack: () => void;
  isSaving: boolean;
}

type EmployeeRow = NonNullable<WizardData['employees']>['employee_data'] extends (infer T)[] | undefined ? NonNullable<T> : never;
type YTDRow = NonNullable<NonNullable<WizardData['employees']>['ytd_data']>[number];

const YTD_CSV_HEADERS = ['employee_email', 'gross_wages', 'federal_withholding', 'state_taxes', 'social_security', 'medicare', 'benefit_deductions'];

function parseYTDCSV(csvText: string): { data: YTDRow[]; errors: string[] } {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return { data: [], errors: ['CSV must have a header row and at least one data row'] };
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const errors: string[] = [];
  const data: YTDRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = values[j] || ''; });
    if (!row.employee_email) { errors.push(`Row ${i}: Missing employee_email`); continue; }
    data.push({
      employee_email: row.employee_email,
      gross_wages: parseFloat(row.gross_wages) || 0,
      federal_withholding: parseFloat(row.federal_withholding) || 0,
      state_taxes: parseFloat(row.state_taxes) || 0,
      social_security: parseFloat(row.social_security) || 0,
      medicare: parseFloat(row.medicare) || 0,
      benefit_deductions: parseFloat(row.benefit_deductions) || 0,
    });
  }
  return { data, errors };
}

export function EmployeeImportStep({ data, onSave, onBack, isSaving }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ytdFileInputRef = useRef<HTMLInputElement>(null);
  const [method, setMethod] = useState<'csv' | 'manual'>(data.employees?.import_method || 'csv');
  const [employees, setEmployees] = useState<EmployeeRow[]>(data.employees?.employee_data || []);
  const [errors, setErrors] = useState<string[]>(data.employees?.csv_errors || []);
  const [validated, setValidated] = useState(data.employees?.csv_validated || false);

  // Available WC codes for assignment (master PEO codes have null company_id and apply to everyone).
  const { data: allWcCodes = [] } = useWCCodes();
  const wcCodes = allWcCodes.filter(c => c.is_active);

  // YTD state
  const [ytdData, setYtdData] = useState<YTDRow[]>(data.employees?.ytd_data || []);
  const [ytdMethod, setYtdMethod] = useState<'csv' | 'manual'>('manual');
  const [ytdErrors, setYtdErrors] = useState<string[]>([]);
  const [showYtd, setShowYtd] = useState((data.employees?.ytd_data?.length || 0) > 0);

  const downloadTemplate = () => {
    const csv = CSV_TEMPLATE_HEADERS.join(',') +
      '\nJohn,Doe,john@example.com,555-0100,2025-04-01,Manager,Engineering,salary,85000,,biweekly,CA,8810,false,false,\n' +
      'Jane,Owner,jane@example.com,555-0101,2025-04-01,President,Executive,salary,150000,,biweekly,CA,,true,true,Officer exemption — CA WC-1 on file\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadYTDTemplate = () => {
    const csv = YTD_CSV_HEADERS.join(',') + '\njohn@example.com,45000,6750,2250,2790,652.50,3600\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ytd_payroll_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseEmployeeCSV(text);
      setEmployees(result.data || []);
      setErrors(result.errors);
      setValidated(result.errors.length === 0 && (result.data?.length || 0) > 0);
      if (result.errors.length > 0) {
        toast({ title: `${result.errors.length} validation errors`, description: 'Fix errors below before continuing.', variant: 'destructive' });
      } else {
        toast({ title: `${result.data?.length} employees parsed`, description: 'Review the data below.' });
      }
    };
    reader.readAsText(file);
  };

  const handleYTDFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseYTDCSV(text);
      setYtdData(result.data);
      setYtdErrors(result.errors);
      if (result.errors.length > 0) {
        toast({ title: `${result.errors.length} YTD errors`, variant: 'destructive' });
      } else {
        toast({ title: `${result.data.length} YTD records imported` });
      }
    };
    reader.readAsText(file);
  };

  const addManualRow = () => {
    setEmployees(prev => [...prev, {
      first_name: '', last_name: '', email: '', hire_date: '',
      pay_type: 'salary' as const, title: '', department: '',
      work_state: data.company?.state_of_incorporation || '',
    }]);
  };

  const updateRow = (idx: number, field: string, value: string | number) => {
    setEmployees(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeRow = (idx: number) => {
    setEmployees(prev => prev.filter((_, i) => i !== idx));
  };

  // YTD manual helpers
  const initYtdFromEmployees = () => {
    const existing = new Set(ytdData.map(y => y.employee_email));
    const newRows = employees
      .filter(e => e.email && !existing.has(e.email))
      .map(e => ({ employee_email: e.email, gross_wages: 0, federal_withholding: 0, state_taxes: 0, social_security: 0, medicare: 0, benefit_deductions: 0 }));
    setYtdData(prev => [...prev, ...newRows]);
    setShowYtd(true);
  };

  const updateYtdRow = (idx: number, field: keyof YTDRow, value: number | string) => {
    setYtdData(prev => prev.map((r, i) => i === idx ? { ...r, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value } : r));
  };

  const removeYtdRow = (idx: number) => {
    setYtdData(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    const missingRequired = employees.some(e => !e.first_name || !e.last_name || !e.email || !e.hire_date);
    if (missingRequired) {
      toast({ title: 'Missing required fields', description: 'Each employee needs first name, last name, email, and hire date.', variant: 'destructive' });
      return;
    }

    // Workers' Comp gate: every covered (non-exempt) W-2 employee MUST have an active WC code.
    const missingWc = employees.filter(e => !e.wc_exempt && !e.wc_code_id);
    if (missingWc.length > 0) {
      toast({
        title: `${missingWc.length} employee(s) missing a Workers' Comp code`,
        description: 'Assign a WC code or mark the employee as Owner/Officer exempt before continuing.',
        variant: 'destructive',
      });
      return;
    }

    // Exempt employees must have a reason recorded.
    const exemptNoReason = employees.filter(e => e.wc_exempt && !e.wc_exempt_reason?.trim());
    if (exemptNoReason.length > 0) {
      toast({
        title: `${exemptNoReason.length} exempt employee(s) missing a reason`,
        description: 'Document why each exempt employee is excluded from WC (e.g. officer exemption form on file).',
        variant: 'destructive',
      });
      return;
    }

    onSave({
      employees: {
        imported_count: employees.length,
        import_method: method,
        csv_validated: true,
        csv_errors: [],
        employee_data: employees,
        ytd_data: ytdData.length > 0 ? ytdData : undefined,
      },
    });
  };

  const handleSkip = () => {
    onSave({
      employees: {
        imported_count: 0,
        import_method: method,
        csv_validated: true,
        csv_errors: [],
        employee_data: [],
      },
    });
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-5">
      {/* Import Method */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />Employee Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setMethod('csv')}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                method === 'csv' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              }`}
            >
              <Upload className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm font-semibold">CSV Upload</p>
              <p className="text-xs text-muted-foreground">Bulk import from spreadsheet</p>
            </button>
            <button
              onClick={() => setMethod('manual')}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                method === 'manual' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              }`}
            >
              <Plus className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm font-semibold">Manual Entry</p>
              <p className="text-xs text-muted-foreground">Add employees one by one</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* CSV Upload */}
      {method === 'csv' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upload Employee Census</CardTitle>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5 mr-1" />Download Template
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">Required: first_name, last_name, email, hire_date</p>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </div>
            {errors.length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Validation Errors
                </div>
                {errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive/80 ml-6">{err}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Entry */}
      {method === 'manual' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Add Employees</CardTitle>
              <Button variant="outline" size="sm" onClick={addManualRow}><Plus className="h-3.5 w-3.5 mr-1" />Add Row</Button>
            </div>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No employees added yet</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={addManualRow}><Plus className="h-3.5 w-3.5 mr-1" />Add First Employee</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {employees.map((emp, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Employee #{i + 1}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeRow(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Input placeholder="First Name *" value={emp.first_name} onChange={e => updateRow(i, 'first_name', e.target.value)} />
                      <Input placeholder="Last Name *" value={emp.last_name} onChange={e => updateRow(i, 'last_name', e.target.value)} />
                      <Input placeholder="Email *" value={emp.email} onChange={e => updateRow(i, 'email', e.target.value)} />
                      <Input type="date" value={emp.hire_date} onChange={e => updateRow(i, 'hire_date', e.target.value)} />
                      <Input placeholder="Title" value={emp.title || ''} onChange={e => updateRow(i, 'title', e.target.value)} />
                      <Input placeholder="Department" value={emp.department || ''} onChange={e => updateRow(i, 'department', e.target.value)} />
                      <Select value={emp.pay_type} onValueChange={v => updateRow(i, 'pay_type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="salary">Salary</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder={emp.pay_type === 'hourly' ? 'Hourly Rate' : 'Annual Salary'}
                        value={emp.pay_type === 'hourly' ? (emp.hourly_rate || '') : (emp.salary || '')}
                        onChange={e => updateRow(i, emp.pay_type === 'hourly' ? 'hourly_rate' : 'salary', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview table for CSV */}
      {method === 'csv' && employees.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {employees.length} Employees Parsed
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Hire Date</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Pay Type</TableHead>
                    <TableHead className="text-xs">Compensation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.slice(0, 50).map((emp, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{emp.first_name} {emp.last_name}</TableCell>
                      <TableCell className="text-xs">{emp.email}</TableCell>
                      <TableCell className="text-xs">{emp.hire_date}</TableCell>
                      <TableCell className="text-xs">{emp.title || '—'}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{emp.pay_type}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {emp.pay_type === 'hourly'
                          ? `$${emp.hourly_rate || 0}/hr`
                          : `$${(emp.salary || 0).toLocaleString()}/yr`
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* YTD Payroll Data */}
      {employees.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />YTD Payroll Data
              </CardTitle>
              {!showYtd && (
                <Button variant="outline" size="sm" onClick={initYtdFromEmployees}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add YTD Data
                </Button>
              )}
            </div>
            {!showYtd && (
              <p className="text-xs text-muted-foreground mt-1">
                Import year-to-date payroll data from the prior payroll provider to ensure accurate tax calculations.
              </p>
            )}
          </CardHeader>
          {showYtd && (
            <CardContent className="space-y-4">
              {/* YTD import method toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={ytdMethod === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setYtdMethod('manual')}
                >
                  Manual Grid
                </Button>
                <Button
                  variant={ytdMethod === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setYtdMethod('csv')}
                >
                  CSV Upload
                </Button>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={downloadYTDTemplate}>
                  <Download className="h-3.5 w-3.5 mr-1" />YTD Template
                </Button>
              </div>

              {/* YTD CSV upload */}
              {ytdMethod === 'csv' && (
                <div>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => ytdFileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">Upload YTD CSV</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Columns: employee_email, gross_wages, federal_withholding, state_taxes, social_security, medicare, benefit_deductions</p>
                    <input ref={ytdFileInputRef} type="file" accept=".csv" onChange={handleYTDFileUpload} className="hidden" />
                  </div>
                  {ytdErrors.length > 0 && (
                    <div className="mt-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-destructive"><AlertCircle className="h-4 w-4" />YTD Errors</div>
                      {ytdErrors.map((err, i) => <p key={i} className="text-xs text-destructive/80 ml-6">{err}</p>)}
                    </div>
                  )}
                </div>
              )}

              {/* YTD manual grid */}
              {ytdData.length > 0 && (
                <div className="rounded-md border overflow-auto max-h-[420px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs min-w-[160px]">Employee</TableHead>
                        <TableHead className="text-xs text-right min-w-[110px]">Gross Wages</TableHead>
                        <TableHead className="text-xs text-right min-w-[110px]">Fed W/H</TableHead>
                        <TableHead className="text-xs text-right min-w-[100px]">State Tax</TableHead>
                        <TableHead className="text-xs text-right min-w-[100px]">SS</TableHead>
                        <TableHead className="text-xs text-right min-w-[100px]">Medicare</TableHead>
                        <TableHead className="text-xs text-right min-w-[110px]">Benefits</TableHead>
                        <TableHead className="text-xs w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ytdData.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium py-1">
                            {employees.find(e => e.email === row.employee_email)
                              ? `${employees.find(e => e.email === row.employee_email)!.first_name} ${employees.find(e => e.email === row.employee_email)!.last_name}`
                              : row.employee_email}
                          </TableCell>
                          <TableCell className="py-1">
                            <Input type="number" className="h-7 text-xs text-right" value={row.gross_wages || ''} onChange={e => updateYtdRow(i, 'gross_wages', e.target.value)} placeholder="0.00" />
                          </TableCell>
                          <TableCell className="py-1">
                            <Input type="number" className="h-7 text-xs text-right" value={row.federal_withholding || ''} onChange={e => updateYtdRow(i, 'federal_withholding', e.target.value)} placeholder="0.00" />
                          </TableCell>
                          <TableCell className="py-1">
                            <Input type="number" className="h-7 text-xs text-right" value={row.state_taxes || ''} onChange={e => updateYtdRow(i, 'state_taxes', e.target.value)} placeholder="0.00" />
                          </TableCell>
                          <TableCell className="py-1">
                            <Input type="number" className="h-7 text-xs text-right" value={row.social_security || ''} onChange={e => updateYtdRow(i, 'social_security', e.target.value)} placeholder="0.00" />
                          </TableCell>
                          <TableCell className="py-1">
                            <Input type="number" className="h-7 text-xs text-right" value={row.medicare || ''} onChange={e => updateYtdRow(i, 'medicare', e.target.value)} placeholder="0.00" />
                          </TableCell>
                          <TableCell className="py-1">
                            <Input type="number" className="h-7 text-xs text-right" value={row.benefit_deductions || ''} onChange={e => updateYtdRow(i, 'benefit_deductions', e.target.value)} placeholder="0.00" />
                          </TableCell>
                          <TableCell className="py-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeYtdRow(i)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="bg-muted/30 font-medium">
                        <TableCell className="text-xs">Totals</TableCell>
                        <TableCell className="text-xs text-right">${fmt(ytdData.reduce((s, r) => s + r.gross_wages, 0))}</TableCell>
                        <TableCell className="text-xs text-right">${fmt(ytdData.reduce((s, r) => s + r.federal_withholding, 0))}</TableCell>
                        <TableCell className="text-xs text-right">${fmt(ytdData.reduce((s, r) => s + r.state_taxes, 0))}</TableCell>
                        <TableCell className="text-xs text-right">${fmt(ytdData.reduce((s, r) => s + r.social_security, 0))}</TableCell>
                        <TableCell className="text-xs text-right">${fmt(ytdData.reduce((s, r) => s + r.medicare, 0))}</TableCell>
                        <TableCell className="text-xs text-right">${fmt(ytdData.reduce((s, r) => s + r.benefit_deductions, 0))}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}

              {ytdData.length === 0 && ytdMethod === 'manual' && (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">No YTD data yet.</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={initYtdFromEmployees}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Populate from Employees
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleSkip}>Skip (0 employees)</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save & Continue'}</Button>
        </div>
      </div>
    </div>
  );
}
