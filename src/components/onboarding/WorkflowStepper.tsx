import { cn } from '@/lib/utils';
import { Check, Circle, Loader2 } from 'lucide-react';

export interface WorkflowStep {
  id: string;
  label: string;
  status: 'completed' | 'in_progress' | 'pending' | 'skipped';
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  className?: string;
}

export function WorkflowStepper({ steps, className }: WorkflowStepperProps) {
  return (
    <div className={cn('flex items-center gap-0', className)}>
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                step.status === 'completed' && 'border-success bg-success text-success-foreground',
                step.status === 'in_progress' && 'border-primary bg-primary/10 text-primary',
                step.status === 'pending' && 'border-muted-foreground/30 bg-background text-muted-foreground/50',
                step.status === 'skipped' && 'border-muted bg-muted text-muted-foreground'
              )}
            >
              {step.status === 'completed' ? (
                <Check className="h-4 w-4" />
              ) : step.status === 'in_progress' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
            </div>
            <span
              className={cn(
                'text-[11px] font-medium whitespace-nowrap max-w-[80px] text-center truncate',
                step.status === 'completed' && 'text-success',
                step.status === 'in_progress' && 'text-primary font-semibold',
                step.status === 'pending' && 'text-muted-foreground',
                step.status === 'skipped' && 'text-muted-foreground line-through'
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'h-0.5 w-8 mx-1 mt-[-18px]',
                step.status === 'completed' ? 'bg-success' : 'bg-border'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
