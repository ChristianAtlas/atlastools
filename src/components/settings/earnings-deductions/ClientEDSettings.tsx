import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign, MinusCircle, Search, Plus, Edit2, Copy, AlertTriangle, Loader2, RotateCcw, Filter,
} from 'lucide-react';
import {
  useEDTypes, useEDCategories, useClientEDOverrides, useUpsertClientEDOverride, useDeleteClientEDOverride,
  useUpdateEDType, useCreateEDType,
  type EarningDeductionType, type ClientEDOverride,
  CALCULATION_METHODS,
} from '@/hooks/useEarningsDeductions';
import { EDTypeDrawer } from './EDTypeDrawer';

interface Props {
  companyId: string;
  companyName?: string;
}

function getScopeBadge(item: EarningDeductionType) {
  if (item.company_id) return <Badge className="text-[10px] px-1.5 bg-emerald-100 text-emerald-700 border-emerald-200">Client Custom</Badge>;
  if (item.is_default) return <Badge variant="outline" className="text-[10px] px-1.5 bg-blue-50 text-blue-700 border-blue-200">Enterprise Default</Badge>;
  return <Badge variant="outline" className="text-[10px] px-1.5 bg-purple-50 text-purple-700 border-purple-200">Enterprise Custom</Badge>;
}

