import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Clock, AlertCircle, ChevronDown, ChevronRight, User, Shield, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface OnboardingTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  assigned_role: string;
  status: string;
  is_required: boolean;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  sort_order: number;
}

interface OnboardingChecklistProps {
  tasks: OnboardingTask[];
  onTaskAction?: (taskId: string, action: 'complete' | 'skip' | 'reset') => void;
  currentRole?: string;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  personal_info: 'Personal Information',
  documents: 'Documents',
  compliance: 'Compliance & Verification',
  tax: 'Tax Forms',
  payroll: 'Payroll Setup',
  benefits: 'Benefits Enrollment',
  review: 'Review & Approval',
  general: 'General',
};

const roleIcons: Record<string, typeof User> = {
  employee: User,
  client_admin: Building2,
  super_admin: Shield,
};

const roleLabels: Record<string, string> = {
  employee: 'Employee',
  client_admin: 'Client Admin',
  super_admin: 'AtlasOne Admin',
};

export function OnboardingChecklist({ tasks, onTaskAction, currentRole = 'super_admin', className }: OnboardingChecklistProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(
    [...new Set(tasks.map(t => t.category))]
  ));

  const categories = [...new Set(tasks.map(t => t.category))];
  const grouped = categories.map(cat => ({
    category: cat,
    tasks: tasks.filter(t => t.category === cat).sort((a, b) => a.sort_order - b.sort_order),
  }));

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const requiredCount = tasks.filter(t => t.is_required).length;
  const requiredCompleted = tasks.filter(t => t.is_required && t.status === 'completed').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {completedCount} of {tasks.length} tasks complete
          {requiredCount !== tasks.length && (
            <span className="ml-1">({requiredCompleted}/{requiredCount} required)</span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-success transition-all duration-500"
              style={{ width: `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums">
            {tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Category groups */}
      {grouped.map(({ category, tasks: catTasks }) => {
        const catCompleted = catTasks.filter(t => t.status === 'completed').length;
        const isExpanded = expandedCategories.has(category);

        return (
          <div key={category} className="rounded-lg border bg-card overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <span>{categoryLabels[category] || category}</span>
              </div>
              <Badge variant={catCompleted === catTasks.length ? 'default' : 'secondary'} className="text-[11px]">
                {catCompleted}/{catTasks.length}
              </Badge>
            </button>

            {isExpanded && (
              <div className="border-t divide-y">
                {catTasks.map(task => {
                  const RoleIcon = roleIcons[task.assigned_role] || User;
                  const canAct = currentRole === 'super_admin' || task.assigned_role === currentRole;

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 transition-colors',
                        task.status === 'completed' && 'bg-success/5'
                      )}
                    >
                      {/* Status icon */}
                      <div className="mt-0.5">
                        {task.status === 'completed' ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground">
                            <Check className="h-3 w-3" />
                          </div>
                        ) : task.status === 'in_progress' ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
                            <Clock className="h-3 w-3 text-primary" />
                          </div>
                        ) : task.status === 'blocked' ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-destructive bg-destructive/10">
                            <AlertCircle className="h-3 w-3 text-destructive" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-sm font-medium',
                            task.status === 'completed' && 'line-through text-muted-foreground'
                          )}>
                            {task.title}
                          </span>
                          {task.is_required && (
                            <span className="text-[10px] font-semibold text-destructive">REQUIRED</span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <RoleIcon className="h-3 w-3" />
                            <span>{roleLabels[task.assigned_role] || task.assigned_role}</span>
                          </div>
                          {task.completed_at && (
                            <span className="text-[11px] text-muted-foreground">
                              Completed {new Date(task.completed_at).toLocaleDateString()}
                              {task.completed_by && ` by ${task.completed_by}`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {canAct && onTaskAction && task.status !== 'completed' && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => onTaskAction(task.id, 'complete')}
                          >
                            Mark Done
                          </Button>
                          {!task.is_required && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={() => onTaskAction(task.id, 'skip')}
                            >
                              Skip
                            </Button>
                          )}
                        </div>
                      )}
                      {canAct && onTaskAction && task.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => onTaskAction(task.id, 'reset')}
                        >
                          Undo
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
