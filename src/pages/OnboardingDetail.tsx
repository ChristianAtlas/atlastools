import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Building2, User, Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkflowStepper, type WorkflowStep } from '@/components/onboarding/WorkflowStepper';
import { OnboardingChecklist, type OnboardingTask } from '@/components/onboarding/OnboardingChecklist';
import { useOnboardingTasks, useUpdateOnboardingTask, useUpdateOnboardingSession, useOnboardingSessions } from '@/hooks/useOnboarding';
import { employees, companies, currentUser } from '@/lib/mock-data';

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

const statusMap: Record<string, 'pending' | 'in_progress' | 'completed' | 'active'> = {
  not_started: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
};

export default function OnboardingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sessions = [] } = useOnboardingSessions();
  const session = sessions.find(s => s.id === id);
  const { data: tasks = [], isLoading } = useOnboardingTasks(id || '');
  const updateTask = useUpdateOnboardingTask();
  const updateSession = useUpdateOnboardingSession();

  if (!session) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" size="sm" onClick={() => navigate('/onboarding')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />Back to Onboarding
        </Button>
        <div className="py-12 text-center text-muted-foreground">Session not found</div>
      </div>
    );
  }

  const emp = employees.find(e => e.id === session.employee_id);
  const company = companies.find(c => c.id === session.company_id);

  const handleTaskAction = (taskId: string, action: 'complete' | 'skip' | 'reset') => {
    const updates = action === 'complete'
      ? { status: 'completed', completed_at: new Date().toISOString(), completed_by: currentUser.name }
      : action === 'skip'
      ? { status: 'skipped' as string, completed_at: null, completed_by: null }
      : { status: 'pending', completed_at: null, completed_by: null };

    updateTask.mutate({ taskId, updates });

    // Auto-update session status
    if (session.status === 'not_started') {
      updateSession.mutate({
        sessionId: session.id,
        updates: { status: 'in_progress', started_at: new Date().toISOString() },
      });
    }
  };

  const allRequiredDone = tasks
    .filter(t => t.is_required)
    .every(t => t.status === 'completed');

  const handleComplete = () => {
    updateSession.mutate({
      sessionId: session.id,
      updates: { status: 'completed', completed_at: new Date().toISOString() },
    });
  };

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('/onboarding')} className="animate-in-up">
        <ArrowLeft className="h-4 w-4 mr-1.5" />Back to Onboarding
      </Button>

      <div className="animate-in-up stagger-1">
        <PageHeader
          title={emp ? `${emp.firstName} ${emp.lastName}` : 'Onboarding'}
          description={emp?.title}
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge status={statusMap[session.status] || 'pending'} />
              {session.status !== 'completed' && allRequiredDone && (
                <Button size="sm" onClick={handleComplete}>
                  Complete Onboarding
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Info bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground animate-in-up stagger-2">
        {company && (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span>{company.name}</span>
          </div>
        )}
        {emp && (
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span>{emp.email}</span>
          </div>
        )}
        {session.due_date && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Due {new Date(session.due_date).toLocaleDateString()}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>Started {new Date(session.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Workflow stepper */}
      <Card className="animate-in-up stagger-2">
        <CardContent className="py-4 flex justify-center">
          <WorkflowStepper steps={getWorkflowSteps(session.status)} />
        </CardContent>
      </Card>

      {/* Checklist */}
      <div className="animate-in-up stagger-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Onboarding Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No tasks found for this session</div>
            ) : (
              <OnboardingChecklist
                tasks={tasks as OnboardingTask[]}
                onTaskAction={handleTaskAction}
                currentRole={currentUser.role}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