export function ClientEDSettings({ companyId, companyName }: Props) {
  const { data: types = [], isLoading } = useEDTypes(companyId);
  const { data: categories = [] } = useEDCategories();
  const { data: overrides = [] } = useClientEDOverrides(companyId);
  const upsertOverride = useUpsertClientEDOverride();
  const deleteOverride = useDeleteClientEDOverride();
  const updateType = useUpdateEDType();

  const [activeTab, setActiveTab] = useState('earnings');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingType, setEditingType] = useState<EarningDeductionType | null>(null);
  const [drawerMode, setDrawerMode] = useState<'earning' | 'deduction'>('earning');

  const overridesMap = useMemo(() => {
    const m = new Map<string, ClientEDOverride>();
    overrides.forEach(o => m.set(o.earning_deduction_type_id, o));
    return m;
  }, [overrides]);

  const earnings = types.filter(t => t.category === 'earning');
  const deductions = types.filter(t => t.category === 'deduction');
  const currentItems = activeTab === 'earnings' ? earnings : deductions;

  const filtered = useMemo(() => {
    return currentItems.filter(item => {
      if (search) {
        const s = search.toLowerCase();
        if (!item.name.toLowerCase().includes(s) && !item.code.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [currentItems, search]);

  const earningCategories = categories.filter(c => c.type === 'earning');
  const deductionCategories = categories.filter(c => c.type === 'deduction');
  const catMap = new Map(categories.map(c => [c.id, c]));

  // Group by category
  const groupByCategory = (items: EarningDeductionType[]) => {
    const groups = new Map<string, EarningDeductionType[]>();
    items.forEach(item => {
      const key = item.category_id ?? 'uncategorized';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    return groups;
  };

  const isTypeEnabled = (typeId: string) => {
    const override = overridesMap.get(typeId);
    return override ? override.is_enabled : true; // default enabled
  };

  const handleToggleEnabled = (type: EarningDeductionType) => {
    if (type.company_id) {
      // Client custom type - toggle is_active directly
      updateType.mutate({ id: type.id, is_active: !type.is_active });
    } else {
      // Enterprise type - use override
      const override = overridesMap.get(type.id);
      if (override) {
        upsertOverride.mutate({
          company_id: companyId,
          earning_deduction_type_id: type.id,
          is_enabled: !override.is_enabled,
        });
      } else {
        upsertOverride.mutate({
          company_id: companyId,
          earning_deduction_type_id: type.id,
          is_enabled: false,
        });
      }
    }
  };

  const handleRevertOverride = (typeId: string) => {
    const override = overridesMap.get(typeId);
    if (override) {
      deleteOverride.mutate({ id: override.id, companyId });
    }
  };

  const openCreate = () => {
    setEditingType(null);
    setDrawerMode(activeTab === 'earnings' ? 'earning' : 'deduction');
    setDrawerOpen(true);
  };

  const openEdit = (item: EarningDeductionType) => {
    setEditingType(item);
    setDrawerMode(item.category as 'earning' | 'deduction');
    setDrawerOpen(true);
  };

  const clientCustomCount = types.filter(t => !!t.company_id).length;
  const overrideCount = overrides.filter(o => !o.is_enabled).length;

  const groups = groupByCategory(filtered);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Earnings & Deductions — {companyName ?? 'Client'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage which earning and deduction types are enabled for this client. Add client-specific custom types as needed.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Enabled Types</p>
            <p className="text-2xl font-bold mt-1">{types.filter(t => t.company_id ? t.is_active : isTypeEnabled(t.id)).length}</p>
            <p className="text-xs text-muted-foreground">of {types.length} available</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Client Custom</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{clientCustomCount}</p>
            <p className="text-xs text-muted-foreground">Client-specific types</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Overrides</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{overrideCount}</p>
            <p className="text-xs text-muted-foreground">Types disabled from defaults</p>
          </CardContent>
        </Card>
      </div>

      {clientCustomCount > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700">
            This client has {clientCustomCount} custom earning/deduction type(s). Custom types may affect payroll mapping, W-2/1099 reporting, and data exports. Review before processing payroll.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="earnings" className="gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Earnings
              <Badge variant="secondary" className="text-[10px] ml-1 px-1.5">{earnings.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="deductions" className="gap-1.5">
              <MinusCircle className="h-3.5 w-3.5" />
              Deductions
              <Badge variant="secondary" className="text-[10px] ml-1 px-1.5">{deductions.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Custom {activeTab === 'earnings' ? 'Earning' : 'Deduction'}
          </Button>
        </div>

        {['earnings', 'deductions'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search types..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <TooltipProvider>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="min-w-[220px]">Name</TableHead>
                        <TableHead className="w-24">Code</TableHead>
                        <TableHead className="w-32">Source</TableHead>
                        <TableHead className="w-28">Method</TableHead>
                        <TableHead className="w-20">Enabled</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...groups.entries()].sort(([a], [b]) => {
                        const ca = catMap.get(a);
                        const cb = catMap.get(b);
                        return (ca?.display_order ?? 99) - (cb?.display_order ?? 99);
                      }).map(([catId, catItems]) => (
                        <>
                          <TableRow key={`cat-${catId}`} className="bg-muted/20">
                            <TableCell colSpan={6} className="py-2">
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {catMap.get(catId)?.name ?? 'Other'}
                              </span>
                            </TableCell>
                          </TableRow>
                          {catItems.map(item => {
                            const isClient = !!item.company_id;
                            const isEnabled = isClient ? item.is_active : isTypeEnabled(item.id);
                            const hasOverride = !isClient && overridesMap.has(item.id);
                            return (
                              <TableRow key={item.id} className={`${!isEnabled ? 'opacity-50' : ''} group`}>
                                <TableCell>
                                  <div>
                                    <p className="text-sm font-medium">{item.name}</p>
                                    {item.description && <p className="text-xs text-muted-foreground truncate max-w-[240px]">{item.description}</p>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{item.code}</code>
                                </TableCell>
                                <TableCell>{getScopeBadge(item)}</TableCell>
                                <TableCell>
                                  <span className="text-xs text-muted-foreground">
                                    {CALCULATION_METHODS.find(m => m.value === item.calculation_method)?.label ?? '—'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Switch checked={isEnabled} onCheckedChange={() => handleToggleEnabled(item)} />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isClient && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit</TooltipContent>
                                      </Tooltip>
                                    )}
                                    {hasOverride && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleRevertOverride(item.id)}>
                                            <RotateCcw className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Revert to Default</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TooltipProvider>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <EDTypeDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editType={editingType}
        mode={drawerMode}
        categories={categories}
        companyId={companyId}
      />
    </div>
  );
}
