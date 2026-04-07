import { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, Download, Printer, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/PageHeader';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { empCentsToUSD } from '@/hooks/useEmployees';

const FIELDS = [
  { key: 'name', label: 'Full Name', always: true },
  { key: 'title', label: 'Job Title' },
  { key: 'department', label: 'Department' },
  { key: 'start_date', label: 'Start Date', always: true },
  { key: 'status', label: 'Employment Status', always: true },
  { key: 'salary', label: 'Salary / Pay Rate' },
  { key: 'company', label: 'Company Name', always: true },
];

export default function VerificationLetter() {
  const { data: employee, isLoading } = useCurrentEmployee();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set(FIELDS.filter(f => f.always).map(f => f.key)));
  const letterRef = useRef<HTMLDivElement>(null);

  if (isLoading || !employee) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const toggle = (key: string) => {
    const field = FIELDS.find(f => f.key === key);
    if (field?.always) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const today = format(new Date(), 'MMMM d, yyyy');
  const salary = employee.pay_type === 'salary'
    ? empCentsToUSD(employee.annual_salary_cents, 'salary')
    : empCentsToUSD(employee.hourly_rate_cents, 'hourly');

  const handlePrint = () => {
    if (letterRef.current) {
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<html><head><title>Verification Letter</title><style>body{font-family:serif;padding:40px;max-width:700px;margin:auto}h1{font-size:18px}p{line-height:1.8}</style></head><body>${letterRef.current.innerHTML}</body></html>`);
        w.document.close();
        w.print();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
        <PageHeader title="Employment Verification Letter" description={`Step ${step + 1} of 3`} />
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs">
        {['Select Fields', 'Preview', 'Download'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${i <= step ? 'text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              style={i <= step ? { background: 'var(--gradient-primary)' } : {}}>
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={i <= step ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
            {i < 2 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card className="animate-in-up">
          <CardHeader><CardTitle className="text-sm">Select fields to include</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {FIELDS.map(f => (
              <label key={f.key} className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={selected.has(f.key)} onCheckedChange={() => toggle(f.key)} disabled={f.always} />
                <span className="text-sm">{f.label}</span>
                {f.always && <span className="text-xs text-muted-foreground">(required)</span>}
              </label>
            ))}
            <div className="flex justify-end pt-4">
              <Button size="sm" onClick={() => setStep(1)} className="gap-1">Next <ArrowRight className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="animate-in-up">
          <CardHeader><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
          <CardContent>
            <div ref={letterRef} className="rounded-lg border bg-white p-8 text-foreground space-y-4 text-sm leading-relaxed">
              <p className="text-right text-xs text-muted-foreground">{today}</p>
              <h2 className="text-lg font-bold">Employment Verification Letter</h2>
              <p>To Whom It May Concern,</p>
              <p>
                This letter confirms that <strong>{employee.first_name} {employee.last_name}</strong> is
                {employee.status === 'active' ? ' currently employed' : ` formerly employed (status: ${employee.status})`} at
                <strong> {employee.companies?.name ?? 'our company'}</strong>.
              </p>
              {selected.has('title') && <p><strong>Job Title:</strong> {employee.title ?? 'N/A'}</p>}
              {selected.has('department') && <p><strong>Department:</strong> {employee.department ?? 'N/A'}</p>}
              {selected.has('start_date') && <p><strong>Start Date:</strong> {format(new Date(employee.start_date), 'MMMM d, yyyy')}</p>}
              {selected.has('salary') && <p><strong>Compensation:</strong> {salary}</p>}
              <p>If you require any additional information, please do not hesitate to contact us.</p>
              <p className="pt-4">Sincerely,<br />Human Resources Department<br />{employee.companies?.name}</p>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" size="sm" onClick={() => setStep(0)} className="gap-1"><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
              <Button size="sm" onClick={() => setStep(2)} className="gap-1">Continue <ArrowRight className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="animate-in-up">
          <CardHeader><CardTitle className="text-sm">Download / Print</CardTitle></CardHeader>
          <CardContent className="text-center space-y-4 py-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--gradient-primary-subtle)' }}>
              <Check className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-medium">Your verification letter is ready</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1"><Printer className="h-3.5 w-3.5" /> Print</Button>
              <Button size="sm" onClick={handlePrint} className="gap-1"><Download className="h-3.5 w-3.5" /> Download PDF</Button>
            </div>
            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1"><ArrowLeft className="h-3.5 w-3.5" /> Back to Preview</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
