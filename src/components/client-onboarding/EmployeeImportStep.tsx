import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, Users, AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { parseEmployeeCSV, CSV_TEMPLATE_HEADERS, type WizardData } from '@/hooks/useClientOnboarding';
import { useToast } from '@/hooks/use-toast';

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

export function EmployeeImportStep({ data, onSave, onBack, isSaving }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [method, setMethod] = useState<'csv' | 'manual'>(data.employees?.import_method || 'csv');
  const [employees, setEmployees] = useState<EmployeeRow[]>(data.employees?.employee_data || []);
  const [errors, setErrors] = useState<string[]>(data.employees?.csv_errors || []);
  const [validated, setValidated] = useState(data.employees?.csv_validated || false);

  const downloadTemplate = () => {
    const csv = CSV_TEMPLATE_HEADERS.join(',') + '\nJohn,Doe,john@example.com,555-0100,2025-04-01,Manager,Engineering,salary,85000,,biweekly,CA\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
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

  const handleSubmit = () => {
    const missingRequired = employees.some(e => !e.first_name || !e.last_name || !e.email || !e.hire_date);
    if (missingRequired) {
      toast({ title: 'Missing required fields', description: 'Each employee needs first name, last name, email, and hire date.', variant: 'destructive' });
      return;
    }

    onSave({
      employees: {
        imported_count: employees.length,
        import_method: method,
        csv_validated: true,
        csv_errors: [],
        employee_data: employees,
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
