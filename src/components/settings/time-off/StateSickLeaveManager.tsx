import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Edit2, Save, MapPin, AlertCircle, Loader2, Info } from 'lucide-react';
import {
  useStateSickLeaveRules,
  useUpdateStateSickLeaveRule,
  type StateSickLeaveRule,
} from '@/hooks/useStateSickLeaveRules';

export function StateSickLeaveManager() {
  const { data: rules = [], isLoading } = useStateSickLeaveRules();
  const updateRule = useUpdateStateSickLeaveRule();
  const [search, setSearch] = useState('');
  const [editingRule, setEditingRule] = useState<StateSickLeaveRule | null>(null);

  // Edit form state
  const [editLawName, setEditLawName] = useState('');
  const [editMaxHours, setEditMaxHours] = useState('');
  const [editAccrualRate, setEditAccrualRate] = useState('');
  const [editAccrualPer, setEditAccrualPer] = useState('');
  const [editCarryover, setEditCarryover] = useState(true);
  const [editNotes, setEditNotes] = useState('');

  const filtered = rules.filter(r =>
    !search ||
    r.state_name.toLowerCase().includes(search.toLowerCase()) ||
    r.state_code.toLowerCase().includes(search.toLowerCase()) ||
    r.law_name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = rules.filter(r => r.is_active).length;

  const openEdit = (rule: StateSickLeaveRule) => {
    setEditingRule(rule);
    setEditLawName(rule.law_name);
    setEditMaxHours(rule.max_use_hours_per_year != null ? String(rule.max_use_hours_per_year) : '');
    setEditAccrualRate(String(rule.accrual_rate_hours));
    setEditAccrualPer(String(rule.accrual_per_hours_worked));
    setEditCarryover(rule.carryover_allowed);
    setEditNotes(rule.notes ?? '');
  };

  const handleSave = () => {
    if (!editingRule) return;
    updateRule.mutate({
      id: editingRule.id,
      law_name: editLawName,
      max_use_hours_per_year: editMaxHours ? Number(editMaxHours) : null,
      accrual_rate_hours: Number(editAccrualRate),
      accrual_per_hours_worked: Number(editAccrualPer),
      carryover_allowed: editCarryover,
      notes: editNotes || null,
    }, {
      onSuccess: () => setEditingRule(null),
    });
  };

  const handleToggle = (rule: StateSickLeaveRule) => {
    updateRule.mutate({ id: rule.id, is_active: !rule.is_active });
  };

  const formatAccrual = (rule: StateSickLeaveRule) => {
    if (rule.accrual_per_hours_worked === 1) {
      return `${rule.accrual_rate_hours} hrs per hour worked`;
    }
    return `${rule.accrual_rate_hours} hr per ${rule.accrual_per_hours_worked} hrs worked`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                State Mandatory Sick Leave Laws
              </CardTitle>
              <CardDescription>
                These rules apply automatically to all employees in the listed states across all clients.
                Changes here update accrual rules platform-wide.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {activeCount} of {rules.length} active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Employees are automatically assigned to their state's mandatory sick leave plan.
              A company may override these only if they offer equal or better time off benefits.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by state name, code, or law..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-1">
                {filtered.map(rule => (
                  <div
                    key={rule.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      rule.is_active ? 'hover:bg-muted/30' : 'opacity-60 bg-muted/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{rule.state_code}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{rule.state_name}</p>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'} className="text-xs">
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{rule.law_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatAccrual(rule)}
                          {rule.max_use_hours_per_year != null
                            ? ` · Max: ${rule.max_use_hours_per_year} hrs/yr`
                            : ' · No annual max'}
                          {rule.carryover_allowed && ' · Carryover allowed'}
                        </p>
                        {rule.notes && (
                          <p className="text-xs text-amber-600 mt-0.5">
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            {rule.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggle(rule)}
                      />
                      <Button size="sm" variant="ghost" onClick={() => openEdit(rule)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No matching state rules found.</p>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingRule} onOpenChange={o => { if (!o) setEditingRule(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit {editingRule?.state_name} Sick Leave Rule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Law Name</Label>
              <Input value={editLawName} onChange={e => setEditLawName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Accrual Rate (hours earned)</Label>
                <Input type="number" step="any" value={editAccrualRate} onChange={e => setEditAccrualRate(e.target.value)} />
              </div>
              <div>
                <Label>Per Hours Worked</Label>
                <Input type="number" step="any" value={editAccrualPer} onChange={e => setEditAccrualPer(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Employee earns {editAccrualRate || '?'} hour(s) for every {editAccrualPer || '?'} hours worked.
            </p>
            <div>
              <Label>Max Use Per Year (hours)</Label>
              <Input
                type="number"
                value={editMaxHours}
                onChange={e => setEditMaxHours(e.target.value)}
                placeholder="Leave blank for no limit"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editCarryover} onCheckedChange={setEditCarryover} />
              <Label>Allow carryover of unused hours</Label>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Additional details..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateRule.isPending}>
              <Save className="h-4 w-4 mr-1" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
