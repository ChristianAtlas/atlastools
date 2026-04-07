import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Building2, Users, ArrowLeft, ArrowRight, Check, Upload, Filter, Send,
  Clock, AlertTriangle, Info, Search, Eye, X
} from 'lucide-react';
import { toast } from 'sonner';
import { useCompanies } from '@/hooks/useCompanies';
import { useEmployees } from '@/hooks/useEmployees';
import { useSavedSegments, useCreateCommunication, useInsertRecipients } from '@/hooks/useCommunications';
import { format } from 'date-fns';

const STEPS = ['Audience', 'Recipients', 'Review', 'Draft Email', 'Schedule'];

interface RecipientItem {
  entity_type: 'company' | 'employee';
  entity_id: string;
  entity_label: string;
  email: string;
}

export default function CommunicationWizard() {
  const { role, profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [step, setStep] = useState(0);
  const [audienceType, setAudienceType] = useState<'company' | 'employee'>(
    (params.get('audience') as 'company' | 'employee') || 'company'
  );
  const [contactType, setContactType] = useState('primary_admin');
  const [selectionMethod, setSelectionMethod] = useState<'all' | 'segment' | 'upload'>('all');
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [fromName, setFromName] = useState('AtlasOne HR Support');
  const [replyTo, setReplyTo] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [timezone, setTimezone] = useState('America/New_York');

  const { data: companies = [] } = useCompanies();
  const { data: employees = [] } = useEmployees();
  const { data: segments = [] } = useSavedSegments(audienceType);
  const createComm = useCreateCommunication();
  const insertRecipients = useInsertRecipients();

  const creatorName = profile?.full_name || null;

  if (role && role !== 'super_admin') return <Navigate to="/" replace />;

  // Build recipient list
  const recipients: RecipientItem[] = useMemo(() => {
    if (selectionMethod === 'upload' && csvText) {
      const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
      const cids = lines.slice(1); // skip header
      const errors: string[] = [];
      const results: RecipientItem[] = [];
      cids.forEach(cid => {
        const co = companies.find(c => c.cid === cid.trim());
        if (co) {
          results.push({
            entity_type: 'company',
            entity_id: co.id,
            entity_label: `${co.cid} – ${co.name}`,
            email: co.primary_contact_email || '',
          });
        } else {
          errors.push(cid.trim());
        }
      });
      setCsvErrors(errors);
      return results;
    }

    if (audienceType === 'company') {
      let filtered = companies.filter(c => c.status === 'active' || c.status === 'onboarding');
      if (selectionMethod === 'segment' && selectedSegmentId) {
        const seg = segments.find(s => s.id === selectedSegmentId);
        if (seg?.filters?.status) {
          filtered = companies.filter(c => seg.filters.status.includes(c.status));
        }
      }
      return filtered.map(c => ({
        entity_type: 'company' as const,
        entity_id: c.id,
        entity_label: `${c.cid} – ${c.name}`,
        email: c.primary_contact_email || '',
      }));
    } else {
      let filtered = employees.filter(e => e.status === 'active');
      if (selectionMethod === 'segment' && selectedSegmentId) {
        const seg = segments.find(s => s.id === selectedSegmentId);
        if (seg?.filters?.status) {
          filtered = employees.filter(e => seg.filters.status.includes(e.status));
        }
        if (seg?.filters?.pay_type) {
          filtered = filtered.filter(e => e.pay_type === seg.filters.pay_type);
        }
        if (seg?.filters?.work_state) {
          filtered = filtered.filter(e => seg.filters.work_state.includes(e.state));
        }
      }
      return filtered.map(e => ({
        entity_type: 'employee' as const,
        entity_id: e.id,
        entity_label: `${e.mid} – ${e.first_name} ${e.last_name}`,
        email: e.email,
      }));
    }
  }, [audienceType, selectionMethod, selectedSegmentId, companies, employees, segments, csvText]);

  const selectedSegment = segments.find(s => s.id === selectedSegmentId);

  const handleSubmit = async () => {
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!bodyHtml.trim()) { toast.error('Email body is required'); return; }
    if (recipients.length === 0) { toast.error('No recipients selected'); return; }

    try {
      const scheduledAt = sendMode === 'schedule' && scheduledDate
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      const comm = await createComm.mutateAsync({
        audience_type: audienceType,
        contact_type: contactType,
        selection_method: selectionMethod,
        segment_id: selectedSegmentId || null,
        segment_name: selectedSegment?.name || null,
        subject,
        body_html: bodyHtml,
        from_name: fromName,
        reply_to: replyTo || null,
        status: sendMode === 'now' ? 'sent' : 'scheduled',
        recipient_count: recipients.length,
        scheduled_at: scheduledAt,
        sent_at: sendMode === 'now' ? new Date().toISOString() : null,
        timezone,
        creator_name: userName || null,
      } as any);

      await insertRecipients.mutateAsync(
        recipients.map(r => ({
          communication_id: comm.id,
          entity_type: r.entity_type,
          entity_id: r.entity_id,
          entity_label: r.entity_label,
          email: r.email,
          delivery_status: sendMode === 'now' ? 'sent' : 'pending',
        }))
      );

      toast.success(sendMode === 'now' ? 'Communication sent!' : 'Communication scheduled!');
      navigate('/communications');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  // Token replacement for preview
  const previewBody = bodyHtml
    .replace(/\{\{company_name\}\}/g, 'Acme Corp')
    .replace(/\{\{employee_first_name\}\}/g, 'Jane')
    .replace(/\{\{pay_date\}\}/g, format(new Date(), 'MMM d, yyyy'));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => step > 0 ? setStep(step - 1) : navigate('/communications')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {step > 0 ? 'Back' : 'Cancel'}
        </Button>
        <PageHeader
          title="New Communication"
          description={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              i < step ? 'bg-primary text-primary-foreground' : i === step ? 'bg-primary/20 text-primary border-2 border-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Audience */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Audience</CardTitle>
            <CardDescription>Select who this communication targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>Audience Target</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Card className={`cursor-pointer p-4 ${audienceType === 'company' ? 'ring-2 ring-primary' : ''}`} onClick={() => setAudienceType('company')}>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Companies (CIDs)</p>
                      <p className="text-xs text-muted-foreground">Client admins & contacts</p>
                    </div>
                  </div>
                </Card>
                <Card className={`cursor-pointer p-4 ${audienceType === 'employee' ? 'ring-2 ring-primary' : ''}`} onClick={() => setAudienceType('employee')}>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Employees / Contractors</p>
                      <p className="text-xs text-muted-foreground">Member work or personal emails</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div>
              <Label>Recipient Contact Type</Label>
              {audienceType === 'company' ? (
                <Select value={contactType} onValueChange={setContactType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary_admin">Primary Admin</SelectItem>
                    <SelectItem value="billing_contact">Billing Contact</SelectItem>
                    <SelectItem value="all_contacts">All Company Contacts</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Select value={contactType} onValueChange={setContactType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work_email">Work Email</SelectItem>
                    <SelectItem value="personal_email">Personal Email</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button className="w-full" onClick={() => setStep(1)}>
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Select Recipients */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Recipients</CardTitle>
            <CardDescription>Choose how to select your audience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {(['all', 'segment', 'upload'] as const).map(method => (
                <Card key={method} className={`cursor-pointer p-4 ${selectionMethod === method ? 'ring-2 ring-primary' : ''}`} onClick={() => { setSelectionMethod(method); setSelectedSegmentId(''); setCsvText(''); }}>
                  <div className="flex flex-col items-center gap-2 text-center">
                    {method === 'all' && <Send className="h-5 w-5 text-primary" />}
                    {method === 'segment' && <Filter className="h-5 w-5 text-primary" />}
                    {method === 'upload' && <Upload className="h-5 w-5 text-primary" />}
                    <p className="font-medium text-sm capitalize">{method === 'all' ? 'Send to All' : method === 'segment' ? 'Use Segment' : 'CSV Upload'}</p>
                  </div>
                </Card>
              ))}
            </div>

            {selectionMethod === 'all' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Sending to all will reach <strong>{recipients.length}</strong> {audienceType === 'company' ? 'companies' : 'employees'}. Ensure message is approved.
                </AlertDescription>
              </Alert>
            )}

            {selectionMethod === 'segment' && (
              <div className="space-y-3">
                <Label>Select a Segment</Label>
                <Select value={selectedSegmentId} onValueChange={setSelectedSegmentId}>
                  <SelectTrigger><SelectValue placeholder="Choose a segment..." /></SelectTrigger>
                  <SelectContent>
                    {segments.map(seg => (
                      <SelectItem key={seg.id} value={seg.id}>
                        <div className="flex items-center gap-2">
                          {seg.is_system && <Badge variant="outline" className="text-[10px] px-1 py-0">System</Badge>}
                          <span>{seg.name}</span>
                          <span className="text-muted-foreground text-xs">({seg.category})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSegment && (
                  <p className="text-sm text-muted-foreground">{selectedSegment.description}</p>
                )}
              </div>
            )}

            {selectionMethod === 'upload' && (
              <div className="space-y-3">
                <Label>Upload CSV (column: CID)</Label>
                <Input type="file" accept=".csv" onChange={handleCsvUpload} />
                <p className="text-xs text-muted-foreground">CSV should have a single column header "CID" with company IDs below.</p>
                {csvErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {csvErrors.length} invalid CID(s): {csvErrors.slice(0, 5).join(', ')}{csvErrors.length > 5 ? '...' : ''}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm font-medium">
                Recipients: <span className="text-primary tabular-nums">{recipients.length}</span>
              </p>
              <Button onClick={() => setStep(2)} disabled={recipients.length === 0}>
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Review Recipients */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Recipient Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Audience Type</p>
                <p className="font-medium capitalize">{audienceType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Selection Method</p>
                <p className="font-medium capitalize">{selectionMethod === 'all' ? 'All' : selectionMethod === 'segment' ? `Segment: ${selectedSegment?.name}` : 'CSV Upload'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Recipients</p>
                <p className="font-semibold text-primary tabular-nums">{recipients.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Contact Type</p>
                <p className="font-medium">{contactType.replace(/_/g, ' ')}</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-2">Sample Recipients (first 10)</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.slice(0, 10).map(r => (
                    <TableRow key={r.entity_id}>
                      <TableCell className="text-xs">{r.entity_label.split(' – ')[0]}</TableCell>
                      <TableCell className="text-sm">{r.entity_label.split(' – ')[1]}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.email || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {recipients.length > 10 && <p className="text-xs text-muted-foreground mt-1">...and {recipients.length - 10} more</p>}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Edit Recipients
              </Button>
              <Button onClick={() => setStep(3)}>
                Continue to Draft <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Draft Email */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Draft Email</CardTitle>
            <CardDescription>Compose your message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Name</Label>
                <Input value={fromName} onChange={e => setFromName(e.target.value)} />
              </div>
              <div>
                <Label>Reply-To Email</Label>
                <Input type="email" placeholder="support@atlasone.com" value={replyTo} onChange={e => setReplyTo(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Subject Line *</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Important Update Regarding Your Payroll" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Body *</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => setBodyHtml(b => b + '{{company_name}}')}>+ Company Name</Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => setBodyHtml(b => b + '{{employee_first_name}}')}>+ First Name</Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => setBodyHtml(b => b + '{{pay_date}}')}>+ Pay Date</Button>
                </div>
              </div>
              <Textarea
                value={bodyHtml}
                onChange={e => setBodyHtml(e.target.value)}
                rows={10}
                placeholder="Write your email content here. Use personalization tokens like {{company_name}} or {{employee_first_name}}."
              />
            </div>

            {showPreview ? (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Preview</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}><X className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-1">Subject: {subject}</p>
                  <div className="bg-background rounded p-4 text-sm whitespace-pre-wrap border">{previewBody}</div>
                </CardContent>
              </Card>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                <Eye className="h-4 w-4 mr-1" /> Preview
              </Button>
            )}

            {!subject && <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>Subject line is required.</AlertDescription></Alert>}
            {recipients.length > 100 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>This communication will be sent to <strong>{recipients.length}</strong> recipients. Please review carefully.</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(4)} disabled={!subject.trim() || !bodyHtml.trim()}>
                Continue to Schedule <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: Schedule */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Send</CardTitle>
            <CardDescription>Choose when to send this communication</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 rounded-lg p-4">
              <div><p className="text-muted-foreground">Subject</p><p className="font-medium">{subject}</p></div>
              <div><p className="text-muted-foreground">Recipients</p><p className="font-semibold text-primary">{recipients.length}</p></div>
              <div><p className="text-muted-foreground">Audience</p><p className="font-medium capitalize">{audienceType}</p></div>
              <div><p className="text-muted-foreground">From</p><p className="font-medium">{fromName}</p></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className={`cursor-pointer p-4 ${sendMode === 'now' ? 'ring-2 ring-primary' : ''}`} onClick={() => setSendMode('now')}>
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Send Now</p>
                    <p className="text-xs text-muted-foreground">Send immediately</p>
                  </div>
                </div>
              </Card>
              <Card className={`cursor-pointer p-4 ${sendMode === 'schedule' ? 'ring-2 ring-primary' : ''}`} onClick={() => setSendMode('schedule')}>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Schedule</p>
                    <p className="text-xs text-muted-foreground">Choose date & time</p>
                  </div>
                </div>
              </Card>
            </div>

            {sendMode === 'schedule' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern</SelectItem>
                      <SelectItem value="America/Chicago">Central</SelectItem>
                      <SelectItem value="America/Denver">Mountain</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={async () => {
                  try {
                    await createComm.mutateAsync({
                      audience_type: audienceType,
                      contact_type: contactType,
                      selection_method: selectionMethod,
                      segment_name: selectedSegment?.name || null,
                      subject,
                      body_html: bodyHtml,
                      from_name: fromName,
                      reply_to: replyTo || null,
                      status: 'draft',
                      recipient_count: recipients.length,
                      creator_name: userName || null,
                    } as any);
                    toast.success('Draft saved!');
                    navigate('/communications');
                  } catch (e: any) { toast.error(e.message); }
                }}>
                  Save as Draft
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createComm.isPending || insertRecipients.isPending || (sendMode === 'schedule' && !scheduledDate)}
                >
                  {createComm.isPending ? 'Sending...' : sendMode === 'now' ? 'Send Now' : 'Schedule Send'}
                  <Send className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
