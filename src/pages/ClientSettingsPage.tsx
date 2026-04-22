import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatusBadge } from '@/components/StatusBadge';
import { Loader2, Save, RotateCcw, Building, DollarSign, Clock, Calendar, Shield, Bell, Plug, Users, History, Lock, Info, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany, useUpdateCompany } from '@/hooks/useCompanies';
import {
  useEnterpriseSettings, useClientOverrides, useSettingAuditLogs,
  useUpsertClientOverride, useDeleteClientOverride,
  ENTERPRISE_SETTING_DEFS, type EnterpriseSetting, type ClientOverride,
} from '@/hooks/useSettings';
import { TimeOffPoliciesManager } from '@/components/settings/time-off/TimeOffPoliciesManager';
import { TimekeepingSettings } from '@/components/settings/timekeeping/TimekeepingSettings';
import { ClientEDSettings } from '@/components/settings/earnings-deductions/ClientEDSettings';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const TIMEZONES = [
  'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
  'America/Phoenix','America/Anchorage','Pacific/Honolulu',
];

// Setting keys client admins can override
const CLIENT_OVERRIDABLE_KEYS = [
  'payroll.auto_approve_semimonthly',
  'payroll.auto_approve_biweekly',
  'payroll.pay_date_weekend_shift',
  'payroll.pay_date_holiday_shift',
  'compliance.license_renewal_reminder_days',
  'compliance.new_hire_reporting_days',
];

const READ_ONLY_PAYROLL = [
  'payroll.semimonthly_approval_days_before',
  'payroll.biweekly_timecard_cutoff',
  'payroll.biweekly_approval_cutoff',
  'payroll.expedited_wire_cutoff',
];

const READ_ONLY_COMPLIANCE = [
  'compliance.i9_deadline_days',
  'compliance.payroll_blocking_enabled',
];

