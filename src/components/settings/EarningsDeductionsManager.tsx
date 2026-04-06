import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Edit2, DollarSign, MinusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface EarningDeductionType {
  id: string;
  name: string;
  code: string;
  category: 'earning' | 'deduction';
  subcategory: string;
  is_default: boolean;
  is_active: boolean;
  taxable: boolean;
  company_id: string | null;
  sort_order: number;
  description: string | null;
  created_at: string;
}

const EARNING_SUBCATEGORIES = [
  { value: 'regular', label: 'Regular' },
  { value: 'supplemental', label: 'Supplemental' },
  { value: 'non_taxable', label: 'Non-Taxable' },
  { value: 'other', label: 'Other' },
];

const DEDUCTION_SUBCATEGORIES = [
  { value: 'tax', label: 'Tax' },
  { value: 'pre_tax', label: 'Pre-Tax' },
  { value: 'post_tax', label: 'Post-Tax' },
  { value: 'employer', label: 'Employer-Paid' },
  { value: 'other', label: 'Other' },
];

function useEarningDeductionTypes(companyId?: string | null) {
  return useQuery({
    queryKey: ['earning_deduction_types', companyId ?? 'enterprise'],
    queryFn: async () => {
      let query = supabase
        .from('earning_deduction_types')
        .select('*')
        .order('category')
        .order('sort_order');

      if (companyId) {
        // For client view: show enterprise defaults + client-specific
        query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
      } else {
        // Enterprise view: only enterprise-level (no company_id)
        query = query.is('company_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as EarningDeductionType[];
    },
  });
}

function useCreateType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<EarningDeductionType>) => {
      const { data, error } = await supabase
        .from('earning_deduction_types')
        .insert(body as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['earning_deduction_types'] });
      toast.success('Type added');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

function useUpdateType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EarningDeductionType> & { id: string }) => {
      const { error } = await supabase
        .from('earning_deduction_types')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['earning_deduction_types'] });
      toast.success('Type updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

function useDeleteType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('earning_deduction_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['earning_deduction_types'] });
      toast.success('Type removed');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

interface Props {
  companyId?: string | null;
  companyName?: string;
}

export function EarningsDeductionsManager({ companyId, companyName }: Props) {
  const { data: types = [], isLoading } = useEarningDeductionTypes(companyId);
  const createType = useCreateType();
  const updateType = useUpdateType();
  const deleteType = useDeleteType();

  const [activeTab, setActiveTab] = useState<'earning' | 'deduction'>('earning');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<EarningDeductionType | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formSubcategory, setFormSubcategory] = useState('other');
  const [formTaxable, setFormTaxable] = useState(true);
  const [formDescription, setFormDescription] = useState('');

  const filtered = types.filter(t => t.category === activeTab);
  const earnings = types.filter(t => t.category === 'earning');
  const deductions = types.filter(t => t.category === 'deduction');

  const openCreate = () => {
    setEditingType(null);
    setFormName('');
    setFormCode('');
    setFormSubcategory('other');
    setFormTaxable(activeTab === 'earning');
    setFormDescription('');
    setDialogOpen(true);
  };

  const openEdit = (t: EarningDeductionType) => {
    setEditingType(t);
    setFormName(t.name);
    setFormCode(t.code);
    setFormSubcategory(t.subcategory);
    setFormTaxable(t.taxable);
    setFormDescription(t.description ?? '');
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim() || !formCode.trim()) {
      toast.error('Name and code are required');
      return;
    }

    const payload = {
      name: formName.trim(),
      code: formCode.trim().toLowerCase().replace(/\s+/g, '_'),
      category: activeTab,
      subcategory: formSubcategory,
      taxable: formTaxable,
      description: formDescription.trim() || null,
      company_id: companyId || null,
      is_default: false,
      sort_order: filtered.length + 1,
    };

    if (editingType) {
      updateType.mutate({ id: editingType.id, ...payload });
    } else {
      createType.mutate(payload);
    }
    setDialogOpen(false);
  };

  const handleToggleActive = (t: EarningDeductionType) => {
    updateType.mutate({ id: t.id, is_active: !t.is_active });
  };

  const handleDelete = (t: EarningDeductionType) => {
    if (t.is_default) {
      toast.error('Cannot delete system default types. You can deactivate them instead.');
      return;
    }
    deleteType.mutate(t.id);
  };

  const subcategories = activeTab === 'earning' ? EARNING_SUBCATEGORIES : DEDUCTION_SUBCATEGORIES;

  const scopeLabel = companyId ? companyName || 'Client' : 'Enterprise';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Earnings & Deductions Types
        </CardTitle>
        <CardDescription>
          Manage {scopeLabel}-level earning and deduction types used in payroll processing.
          {companyId && ' Client-specific types supplement the enterprise defaults.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'earning' | 'deduction')}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="earning" className="gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Earnings ({earnings.filter(e => e.is_active).length})
              </TabsTrigger>
              <TabsTrigger value="deduction" className="gap-1.5">
                <MinusCircle className="h-3.5 w-3.5" />
                Deductions ({deductions.filter(d => d.is_active).length})
              </TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Custom {activeTab === 'earning' ? 'Earning' : 'Deduction'}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <TabsContent value="earning" className="mt-0">
                <TypesList
                  items={earnings}
                  companyId={companyId}
                  onToggle={handleToggleActive}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </TabsContent>
              <TabsContent value="deduction" className="mt-0">
                <TypesList
                  items={deductions}
                  companyId={companyId}
                  onToggle={handleToggleActive}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit' : 'Add Custom'} {activeTab === 'earning' ? 'Earning' : 'Deduction'} Type
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Shift Differential" />
              </div>
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  placeholder="e.g. shift_differential"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Select value={formSubcategory} onValueChange={setFormSubcategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subcategories.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={formTaxable} onCheckedChange={setFormTaxable} id="taxable" />
                <Label htmlFor="taxable">Taxable</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Brief description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createType.isPending || updateType.isPending}>
              {editingType ? 'Save Changes' : 'Add Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TypesList({
  items,
  companyId,
  onToggle,
  onEdit,
  onDelete,
}: {
  items: EarningDeductionType[];
  companyId?: string | null;
  onToggle: (t: EarningDeductionType) => void;
  onEdit: (t: EarningDeductionType) => void;
  onDelete: (t: EarningDeductionType) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No types configured.</p>;
  }

  // Group by subcategory
  const groups: Record<string, EarningDeductionType[]> = {};
  items.forEach(item => {
    const key = item.subcategory;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([subcat, groupItems]) => (
        <div key={subcat}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {subcat.replace(/_/g, ' ')}
          </p>
          <div className="rounded-lg border divide-y">
            {groupItems.map(item => {
              const isClientCustom = !!item.company_id;
              const isEnterprise = !item.company_id;
              return (
                <div key={item.id} className={`flex items-center justify-between px-4 py-2.5 ${!item.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.is_default && (
                          <Badge variant="outline" className="text-[10px] px-1.5">System</Badge>
                        )}
                        {isClientCustom && (
                          <Badge variant="secondary" className="text-[10px] px-1.5">Client Custom</Badge>
                        )}
                        {companyId && isEnterprise && (
                          <Badge variant="outline" className="text-[10px] px-1.5">Enterprise</Badge>
                        )}
                        {item.taxable && item.category === 'earning' && (
                          <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground">Taxable</Badge>
                        )}
                        {!item.taxable && item.category === 'earning' && (
                          <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground">Non-Taxable</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => onToggle(item)}
                      disabled={companyId ? isEnterprise : false}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(item)}
                      disabled={companyId ? isEnterprise && item.is_default : false}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    {!item.is_default && (!companyId || isClientCustom) && (
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(item)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
