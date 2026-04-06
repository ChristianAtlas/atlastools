import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Edit2, Archive, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import type { EarningDeductionType, EarningDeductionCategory } from '@/hooks/useEarningsDeductions';
import { CALCULATION_METHODS, PAY_BEHAVIORS } from '@/hooks/useEarningsDeductions';

interface Props {
  items: EarningDeductionType[];
  categories: EarningDeductionCategory[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onEdit: (item: EarningDeductionType) => void;
  onToggleActive: (item: EarningDeductionType) => void;
  onArchive: (item: EarningDeductionType) => void;
  onClone?: (item: EarningDeductionType) => void;
  isClientView?: boolean;
}

function getScopeBadge(item: EarningDeductionType) {
  if (item.is_default) return <Badge variant="outline" className="text-[10px] px-1.5 bg-blue-50 text-blue-700 border-blue-200">Atlas Standard</Badge>;
  if (item.scope === 'enterprise_custom') return <Badge variant="outline" className="text-[10px] px-1.5 bg-purple-50 text-purple-700 border-purple-200">Enterprise Custom</Badge>;
  if (item.scope === 'client_custom') return <Badge variant="outline" className="text-[10px] px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">Client Custom</Badge>;
  return <Badge variant="outline" className="text-[10px] px-1.5">Standard</Badge>;
}

function getMethodLabel(method: string | null) {
  return CALCULATION_METHODS.find(m => m.value === method)?.label ?? method ?? '—';
}

function getTaxSummary(item: EarningDeductionType) {
  if (item.category === 'deduction') {
    const treatment = item.tax_treatment;
    if (treatment === 'pre_tax') return <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Pre-Tax</Badge>;
    if (treatment === 'post_tax') return <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-700 border-gray-200">Post-Tax</Badge>;
    if (treatment === 'garnishment') return <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">Garnishment</Badge>;
    if (treatment === 'retirement') return <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">Retirement</Badge>;
    return <Badge variant="outline" className="text-[10px]">—</Badge>;
  }
  const taxed = [item.tax_federal_income, item.tax_social_security, item.tax_medicare, item.tax_futa, item.tax_state_income, item.tax_state_unemployment, item.tax_local];
  const taxCount = taxed.filter(Boolean).length;
  if (taxCount === 7) return <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Fully Taxable</Badge>;
  if (taxCount === 0) return <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Non-Taxable</Badge>;
  return <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">Partial ({taxCount}/7)</Badge>;
}

function getReportingSummary(item: EarningDeductionType) {
  const parts: string[] = [];
  if (item.reporting_w2_box) parts.push(`W-2 ${item.reporting_w2_box}`);
  if (item.reporting_1099_type) parts.push(item.reporting_1099_type);
  if (item.reporting_box14_literal) parts.push(`Box 14: ${item.reporting_box14_literal}`);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function EDTypesTable({ items, categories, selectedIds, onToggleSelect, onSelectAll, onEdit, onToggleActive, onArchive, onClone, isClientView }: Props) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const isEarning = items[0]?.category === 'earning';

  // Group by category
  const catMap = new Map<string, EarningDeductionCategory>();
  categories.forEach(c => catMap.set(c.id, c));

  const groups: { category: EarningDeductionCategory | null; items: EarningDeductionType[] }[] = [];
  const groupMap = new Map<string, EarningDeductionType[]>();
  const uncategorized: EarningDeductionType[] = [];

  items.forEach(item => {
    if (item.category_id && catMap.has(item.category_id)) {
      const existing = groupMap.get(item.category_id) ?? [];
      existing.push(item);
      groupMap.set(item.category_id, existing);
    } else {
      uncategorized.push(item);
    }
  });

  // Sort by category display_order
  const sortedCatIds = [...groupMap.keys()].sort((a, b) => {
    const ca = catMap.get(a);
    const cb = catMap.get(b);
    return (ca?.display_order ?? 0) - (cb?.display_order ?? 0);
  });

  sortedCatIds.forEach(catId => {
    groups.push({ category: catMap.get(catId) ?? null, items: groupMap.get(catId)! });
  });

  if (uncategorized.length > 0) {
    groups.push({ category: null, items: uncategorized });
  }

  const allIds = items.map(i => i.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">No {isEarning ? 'earning' : 'deduction'} types found matching your filters.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={() => onSelectAll(allSelected ? [] : allIds)} />
              </TableHead>
              <TableHead className="min-w-[200px]">Name</TableHead>
              <TableHead className="w-24">Code</TableHead>
              <TableHead className="w-32">Method</TableHead>
              <TableHead className="w-28">Tax</TableHead>
              <TableHead className="w-40">Reporting</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group, gi) => {
              const catId = group.category?.id ?? 'uncategorized';
              const isCollapsed = collapsedCategories.has(catId);
              return (
                <>{/* Category header */}
                  <TableRow key={`cat-${gi}`} className="bg-muted/20 hover:bg-muted/30 cursor-pointer" onClick={() => toggleCategory(catId)}>
                    <TableCell colSpan={8} className="py-2">
                      <div className="flex items-center gap-2">
                        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.category?.name ?? 'Other'}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5">{group.items.length}</Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                  {!isCollapsed && group.items.map(item => (
                    <TableRow key={item.id} className={`${!item.is_active ? 'opacity-50' : ''} group`}>
                      <TableCell>
                        <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => onToggleSelect(item.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[240px]">{item.description}</p>
                            )}
                          </div>
                          {getScopeBadge(item)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{item.code}</code>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{getMethodLabel(item.calculation_method)}</span>
                      </TableCell>
                      <TableCell>{getTaxSummary(item)}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{getReportingSummary(item)}</span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => onToggleActive(item)}
                          disabled={isClientView && !item.company_id}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(item)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          {onClone && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onClone(item)}>
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Clone</TooltipContent>
                            </Tooltip>
                          )}
                          {!item.is_default && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onArchive(item)}>
                                  <Archive className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Archive</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
