import { useState, useMemo } from 'react';
import { EnterpriseEDSettings } from '@/components/settings/earnings-deductions/EnterpriseEDSettings';
import { ClientEDSettings } from '@/components/settings/earnings-deductions/ClientEDSettings';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatCard } from '@/components/StatCard';
import { toast } from 'sonner';
import {
  Building2, DollarSign, Receipt, CreditCard, Shield, Users, Zap, Plug, Bell, History,
  Building, UserCheck, Key, FileText, Search, Settings as SettingsIcon, Save, RotateCcw, ChevronRight, ArrowLeft,
  AlertTriangle, CheckCircle2, Clock, Edit2, X
} from 'lucide-react';
import { TimeOffPoliciesManager } from '@/components/settings/time-off/TimeOffPoliciesManager';
import {
  useEnterpriseSettings, useClientOverrides, useSettingAuditLogs,
  useUpsertEnterpriseSetting, useUpsertClientOverride, useDeleteClientOverride,
  ENTERPRISE_SETTING_DEFS, SETTING_CATEGORIES, CLIENT_SETTING_SECTIONS, type EnterpriseSetting
} from '@/hooks/useSettings';
import { useCompanies } from '@/hooks/useCompanies';

const ICON_MAP: Record<string, any> = {
  Building2, DollarSign, Receipt, CreditCard, Shield, Users, Zap, Plug, Bell, History,
  Building, UserCheck, Key, FileText, Clock
};