function parseValue(raw: any) {
  if (raw === null || raw === undefined) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

interface OverrideFieldProps {
  def: typeof ENTERPRISE_SETTING_DEFS[number];
  enterpriseValue: any;
  override?: ClientOverride;
  companyId: string;
}

function OverrideField({ def, enterpriseValue, override, companyId }: OverrideFieldProps) {
  const upsert = useUpsertClientOverride();
  const remove = useDeleteClientOverride();
  const isOverridden = !!override;
  const effective = isOverridden ? parseValue(override?.override_value) : enterpriseValue;
  const [draft, setDraft] = useState<any>(effective);

  useEffect(() => { setDraft(effective); }, [JSON.stringify(effective)]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(effective);

  const save = () => {
    upsert.mutate({ companyId, key: def.key, value: draft });
  };
  const revert = () => {
    if (isOverridden) remove.mutate({ companyId, key: def.key });
    setDraft(enterpriseValue);
  };

  return (
    <div className="space-y-2 p-4 rounded-md border bg-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-sm font-medium">{def.label}</Label>
          {def.description && <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>}
        </div>
        {isOverridden ? (
          <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">Custom</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">Inherits default</Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {def.data_type === 'boolean' ? (
          <Switch checked={!!draft} onCheckedChange={setDraft} />
        ) : def.data_type === 'number' ? (
          <Input type="number" value={draft ?? ''} onChange={(e) => setDraft(Number(e.target.value))} className="max-w-[180px]" />
        ) : def.key.endsWith('weekend_shift') ? (
          <Select value={String(draft ?? '')} onValueChange={setDraft}>
            <SelectTrigger className="max-w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="previous_friday">Previous Friday</SelectItem>
              <SelectItem value="next_monday">Next Monday</SelectItem>
              <SelectItem value="exact_date">Keep exact date</SelectItem>
            </SelectContent>
          </Select>
        ) : def.key.endsWith('holiday_shift') ? (
          <Select value={String(draft ?? '')} onValueChange={setDraft}>
            <SelectTrigger className="max-w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="previous_business_day">Previous business day</SelectItem>
              <SelectItem value="next_business_day">Next business day</SelectItem>
              <SelectItem value="exact_date">Keep exact date</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input value={String(draft ?? '')} onChange={(e) => setDraft(e.target.value)} />
        )}
        <Button size="sm" onClick={save} disabled={!dirty || upsert.isPending}>
          {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        </Button>
        {isOverridden && (
          <Button size="sm" variant="ghost" onClick={revert} disabled={remove.isPending}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Revert
          </Button>
        )}
      </div>
    </div>
  );
}

function ReadOnlyRow({ label, value, description }: { label: string; value: any; description?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-md border bg-muted/30">
      <div>
        <div className="text-sm font-medium flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-muted-foreground" />{label}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="text-sm font-mono text-muted-foreground">{String(value)}</div>
    </div>
  );
}

// ─── Profile Tab ───
function ProfileTab({ companyId }: { companyId: string }) {
  const { data: company, isLoading } = useCompany(companyId);
  const update = useUpdateCompany();
  const [draft, setDraft] = useState<any>({});

  useEffect(() => { if (company) setDraft({ ...company }); }, [company]);

  if (isLoading || !company) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const set = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }));

  const save = () => {
    const editable: any = {
      id: company.id,
      name: draft.name,
      dba_name: draft.dba_name,
      primary_contact_name: draft.primary_contact_name,
      primary_contact_email: draft.primary_contact_email,
      primary_contact_phone: draft.primary_contact_phone,
      address_line1: draft.address_line1,
      address_line2: draft.address_line2,
      city: draft.city,
      state: draft.state,
      zip: draft.zip,
      mailing_address_line1: draft.mailing_address_line1,
      mailing_address_line2: draft.mailing_address_line2,
      mailing_city: draft.mailing_city,
      mailing_state: draft.mailing_state,
      mailing_zip: draft.mailing_zip,
      naics_code: draft.naics_code,
      business_description: draft.business_description,
    };
    update.mutate(editable, {
      onSuccess: () => toast.success('Company profile updated'),
      onError: (e: any) => toast.error(e.message || 'Failed to update profile'),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-muted-foreground" />Locked fields</CardTitle>
          <CardDescription>Contact your AtlasOne account manager to change these.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          <ReadOnlyRow label="Legal name" value={(company as any).legal_name || '—'} />
          <ReadOnlyRow label="EIN" value={company.ein} />
          <ReadOnlyRow label="Client ID (CID)" value={company.cid} />
          <ReadOnlyRow label="Status" value={company.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Display & contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input value={draft.name || ''} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>DBA</Label>
              <Input value={draft.dba_name || ''} onChange={(e) => set('dba_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Primary contact name</Label>
              <Input value={draft.primary_contact_name || ''} onChange={(e) => set('primary_contact_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Primary contact email</Label>
              <Input type="email" value={draft.primary_contact_email || ''} onChange={(e) => set('primary_contact_email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Primary contact phone</Label>
              <Input value={draft.primary_contact_phone || ''} onChange={(e) => set('primary_contact_phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>NAICS code</Label>
              <Input value={draft.naics_code || ''} onChange={(e) => set('naics_code', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Physical address</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2"><Label>Address line 1</Label><Input value={draft.address_line1 || ''} onChange={(e) => set('address_line1', e.target.value)} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Address line 2</Label><Input value={draft.address_line2 || ''} onChange={(e) => set('address_line2', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>City</Label><Input value={draft.city || ''} onChange={(e) => set('city', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>State</Label><Input value={draft.state || ''} onChange={(e) => set('state', e.target.value)} maxLength={2} /></div>
          <div className="space-y-1.5"><Label>ZIP</Label><Input value={draft.zip || ''} onChange={(e) => set('zip', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Mailing address</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2"><Label>Address line 1</Label><Input value={draft.mailing_address_line1 || ''} onChange={(e) => set('mailing_address_line1', e.target.value)} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Address line 2</Label><Input value={draft.mailing_address_line2 || ''} onChange={(e) => set('mailing_address_line2', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>City</Label><Input value={draft.mailing_city || ''} onChange={(e) => set('mailing_city', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>State</Label><Input value={draft.mailing_state || ''} onChange={(e) => set('mailing_state', e.target.value)} maxLength={2} /></div>
          <div className="space-y-1.5"><Label>ZIP</Label><Input value={draft.mailing_zip || ''} onChange={(e) => set('mailing_zip', e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save profile
        </Button>
      </div>
    </div>
  );
}

// ─── Override-based Tab Builder ───
function OverridesSection({
  companyId, sectionKeys, settingsMap, overridesMap, readOnlyKeys,
}: {
  companyId: string;
  sectionKeys: string[];
  settingsMap: Record<string, EnterpriseSetting>;
  overridesMap: Record<string, ClientOverride>;
  readOnlyKeys?: string[];
}) {
  return (
    <div className="space-y-3">
      {sectionKeys.map((key) => {
        const def = ENTERPRISE_SETTING_DEFS.find(d => d.key === key);
        if (!def) return null;
        const enterpriseValue = settingsMap[key] ? parseValue(settingsMap[key].value) : def.defaultValue;
        return (
          <OverrideField
            key={key}
            def={def}
            enterpriseValue={enterpriseValue}
            override={overridesMap[key]}
            companyId={companyId}
          />
        );
      })}
      {readOnlyKeys && readOnlyKeys.length > 0 && (
        <>
          <Separator className="my-4" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Set by AtlasOne (read-only)</p>
          {readOnlyKeys.map(key => {
            const def = ENTERPRISE_SETTING_DEFS.find(d => d.key === key);
            if (!def) return null;
            const value = settingsMap[key] ? parseValue(settingsMap[key].value) : def.defaultValue;
            return <ReadOnlyRow key={key} label={def.label} value={value} description={def.description} />;
          })}
        </>
      )}
    </div>
  );
}

// ─── Notifications Tab ───
function NotificationsTab({ companyId, overridesMap }: { companyId: string; overridesMap: Record<string, ClientOverride> }) {
  const upsert = useUpsertClientOverride();
  const NOTIF_KEYS = [
    { key: 'notifications.payroll_ready_emails', label: 'Payroll ready' },
    { key: 'notifications.invoice_issued_emails', label: 'Invoice issued' },
    { key: 'notifications.compliance_alert_emails', label: 'Compliance alerts' },
    { key: 'notifications.timecard_reminder_emails', label: 'Timecard approval reminders' },
  ];
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const init: Record<string, string> = {};
    NOTIF_KEYS.forEach(n => {
      const o = overridesMap[n.key];
      const v = o ? parseValue(o.override_value) : [];
      init[n.key] = Array.isArray(v) ? v.join(', ') : (v || '');
    });
    setDrafts(init);
  }, [JSON.stringify(overridesMap)]);

  return (
    <div className="space-y-3">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Comma-separated email addresses. Notifications also go to the primary contact by default.</AlertDescription></Alert>
      {NOTIF_KEYS.map(n => (
        <div key={n.key} className="p-4 rounded-md border bg-card space-y-2">
          <Label className="text-sm font-medium">{n.label}</Label>
          <div className="flex gap-2">
            <Input
              placeholder="email1@example.com, email2@example.com"
              value={drafts[n.key] || ''}
              onChange={(e) => setDrafts({ ...drafts, [n.key]: e.target.value })}
            />
            <Button
              size="sm"
              onClick={() => {
                const list = (drafts[n.key] || '').split(',').map(s => s.trim()).filter(Boolean);
                upsert.mutate({ companyId, key: n.key, value: list });
              }}
              disabled={upsert.isPending}
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Users Tab ───
function UsersTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'employee' | 'client_admin'>('employee');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['client-users', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('company_id', companyId);
      if (error) throw error;
      const ids = (data || []).map((p: any) => p.id);
      let roleMap: Record<string, string> = {};
      if (ids.length) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', ids);
        (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
      }
      return (data || []).map((p: any) => ({ ...p, role: roleMap[p.id] || '—' }));
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      const email = inviteEmail.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email');
      const { data, error } = await supabase.functions.invoke('invite-client-user', {
        body: { email, full_name: inviteName.trim(), role: inviteRole },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail(''); setInviteName(''); setInviteRole('employee');
      qc.invalidateQueries({ queryKey: ['client-users', companyId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to send invite'),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Users at your company</CardTitle>
            <CardDescription>Invite client admins and employees. They'll receive an email to set their password.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />Invite user
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No users found.</TableCell></TableRow>
            ) : users.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell>{u.full_name || '—'}</TableCell>
                <TableCell className="font-mono text-xs">{u.email}</TableCell>
                <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite user</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jane@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="client_admin">Client Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Alert><Info className="h-4 w-4" /><AlertDescription className="text-xs">The invitee will receive a secure link to set their password and access the platform.</AlertDescription></Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={invite.isPending}>Cancel</Button>
              <Button onClick={() => invite.mutate()} disabled={invite.isPending || !inviteEmail.trim()}>
                {invite.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
                Send invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ─── History Tab ───
function HistoryTab({ companyId }: { companyId: string }) {
  const { data: logs = [], isLoading } = useSettingAuditLogs('client', companyId);
  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Recent setting changes</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>When</TableHead><TableHead>Setting</TableHead><TableHead>By</TableHead><TableHead>New value</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No changes yet.</TableCell></TableRow>
            ) : logs.map(l => (
              <TableRow key={l.id}>
                <TableCell className="text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                <TableCell className="font-mono text-xs">{l.setting_key}</TableCell>
                <TableCell className="text-xs">{l.changed_by_email || '—'}</TableCell>
                <TableCell className="font-mono text-xs max-w-[260px] truncate">{l.new_value === null ? '(reverted)' : JSON.stringify(l.new_value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Integrations Tab (read-only) ───
function IntegrationsTab() {
  const items = [
    { name: 'Payroll provider (Everee)', status: 'Connected' },
    { name: 'Email delivery', status: 'Connected' },
    { name: 'Time tracking', status: 'Available' },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connected services</CardTitle>
        <CardDescription>Read-only. Contact your account manager to enable or change integrations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map(i => (
          <div key={i.name} className="flex items-center justify-between p-3 rounded-md border bg-card">
            <span className="text-sm font-medium">{i.name}</span>
            <Badge variant="outline">{i.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───
export default function ClientSettingsPage() {
  const { role, profile } = useAuth();
  const companyId = profile?.company_id || null;
  const { data: company } = useCompany(companyId || undefined);
  const { data: enterpriseSettings = [] } = useEnterpriseSettings();
  const { data: overrides = [] } = useClientOverrides(companyId);

  const settingsMap = useMemo(() => {
    const m: Record<string, EnterpriseSetting> = {};
    enterpriseSettings.forEach(s => { m[s.key] = s; });
    return m;
  }, [enterpriseSettings]);

  const overridesMap = useMemo(() => {
    const m: Record<string, ClientOverride> = {};
    overrides.forEach(o => { m[o.setting_key] = o; });
    return m;
  }, [overrides]);

  // Redirect / guard (after hooks)
  if (role === 'super_admin') return <Navigate to="/settings" replace />;
  if (role !== 'client_admin') return <Navigate to="/" replace />;
  if (!companyId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Your account is not linked to a company. Contact your administrator.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Manage your company profile, payroll preferences, time off, and notifications."
        actions={company ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">{company.cid}</Badge>
            <StatusBadge status={company.status as any} />
          </div>
        ) : null}
      />

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile"><Building className="h-3.5 w-3.5 mr-1.5" />Profile</TabsTrigger>
          <TabsTrigger value="payroll"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Payroll</TabsTrigger>
          <TabsTrigger value="time-off"><Calendar className="h-3.5 w-3.5 mr-1.5" />Time Off</TabsTrigger>
          <TabsTrigger value="timekeeping"><Clock className="h-3.5 w-3.5 mr-1.5" />Timekeeping</TabsTrigger>
          <TabsTrigger value="ed"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Earnings & Deductions</TabsTrigger>
          <TabsTrigger value="compliance"><Shield className="h-3.5 w-3.5 mr-1.5" />Compliance</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-3.5 w-3.5 mr-1.5" />Notifications</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="h-3.5 w-3.5 mr-1.5" />Integrations</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-3.5 w-3.5 mr-1.5" />Users</TabsTrigger>
          <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1.5" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4"><ProfileTab companyId={companyId} /></TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <OverridesSection
            companyId={companyId}
            sectionKeys={['payroll.auto_approve_semimonthly','payroll.auto_approve_biweekly','payroll.pay_date_weekend_shift','payroll.pay_date_holiday_shift']}
            settingsMap={settingsMap}
            overridesMap={overridesMap}
            readOnlyKeys={READ_ONLY_PAYROLL}
          />
        </TabsContent>

        <TabsContent value="time-off" className="mt-4">
          <TimeOffPoliciesManager companyId={companyId} companyName={company?.name} />
        </TabsContent>

        <TabsContent value="timekeeping" className="mt-4">
          <TimekeepingSettings companyId={companyId} isSuperAdmin={false} />
        </TabsContent>

        <TabsContent value="ed" className="mt-4">
          <ClientEDSettings companyId={companyId} companyName={company?.name} />
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <OverridesSection
            companyId={companyId}
            sectionKeys={['compliance.license_renewal_reminder_days','compliance.new_hire_reporting_days']}
            settingsMap={settingsMap}
            overridesMap={overridesMap}
            readOnlyKeys={READ_ONLY_COMPLIANCE}
          />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationsTab companyId={companyId} overridesMap={overridesMap} />
        </TabsContent>

        <TabsContent value="integrations" className="mt-4"><IntegrationsTab /></TabsContent>

        <TabsContent value="users" className="mt-4"><UsersTab companyId={companyId} /></TabsContent>

        <TabsContent value="history" className="mt-4"><HistoryTab companyId={companyId} /></TabsContent>
      </Tabs>
    </div>
  );
}
