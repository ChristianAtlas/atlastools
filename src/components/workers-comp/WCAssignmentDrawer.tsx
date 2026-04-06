import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateWCAssignment, useWCAssignments, WCCode } from '@/hooks/useWorkersComp';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  codes: WCCode[];
}

export function WCAssignmentDrawer({ open, onOpenChange, companyId, codes }: Props) {
  const { data: employees = [] } = useEmployees(companyId);
  const { data: existing = [] } = useWCAssignments(companyId);
  const create = useCreateWCAssignment();

  const [selectedEmps, setSelectedEmps] = useState<string[]>([]);
  const [wcCodeId, setWcCodeId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  const activeEmps = employees.filter(e => e.status === 'active');
  const assignedIds = new Set(existing.filter(a => a.is_active).map(a => a.employee_id));
  const unassignedEmps = activeEmps.filter(e => !assignedIds.has(e.id));
  const activeCodes = codes.filter(c => c.is_active);

  const toggleEmp = (id: string) => {
    setSelectedEmps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!wcCodeId || selectedEmps.length === 0) {
      toast.error('Select at least one employee and a WC code');
      return;
    }
    try {
      for (const empId of selectedEmps) {
        await create.mutateAsync({
          employee_id: empId,
          company_id: companyId,
          wc_code_id: wcCodeId,
          effective_date: effectiveDate,
        });
      }
      toast.success(`${selectedEmps.length} employee(s) assigned`);
      setSelectedEmps([]);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Assign WC Code to Employees</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          <div>
            <Label>WC Code *</Label>
            <Select value={wcCodeId} onValueChange={setWcCodeId}>
              <SelectTrigger><SelectValue placeholder="Select class code" /></SelectTrigger>
              <SelectContent>
                {activeCodes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.code} — {c.description} ({c.state})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Effective Date</Label>
            <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Select Employees</Label>
              {unassignedEmps.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setSelectedEmps(unassignedEmps.map(e => e.id))}>
                  Select All Unassigned
                </Button>
              )}
            </div>
            <div className="border rounded-lg max-h-64 overflow-y-auto divide-y">
              {unassignedEmps.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">All active employees are assigned</p>
              ) : unassignedEmps.map(emp => (
                <label key={emp.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer">
                  <Checkbox checked={selectedEmps.includes(emp.id)} onCheckedChange={() => toggleEmp(emp.id)} />
                  <div>
                    <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-muted-foreground">{emp.title || 'No title'}</p>
                  </div>
                </label>
              ))}
            </div>
            {selectedEmps.length > 0 && (
              <p className="text-xs text-primary mt-2">{selectedEmps.length} employee(s) selected</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleSave} disabled={create.isPending}>
              Assign {selectedEmps.length > 0 ? `(${selectedEmps.length})` : ''}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
