import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Clock, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkflowStepper, type WorkflowStep } from '@/components/onboarding/WorkflowStepper';
import { useOnboardingSessions, useOnboardingTemplates, useCreateOnboardingSession } from '@/hooks/useOnboarding';
import { employees, companies } from '@/lib/mock-data';

const sessionStatusMap: Record<string, 'pending' | 'in_progress' | 'completed' | 'active'> = {
  not_started: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'pending',
};

function getWorkflowSteps(status: string): WorkflowStep[] {
  const states = ['not_started', 'in_progress', 'completed'];
  const labels = ['Not Started', 'In Progress', 'Complete'];
  const currentIdx = states.indexOf(status);

  return states.map((s, i) => ({
    id: s,
    label: labels[i],
    status: i < currentIdx ? 'completed' as const : i === currentIdx ? (s === 'completed' ? 'completed' as const : 'in_progress' as const) : 'pending' as const,
  }));
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { data: sessions = [], isLoading } = useOnboardingSessions();
  const { data: templates = [] } = useOnboardingTemplates();
  const createSession = useCreateOnboardingSession();

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const onboardingEmployees = employees.filter(e => e.status === 'onboarding');

  const stats = {
    total: sessions.length,
    inProgress: sessions.filter(s => s.status === 'in_progress').length,
    completed: sessions.filter(s => s.status === 'completed').length,
    notStarted: sessions.filter(s => s.status === 'not_started').length,
  };

  const handleCreate = () => {
    if (!selectedEmployee || !selectedTemplate) return;
    const emp = employees.find(e => e.id === selectedEmployee);
    createSession.mutate({
      employeeId: selectedEmployee,
      companyId: emp?.companyId || '',
      templateId: selectedTemplate,
      dueDate: dueDate || undefined,
    }, {
      onSuccess: () => {
        setShowNewDialog(false);
        setSelectedEmployee('');
        setSelectedTemplate('');
        setDueDate('');
      },
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employee Onboarding"
        description="Track and manage new hire onboarding workflows"
        actions={
          <Button size="sm" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Start Onboarding
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in-up stagger-1">
        <StatCard title="Total Sessions" value={String(stats.total)} icon={Users} />
        <StatCard title="In Progress" value={String(stats.inProgress)} icon={Clock} changeType="positive" />
        <StatCard title="Completed" value={String(stats.completed)} icon={CheckCircle2} />
        <StatCard title="Not Started" value={String(stats.notStarted)} icon={AlertCircle} />
      </div>

      {/* Active onboarding employees from mock data */}
      {onboardingEmployees.length > 0 && (
        <Card className="animate-in-up stagger-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Employees Pending Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {onboardingEmployees.map(emp => {
                const hasSession = sessions.some(s => s.employee_id === emp.id);
                return (
                  <div key={emp.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {emp.avatarInitials}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground">{emp.companyName} · {emp.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status="onboarding" />
                      {!hasSession && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedEmployee(emp.id);
                            setShowNewDialog(true);
                          }}
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions list */}
      <Card className="animate-in-up stagger-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Onboarding Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center">
              <UserPlus className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No onboarding sessions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start an onboarding workflow for a new hire</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => {
                const emp = employees.find(e => e.id === session.employee_id);
                const company = companies.find(c => c.id === session.company_id);

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/onboarding/${session.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {emp?.avatarInitials || '??'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {emp ? `${emp.firstName} ${emp.lastName}` : session.employee_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {company?.name || session.company_id}
                          {session.due_date && ` · Due ${new Date(session.due_date).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <WorkflowStepper steps={getWorkflowSteps(session.status)} />
                      <StatusBadge status={sessionStatusMap[session.status] || 'pending'} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New session dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Employee Onboarding</DialogTitle>
            <DialogDescription>Select an employee and template to begin the onboarding workflow.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'onboarding').map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} — {emp.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Onboarding Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Completion Date (optional)</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!selectedEmployee || !selectedTemplate || createSession.isPending}>
              {createSession.isPending ? 'Creating...' : 'Start Onboarding'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
