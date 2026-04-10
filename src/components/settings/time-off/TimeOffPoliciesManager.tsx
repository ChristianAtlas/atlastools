import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Plus, Pencil, Trash2, Clock, Briefcase, AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  useTimeOffPolicies,
  useCreateTimeOffPolicy,
  useUpdateTimeOffPolicy,
  useDeleteTimeOffPolicy,
  type TimeOffPolicy,
  type TimeOffPolicyInput,
} from '@/hooks/useTimeOffPolicies';
import { TimeOffPolicyWizard } from './TimeOffPolicyWizard';
import { useAuth } from '@/contexts/AuthContext';

const TYPE_ICONS: Record<string, any> = {
  pto: Clock,
  vacation: Briefcase,
  sick: AlertCircle,
  custom: Calendar,
};

const ACCRUAL_LABELS: Record<string, string> = {
  per_hour_worked: 'Per hour worked',
  per_pay_period: 'Per pay period',
  annual_allowance: 'Annual allowance',
};

interface Props {
  companyId: string;
  companyName?: string;
  readOnly?: boolean;
}

export function TimeOffPoliciesManager({ companyId, companyName, readOnly }: Props) {
  const { user } = useAuth();
  const { data: policies = [], isLoading } = useTimeOffPolicies(companyId);
  const createPolicy = useCreateTimeOffPolicy();
  const updatePolicy = useUpdateTimeOffPolicy();
  const deletePolicy = useDeleteTimeOffPolicy();

  const [showWizard, setShowWizard] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<TimeOffPolicy | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const activePolicies = policies.filter(p => p.is_active);
  const inactivePolicies = policies.filter(p => !p.is_active);

  const handleSave = async (input: TimeOffPolicyInput) => {
    if (editingPolicy) {
      await updatePolicy.mutateAsync({ id: editingPolicy.id, ...input });
    } else {
      await createPolicy.mutateAsync(input);
    }
    setShowWizard(false);
    setEditingPolicy(null);
  };

  const handleEdit = (policy: TimeOffPolicy) => {
    setEditingPolicy(policy);
    setShowWizard(true);
  };

  const handleToggleActive = async (policy: TimeOffPolicy) => {
    await updatePolicy.mutateAsync({ id: policy.id, is_active: !policy.is_active });
  };

  if (showWizard) {
    return (
      <TimeOffPolicyWizard
        companyId={companyId}
        userId={user?.id}
        initial={editingPolicy ?? undefined}
        onSave={handleSave}
        onCancel={() => { setShowWizard(false); setEditingPolicy(null); }}
        isSaving={createPolicy.isPending || updatePolicy.isPending}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Time Off Policies</CardTitle>
              <CardDescription>
                {companyName ? `Manage time off plans for ${companyName}` : 'Configure time off accrual plans'}
              </CardDescription>
            </div>
            {!readOnly && (
              <Button size="sm" onClick={() => setShowWizard(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Plan
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : policies.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No time off policies configured.</p>
              {!readOnly && (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowWizard(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Create your first plan
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activePolicies.map(policy => (
                <PolicyRow
                  key={policy.id}
                  policy={policy}
                  onEdit={() => handleEdit(policy)}
                  onToggle={() => handleToggleActive(policy)}
                  onDelete={() => setDeleteConfirm(policy.id)}
                  readOnly={readOnly}
                />
              ))}
              {inactivePolicies.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs text-muted-foreground font-medium pt-2">Inactive Plans</p>
                  {inactivePolicies.map(policy => (
                    <PolicyRow
                      key={policy.id}
                      policy={policy}
                      onEdit={() => handleEdit(policy)}
                      onToggle={() => handleToggleActive(policy)}
                      onDelete={() => setDeleteConfirm(policy.id)}
                      readOnly={readOnly}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={o => { if (!o) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Time Off Policy</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete this time off policy? This cannot be undone. Consider deactivating it instead.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteConfirm) await deletePolicy.mutateAsync(deleteConfirm);
                setDeleteConfirm(null);
              }}
              disabled={deletePolicy.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PolicyRow({
  policy,
  onEdit,
  onToggle,
  onDelete,
  readOnly,
}: {
  policy: TimeOffPolicy;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  const Icon = TYPE_ICONS[policy.policy_type] || Clock;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{policy.name}</p>
            <Badge variant={policy.is_active ? 'default' : 'secondary'} className="text-xs">
              {policy.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {ACCRUAL_LABELS[policy.accrual_method]} · {policy.accrual_rate} hrs
            {policy.balance_cap_hours != null && ` · Cap: ${policy.balance_cap_hours} hrs`}
            {policy.waiting_period_days > 0 && ` · ${policy.waiting_period_days}d wait`}
          </p>
        </div>
      </div>
      {!readOnly && (
        <div className="flex items-center gap-2 shrink-0">
          <Switch checked={policy.is_active} onCheckedChange={onToggle} />
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