// ─── Enterprise Settings Tab ───
function EnterpriseSettingsTab() {
  const [activeCategory, setActiveCategory] = useState('platform');
  const [search, setSearch] = useState('');
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [editReason, setEditReason] = useState('');

  const { data: settings = [], isLoading } = useEnterpriseSettings();
  const { data: auditLogs = [] } = useSettingAuditLogs('enterprise');
  const upsertSetting = useUpsertEnterpriseSetting();

  const settingsMap = useMemo(() => {
    const m: Record<string, EnterpriseSetting> = {};
    settings.forEach(s => { m[s.key] = s; });
    return m;
  }, [settings]);

  const getEffectiveValue = (def: typeof ENTERPRISE_SETTING_DEFS[0]) => {
    const saved = settingsMap[def.key];
    if (saved) {
      try { return typeof saved.value === 'string' ? JSON.parse(saved.value) : saved.value; } catch { return saved.value; }
    }
    return def.defaultValue;
  };

  const filteredDefs = ENTERPRISE_SETTING_DEFS.filter(d => {
    const matchCat = d.category === activeCategory;
    const matchSearch = !search || d.label.toLowerCase().includes(search.toLowerCase()) || d.key.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const recentChanges = auditLogs.slice(0, 5);

  const handleSave = () => {
    if (!editKey) return;
    const def = ENTERPRISE_SETTING_DEFS.find(d => d.key === editKey);
    if (!def) return;
    let val = editValue;
    if (def.data_type === 'number') val = Number(val);
    if (def.data_type === 'boolean') val = editValue === true || editValue === 'true';
    upsertSetting.mutate({ key: editKey, value: val, category: def.category, data_type: def.data_type, description: def.description, reason: editReason || undefined });
    setEditKey(null);
    setEditReason('');
  };

  return (
    <div className="flex gap-6">
      {/* Left Nav */}
      <div className="w-56 shrink-0 space-y-1">
        {SETTING_CATEGORIES.map(cat => {
          const Icon = ICON_MAP[cat.icon] || SettingsIcon;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeCategory === cat.key ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search settings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {activeCategory === 'time_off' ? <EnterpriseTimeOffSection /> :
         activeCategory === 'roles' ? <RolesSection /> :
         activeCategory === 'automations' ? <AutomationsSection /> :
         activeCategory === 'integrations' ? <IntegrationsSection /> :
         activeCategory === 'notifications' ? <NotificationsSection /> :
         activeCategory === 'audit' ? <AuditSection logs={auditLogs} /> :
        (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{SETTING_CATEGORIES.find(c => c.key === activeCategory)?.label}</CardTitle>
              <CardDescription>Enterprise-wide defaults. Client overrides take precedence when set.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0 divide-y">
              {isLoading ? <p className="text-sm text-muted-foreground py-4">Loading...</p> :
              filteredDefs.length === 0 ? <p className="text-sm text-muted-foreground py-4">No settings found.</p> :
              filteredDefs.map(def => {
                const val = getEffectiveValue(def);
                const saved = !!settingsMap[def.key];
                return (
                  <div key={def.key} className="flex items-center justify-between py-3 gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{def.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{def.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={saved ? 'default' : 'secondary'} className="text-xs">
                        {saved ? 'Custom' : 'Default'}
                      </Badge>
                      {def.data_type === 'boolean' ? (
                        <Switch
                          checked={!!val}
                          onCheckedChange={v => upsertSetting.mutate({ key: def.key, value: v, category: def.category, data_type: def.data_type, description: def.description })}
                        />
                      ) : (
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                          {def.data_type === 'number' && def.key.includes('markup') ? `${(Number(val) * 100).toFixed(1)}%` : String(val)}
                        </span>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { setEditKey(def.key); setEditValue(val); }}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Earnings & Deductions Manager - shown under Payroll category */}
        {activeCategory === 'payroll' && (
          <EnterpriseEDSettings />
        )}

        {/* Recent changes sidebar */}
        {activeCategory !== 'audit' && recentChanges.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> Recent Changes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentChanges.map(log => (
                <div key={log.id} className="text-xs border-l-2 border-muted pl-3 py-1">
                  <span className="font-medium">{log.setting_key}</span>
                  <span className="text-muted-foreground"> by {log.changed_by_email ?? 'system'}</span>
                  <span className="text-muted-foreground block">{new Date(log.created_at).toLocaleString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editKey} onOpenChange={o => { if (!o) setEditKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Setting</DialogTitle>
          </DialogHeader>
          {editKey && (() => {
            const def = ENTERPRISE_SETTING_DEFS.find(d => d.key === editKey);
            if (!def) return null;
            return (
              <div className="space-y-4">
                <div>
                  <Label>{def.label}</Label>
                  <p className="text-xs text-muted-foreground mb-2">{def.description}</p>
                  {def.data_type === 'boolean' ? (
                    <Switch checked={editValue === true || editValue === 'true'} onCheckedChange={v => setEditValue(v)} />
                  ) : def.data_type === 'number' ? (
                    <Input type="number" step="any" value={editValue} onChange={e => setEditValue(e.target.value)} />
                  ) : (
                    <Input value={editValue} onChange={e => setEditValue(e.target.value)} />
                  )}
                </div>
                <div>
                  <Label>Reason for change (optional)</Label>
                  <Input value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="e.g. Updated per Q2 policy" />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditKey(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertSetting.isPending}>
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Client Settings Tab ───
function ClientSettingsTab() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('profile');
  const [clientSearch, setClientSearch] = useState('');
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [editReason, setEditReason] = useState('');

  const { data: companies = [] } = useCompanies();
  const { data: enterpriseSettings = [] } = useEnterpriseSettings();
  const { data: overrides = [] } = useClientOverrides(selectedCompanyId);
  const { data: auditLogs = [] } = useSettingAuditLogs('client', selectedCompanyId);
  const upsertOverride = useUpsertClientOverride();
  const deleteOverride = useDeleteClientOverride();

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const filteredCompanies = companies.filter(c =>
    !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.id.includes(clientSearch)
  );

  const overridesMap = useMemo(() => {
    const m: Record<string, any> = {};
    overrides.forEach(o => { m[o.setting_key] = o; });
    return m;
  }, [overrides]);

  const enterpriseMap = useMemo(() => {
    const m: Record<string, any> = {};
    enterpriseSettings.forEach(s => { m[s.key] = s; });
    return m;
  }, [enterpriseSettings]);

  const getClientValue = (key: string) => {
    const ovr = overridesMap[key];
    if (ovr) {
      try { return { value: typeof ovr.override_value === 'string' ? JSON.parse(ovr.override_value) : ovr.override_value, source: 'override' }; } catch { return { value: ovr.override_value, source: 'override' }; }
    }
    const ent = enterpriseMap[key];
    if (ent) {
      try { return { value: typeof ent.value === 'string' ? JSON.parse(ent.value) : ent.value, source: 'enterprise' }; } catch { return { value: ent.value, source: 'enterprise' }; }
    }
    const def = ENTERPRISE_SETTING_DEFS.find(d => d.key === key);
    return { value: def?.defaultValue ?? '', source: 'enterprise' };
  };

  const clientPayrollDefs = ENTERPRISE_SETTING_DEFS.filter(d => d.category === 'payroll');
  const clientTaxDefs = ENTERPRISE_SETTING_DEFS.filter(d => d.category === 'tax');
  const clientBillingDefs = ENTERPRISE_SETTING_DEFS.filter(d => d.category === 'billing');
  const clientComplianceDefs = ENTERPRISE_SETTING_DEFS.filter(d => d.category === 'compliance');

  const handleSaveOverride = () => {
    if (!editKey || !selectedCompanyId) return;
    const def = ENTERPRISE_SETTING_DEFS.find(d => d.key === editKey);
    let val = editValue;
    if (def?.data_type === 'number') val = Number(val);
    if (def?.data_type === 'boolean') val = editValue === true || editValue === 'true';
    upsertOverride.mutate({ companyId: selectedCompanyId, key: editKey, value: val, reason: editReason || undefined });
    setEditKey(null);
    setEditReason('');
  };

  if (!selectedCompanyId) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by client name or ID..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="grid gap-2">
          {filteredCompanies.slice(0, 20).map(c => (
            <button key={c.id} onClick={() => setSelectedCompanyId(c.id)} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors text-left">
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.state} · {c.employee_count} employees · {c.status}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-xs">{c.status}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
          {filteredCompanies.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No clients found.</p>}
        </div>
      </div>
    );
  }

  const renderOverridableSettings = (defs: typeof ENTERPRISE_SETTING_DEFS, sectionLabel: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{sectionLabel}</CardTitle>
        <CardDescription>Settings inherited from enterprise defaults unless overridden.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y">
        {defs.map(def => {
          const { value, source } = getClientValue(def.key);
          const isOverride = source === 'override';
          return (
            <div key={def.key} className="flex items-center justify-between py-3 gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{def.label}</p>
                <p className="text-xs text-muted-foreground">{def.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={isOverride ? 'destructive' : 'outline'} className="text-xs">
                  {isOverride ? 'Client Override' : 'Enterprise Default'}
                </Badge>
                {def.data_type === 'boolean' ? (
                  <Switch
                    checked={!!value}
                    onCheckedChange={v => upsertOverride.mutate({ companyId: selectedCompanyId!, key: def.key, value: v })}
                  />
                ) : (
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded max-w-[180px] truncate">
                    {def.data_type === 'number' && def.key.includes('markup') ? `${(Number(value) * 100).toFixed(1)}%` : String(value)}
                  </span>
                )}
                <Button size="sm" variant="ghost" onClick={() => { setEditKey(def.key); setEditValue(value); }}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                {isOverride && (
                  <Button size="sm" variant="ghost" onClick={() => deleteOverride.mutate({ companyId: selectedCompanyId!, key: def.key })}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex gap-6">
      {/* Left nav */}
      <div className="w-52 shrink-0 space-y-1">
        <button onClick={() => setSelectedCompanyId(null)} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted mb-2">
          <RotateCcw className="h-3.5 w-3.5" /> Change Client
        </button>
        <Separator className="my-2" />
        {CLIENT_SETTING_SECTIONS.map(sec => {
          const Icon = ICON_MAP[sec.icon] || SettingsIcon;
          return (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeSection === sec.key ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold">{selectedCompany?.name}</h2>
            <p className="text-xs text-muted-foreground">{selectedCompany?.state} · EIN: {selectedCompany?.ein} · Status: {selectedCompany?.status}</p>
          </div>
          <Badge variant={selectedCompany?.status === 'active' ? 'default' : 'secondary'} className="ml-auto">{selectedCompany?.status}</Badge>
        </div>
        <Separator />

        {activeSection === 'profile' && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Client Profile</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {[
                ['Legal Name', selectedCompany?.legal_name || selectedCompany?.name],
                ['DBA', (selectedCompany as any)?.dba_name || '—'],
                ['FEIN', selectedCompany?.ein],
                ['Entity Type', (selectedCompany as any)?.entity_type || '—'],
                ['State', selectedCompany?.state],
                ['City', selectedCompany?.city || '—'],
                ['Primary Contact', selectedCompany?.primary_contact_name],
                ['Contact Email', selectedCompany?.primary_contact_email || '—'],
                ['Contact Phone', selectedCompany?.primary_contact_phone || '—'],
                ['NAICS', (selectedCompany as any)?.naics_code || '—'],
                ['Employee Count', selectedCompany?.employee_count],
                ['Status', selectedCompany?.status],
              ].map(([label, val]) => (
                <div key={String(label)}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{String(val ?? '—')}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {activeSection === 'payroll' && (
          <>
            {renderOverridableSettings(clientPayrollDefs, 'Payroll Settings')}
            <ClientEDSettings companyId={selectedCompanyId!} companyName={selectedCompany?.name} />
          </>
        )}
        {activeSection === 'tax' && renderOverridableSettings(clientTaxDefs, 'Tax Settings')}
        {activeSection === 'billing' && renderOverridableSettings(clientBillingDefs, 'Billing Settings')}
        {activeSection === 'compliance' && renderOverridableSettings(clientComplianceDefs, 'Compliance Settings')}

        {activeSection === 'time_off' && selectedCompanyId && (
          <TimeOffPoliciesManager companyId={selectedCompanyId} companyName={selectedCompany?.name} />
        )}

        {activeSection === 'hr' && (
          <Card>
            <CardHeader><CardTitle className="text-lg">HR / Employment Settings</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Default employee classifications, onboarding packages, benefits waiting periods, and PTO policies are managed through the Employee and Onboarding modules for this client.</p>
              <Button variant="outline" size="sm" onClick={() => toast.info('Navigate to Employees → Company filter')}>View Client Employees</Button>
            </CardContent>
          </Card>
        )}

        {activeSection === 'access' && (
          <Card>
            <CardHeader><CardTitle className="text-lg">User Access</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Client admin users, payroll approvers, and employee access are managed through the user roles system. Use the Enterprise Roles & Permissions section to assign or review client-scoped roles.</p>
              <Button variant="outline" size="sm" onClick={() => toast.info('Navigate to Enterprise Settings → Roles')}>Manage Roles</Button>
            </CardContent>
          </Card>
        )}

        {activeSection === 'integrations' && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Client Integrations</CardTitle></CardHeader>
            <CardContent>
              {[
                { name: 'Time Tracking', status: 'not_connected' },
                { name: 'Benefits', status: 'not_connected' },
                { name: 'Accounting / GL', status: 'not_connected' },
              ].map(i => (
                <div key={i.name} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{i.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">Not Connected</Badge>
                    <Button size="sm" variant="outline">Connect</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {activeSection === 'notes' && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Notes & Audit History</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {auditLogs.length === 0 ? <p className="text-sm text-muted-foreground">No setting changes recorded for this client.</p> :
                auditLogs.slice(0, 20).map(log => (
                  <div key={log.id} className="text-xs border-l-2 border-muted pl-3 py-1">
                    <span className="font-medium">{log.setting_key}</span>
                    {log.old_value != null && <span className="text-muted-foreground"> from <span className="font-mono">{JSON.stringify(log.old_value)}</span></span>}
                    <span className="text-muted-foreground"> → <span className="font-mono">{JSON.stringify(log.new_value)}</span></span>
                    <span className="text-muted-foreground block">{log.changed_by_email ?? 'system'} · {new Date(log.created_at).toLocaleString()}</span>
                    {log.reason && <span className="text-muted-foreground italic block">Reason: {log.reason}</span>}
                  </div>
                ))
              }
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit override dialog */}
      <Dialog open={!!editKey} onOpenChange={o => { if (!o) setEditKey(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Override Setting for {selectedCompany?.name}</DialogTitle></DialogHeader>
          {editKey && (() => {
            const def = ENTERPRISE_SETTING_DEFS.find(d => d.key === editKey);
            if (!def) return null;
            const { source } = getClientValue(editKey);
            return (
              <div className="space-y-4">
                <div>
                  <Label>{def.label}</Label>
                  <p className="text-xs text-muted-foreground mb-2">{def.description}</p>
                  {def.data_type === 'boolean' ? (
                    <Switch checked={editValue === true || editValue === 'true'} onCheckedChange={v => setEditValue(v)} />
                  ) : def.data_type === 'number' ? (
                    <Input type="number" step="any" value={editValue} onChange={e => setEditValue(e.target.value)} />
                  ) : (
                    <Input value={editValue} onChange={e => setEditValue(e.target.value)} />
                  )}
                </div>
                <div>
                  <Label>Reason (optional)</Label>
                  <Input value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="e.g. Per client request" />
                </div>
                {source === 'enterprise' && (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    This will override the enterprise default for this client only.
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditKey(null)}>Cancel</Button>
            <Button onClick={handleSaveOverride} disabled={upsertOverride.isPending}>
              <Save className="h-4 w-4 mr-1" /> Save Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Enterprise Time Off Section ───
function EnterpriseTimeOffSection() {
  const { data: companies = [] } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [subPage, setSubPage] = useState<'companies' | 'state_laws'>('companies');

  const filtered = companies.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedCompanyId) {
    const company = companies.find(c => c.id === selectedCompanyId);
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedCompanyId(null)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to companies
        </Button>
        <TimeOffPoliciesManager companyId={selectedCompanyId} companyName={company?.name} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Time Off Policies</CardTitle>
        <CardDescription>Select a company to manage its time off plans. Each company can have multiple active plans.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filtered.slice(0, 20).map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCompanyId(c.id)}
              className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.state} · {c.employee_count} employees</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sub-sections for Enterprise ───

function RolesSection() {
  const roles = [
    { name: 'Super Admin', description: 'Full platform access', permissions: ['All'] },
    { name: 'Payroll Ops Admin', description: 'Payroll processing and edits', permissions: ['Payroll Processing', 'Payroll Edits', 'Timecard Review'] },
    { name: 'Tax Admin', description: 'Tax settings and filing', permissions: ['Tax Settings', 'Tax Filing', 'SUI Management'] },
    { name: 'Compliance Admin', description: 'Compliance rules and review', permissions: ['Compliance Edit', 'Compliance Review', 'Blocking Rules'] },
    { name: 'Billing / Finance Admin', description: 'Billing, invoicing, AR', permissions: ['Billing Access', 'Invoice Override', 'AR Management'] },
    { name: 'Client Support Admin', description: 'Client-facing support', permissions: ['Client View', 'Employee View', 'Read-Only Reports'] },
    { name: 'Read-Only Reporting', description: 'View and export reports only', permissions: ['Report View', 'Report Export'] },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Roles & Permissions</CardTitle>
        <CardDescription>Manage internal AtlasOne roles and their access levels.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y">
        {roles.map(role => (
          <div key={role.name} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">{role.name}</p>
              <p className="text-xs text-muted-foreground">{role.description}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {role.permissions.map(p => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toast.info(`Edit ${role.name} role`)}>Edit</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AutomationsSection() {
  const automations = [
    { name: 'Payroll Approval Reminders', enabled: true, trigger: '48h before deadline' },
    { name: 'Invoice Auto-Send', enabled: true, trigger: 'On invoice generation' },
    { name: 'Failed Payment Alerts', enabled: true, trigger: 'On payment failure' },
    { name: 'Compliance Expiry Alerts', enabled: true, trigger: '60 days before expiry' },
    { name: 'Onboarding Invite Emails', enabled: true, trigger: 'On employee creation' },
    { name: 'Employee Activation Emails', enabled: false, trigger: 'On account activation' },
    { name: 'Report Scheduling', enabled: false, trigger: 'On schedule' },
    { name: 'Escalation Routing', enabled: true, trigger: 'On overdue items' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Workflow Automations</CardTitle>
        <CardDescription>Enable or disable platform automations and triggers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y">
        {automations.map(a => (
          <div key={a.name} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">{a.name}</p>
              <p className="text-xs text-muted-foreground">Trigger: {a.trigger}</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch defaultChecked={a.enabled} onCheckedChange={v => toast.success(`${a.name} ${v ? 'enabled' : 'disabled'}`)} />
              <Button size="sm" variant="ghost" onClick={() => toast.info(`Configure ${a.name}`)}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function IntegrationsSection() {
  const integrations = [
    { name: 'ACH / Banking', status: 'connected', provider: 'Internal' },
    { name: 'Tax Engine', status: 'connected', provider: 'Internal' },
    { name: 'Workers\' Comp', status: 'not_connected', provider: '—' },
    { name: 'Benefits Administration', status: 'not_connected', provider: '—' },
    { name: 'Time Tracking', status: 'not_connected', provider: '—' },
    { name: 'Accounting / GL', status: 'not_connected', provider: '—' },
    { name: 'Email / Notifications', status: 'connected', provider: 'Internal' },
    { name: 'SSO / Identity Provider', status: 'not_connected', provider: '—' },
    { name: 'Document Storage', status: 'connected', provider: 'Internal' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Integrations & Connectivity</CardTitle>
        <CardDescription>Manage external system connections.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y">
        {integrations.map(i => (
          <div key={i.name} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">{i.name}</p>
              <p className="text-xs text-muted-foreground">Provider: {i.provider}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={i.status === 'connected' ? 'default' : 'secondary'} className="text-xs">
                {i.status === 'connected' ? 'Connected' : 'Not Connected'}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => toast.info(`${i.status === 'connected' ? 'Manage' : 'Connect'} ${i.name}`)}>
                {i.status === 'connected' ? 'Manage' : 'Connect'}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function NotificationsSection() {
  const templates = [
    'Employee Onboarding Invite',
    'Payroll Approval Reminder',
    'Invoice Generated',
    'Failed Payment Notice',
    'Compliance Expiry Reminder',
    'Off-Cycle Payroll Notification',
    'Admin Alert',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notifications & Templates</CardTitle>
        <CardDescription>Manage email templates and notification routing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 divide-y">
        {templates.map(t => (
          <div key={t} className="flex items-center justify-between py-3">
            <p className="text-sm font-medium">{t}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toast.info(`Preview: ${t}`)}>Preview</Button>
              <Button size="sm" variant="ghost" onClick={() => toast.info(`Edit: ${t}`)}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AuditSection({ logs }: { logs: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Audit & Change History</CardTitle>
        <CardDescription>Full history of all enterprise setting changes.</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? <p className="text-sm text-muted-foreground">No audit records yet.</p> : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="text-xs border-l-2 border-muted pl-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{log.setting_key}</span>
                    <Badge variant="outline" className="text-xs">{log.scope}</Badge>
                  </div>
                  {log.old_value != null && <p className="text-muted-foreground">Old: <span className="font-mono">{JSON.stringify(log.old_value)}</span></p>}
                  <p className="text-muted-foreground">New: <span className="font-mono">{JSON.stringify(log.new_value)}</span></p>
                  <p className="text-muted-foreground">{log.changed_by_email ?? 'system'} · {new Date(log.created_at).toLocaleString()}</p>
                  {log.reason && <p className="text-muted-foreground italic">Reason: {log.reason}</p>}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Settings Page ───
export default function SettingsPage() {
  const { data: settings = [] } = useEnterpriseSettings();
  const { data: companies = [] } = useCompanies();
  const { data: auditLogs = [] } = useSettingAuditLogs();

  const overrideCount = 0; // Would need aggregate query
  const thisMonthChanges = auditLogs.filter(l => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const holdCompanies = companies.filter(c => c.status === 'suspended' || c.status === 'terminated').length;

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Platform configuration and client management" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in-up stagger-1">
        <StatCard title="Enterprise Settings" value={String(ENTERPRISE_SETTING_DEFS.length)} icon={SettingsIcon} />
        <StatCard title="Changes This Month" value={String(thisMonthChanges)} icon={History} />
        <StatCard title="Active Clients" value={String(companies.filter(c => c.status === 'active').length)} icon={Building2} />
        <StatCard title="Clients on Hold" value={String(holdCompanies)} icon={AlertTriangle} />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="enterprise" className="animate-in-up stagger-2">
        <TabsList>
          <TabsTrigger value="enterprise">Enterprise Settings</TabsTrigger>
          <TabsTrigger value="client">Client Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="enterprise" className="mt-4">
          <EnterpriseSettingsTab />
        </TabsContent>

        <TabsContent value="client" className="mt-4">
          <ClientSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
