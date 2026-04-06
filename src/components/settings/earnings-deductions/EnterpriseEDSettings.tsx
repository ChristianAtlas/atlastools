import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign, MinusCircle, FolderOpen, Sparkles, History,
  Search, Plus, Filter, ChevronDown, CheckCircle2, XCircle, Archive,
  Loader2,
} from 'lucide-react';
import {
  useEDTypes, useEDCategories, useUpdateEDType, useArchiveEDType, useBulkUpdateEDTypes,
  type EarningDeductionType,
} from '@/hooks/useEarningsDeductions';
import { useSettingAuditLogs } from '@/hooks/useSettings';
import { EDTypesTable } from './EDTypesTable';
import { EDTypeDrawer } from './EDTypeDrawer';

export function EnterpriseEDSettings() {
  const { data: types = [], isLoading } = useEDTypes();
  const { data: categories = [] } = useEDCategories();
  const { data: auditLogs = [] } = useSettingAuditLogs();
  const updateType = useUpdateEDType();
  const archiveType = useArchiveEDType();
  const bulkUpdate = useBulkUpdateEDTypes();

  const [activeTab, setActiveTab] = useState('earnings');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingType, setEditingType] = useState<EarningDeductionType | null>(null);
  const [drawerMode, setDrawerMode] = useState<'earning' | 'deduction'>('earning');

  const earnings = useMemo(() => types.filter(t => t.category === 'earning'), [types]);
  const deductions = useMemo(() => types.filter(t => t.category === 'deduction'), [types]);
  const earningCategories = useMemo(() => categories.filter(c => c.type === 'earning'), [categories]);
  const deductionCategories = useMemo(() => categories.filter(c => c.type === 'deduction'), [categories]);

  const currentItems = activeTab === 'earnings' ? earnings : deductions;
  const currentCategories = activeTab === 'earnings' ? earningCategories : deductionCategories;

  const filtered = useMemo(() => {
    return currentItems.filter(item => {
      if (search) {
        const s = search.toLowerCase();
        if (!item.name.toLowerCase().includes(s) && !item.code.toLowerCase().includes(s) && !(item.description ?? '').toLowerCase().includes(s)) return false;
      }
      if (categoryFilter !== 'all' && item.category_id !== categoryFilter) return false;
      if (statusFilter === 'active' && !item.is_active) return false;
      if (statusFilter === 'inactive' && item.is_active) return false;
      if (scopeFilter === 'standard' && !item.is_default) return false;
      if (scopeFilter === 'custom' && item.is_default) return false;
      return true;
    });
  }, [currentItems, search, categoryFilter, statusFilter, scopeFilter]);

  const activeCount = currentItems.filter(i => i.is_active).length;
  const standardCount = currentItems.filter(i => i.is_default).length;
  const customCount = currentItems.filter(i => !i.is_default).length;

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (ids: string[]) => {
    setSelectedIds(new Set(ids));
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

  const handleClone = (item: EarningDeductionType) => {
    const cloned = { ...item, id: undefined as any, name: `${item.name} (Copy)`, code: `${item.code}_COPY`, is_default: false };
    setEditingType(cloned as any);
    setDrawerMode(item.category as 'earning' | 'deduction');
    setDrawerOpen(true);
  };

  const handleToggleActive = (item: EarningDeductionType) => {
    updateType.mutate({ id: item.id, is_active: !item.is_active });
  };

  const handleArchive = (item: EarningDeductionType) => {
    archiveType.mutate(item.id);
  };

  const handleBulkAction = (action: 'enable' | 'disable' | 'archive') => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (action === 'enable') bulkUpdate.mutate({ ids, updates: { is_active: true } });
    else if (action === 'disable') bulkUpdate.mutate({ ids, updates: { is_active: false } });
    else if (action === 'archive') ids.forEach(id => archiveType.mutate(id));
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Earnings & Deductions Library
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the master library of earning and deduction types available across all clients. Changes here affect the enterprise defaults.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Types</p>
            <p className="text-2xl font-bold mt-1">{types.length}</p>
            <p className="text-xs text-muted-foreground">{earnings.length} earnings · {deductions.length} deductions</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Active</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{types.filter(t => t.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Available for payroll</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Atlas Standard</p>
            <p className="text-2xl font-bold mt-1">{types.filter(t => t.is_default).length}</p>
            <p className="text-xs text-muted-foreground">System-provided types</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Categories</p>
            <p className="text-2xl font-bold mt-1">{categories.length}</p>
            <p className="text-xs text-muted-foreground">{earningCategories.length} earning · {deductionCategories.length} deduction</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setSelectedIds(new Set()); setCategoryFilter('all'); }}>
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
            <TabsTrigger value="categories" className="gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              Audit Log
            </TabsTrigger>
          </TabsList>
          {(activeTab === 'earnings' || activeTab === 'deductions') && (
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add {activeTab === 'earnings' ? 'Earning' : 'Deduction'} Type
            </Button>
          )}
        </div>

        {/* Earnings / Deductions content */}
        {['earnings', 'deductions'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
            {/* Filters bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {currentCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Scope" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scopes</SelectItem>
                  <SelectItem value="standard">Atlas Standard</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {selectedIds.size > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      Bulk Actions ({selectedIds.size})
                      <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkAction('enable')}>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> Enable Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('disable')}>
                      <XCircle className="h-4 w-4 mr-2 text-amber-500" /> Disable Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('archive')} className="text-destructive">
                      <Archive className="h-4 w-4 mr-2" /> Archive Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <EDTypesTable
                items={filtered}
                categories={currentCategories}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onEdit={openEdit}
                onToggleActive={handleToggleActive}
                onArchive={handleArchive}
                onClone={handleClone}
              />
            )}
          </TabsContent>
        ))}

        {/* Categories tab */}
        <TabsContent value="categories" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Earning Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 divide-y">
                {earningCategories.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {earnings.filter(e => e.category_id === c.id).length} types
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MinusCircle className="h-4 w-4" /> Deduction Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 divide-y">
                {deductionCategories.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {deductions.filter(d => d.category_id === c.id).length} types
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit log tab */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change History</CardTitle>
              <CardDescription>All modifications to earning and deduction types.</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No changes recorded yet.</p>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {auditLogs.filter(l => l.setting_key?.startsWith?.('ed_') || l.scope === 'earning_deduction').slice(0, 50).map(log => (
                      <div key={log.id} className="text-xs border-l-2 border-muted pl-3 py-1.5">
                        <span className="font-medium">{log.setting_key}</span>
                        <span className="text-muted-foreground"> by {log.changed_by_email ?? 'system'}</span>
                        <span className="text-muted-foreground block">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Drawer */}
      <EDTypeDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editType={editingType}
        mode={drawerMode}
        categories={categories}
      />
    </div>
  );
}
