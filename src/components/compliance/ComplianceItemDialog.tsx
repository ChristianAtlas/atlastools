import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateComplianceItem } from '@/hooks/useCompliance';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'enterprise' | 'client' | 'employee';
  entityId?: string;
  companyId?: string;
  categories: string[];
}

export function ComplianceItemDialog({ open, onOpenChange, entityType, entityId, companyId, categories }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [description, setDescription] = useState('');
  const [blocker, setBlocker] = useState(false);

  const create = useCreateComplianceItem();

  const handleSubmit = () => {
    if (!title.trim() || !category) return;
    create.mutate({
      title: title.trim(),
      entity_type: entityType,
      entity_id: entityId || 'atlasone',
      company_id: companyId || null,
      category,
      priority,
      due_date: dueDate || null,
      state_code: stateCode || null,
      description: description || null,
      blocker,
      status: 'pending',
      risk_level: priority === 'critical' ? 'critical' : priority === 'high' ? 'high' : 'low',
      compliance_score: 0,
    } as any, {
      onSuccess: () => {
        onOpenChange(false);
        setTitle(''); setCategory(''); setDueDate(''); setStateCode(''); setDescription('');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Compliance Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., PEO License Renewal — Florida" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={stateCode} onChange={e => setStateCode(e.target.value.toUpperCase())} maxLength={2} placeholder="TX" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={blocker} onChange={e => setBlocker(e.target.checked)} className="rounded" />
            Blocks payroll until resolved
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !category || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
