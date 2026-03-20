import { cn } from '@/lib/utils';
import { Check, Circle, Loader2, SkipForward } from 'lucide-react';

export interface WorkflowStep {
  id: string;
  label: string;
  description?: string;
  status: 'completed' | 'in_progress' | 'pending' | 'skipped' | 'error';
  timestamp?: string;
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md';
  className?: string;
}

export function WorkflowStepper({ steps, orientation = 'horizontal', size = 'md', className }: WorkflowStepperProps) {
  const isVertical = orientation === 'vertical';
  const iconSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const innerIcon = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const connectorClass = isVertical ? 'w-0.5 h-6 mx-auto' : 'h-0.5 w-8 mx-1';

  return (
    <div className={cn(isVertical ? 'flex flex-col gap-0' : 'flex items-center gap-0', className)}>
      {steps.map((step, i) => (
        <div key={step.id} className={cn(isVertical ? 'flex flex-col' : 'flex items-center')}>
          <div className={cn(isVertical ? 'flex items-start gap-3' : 'flex flex-col items-center gap-1.5')}>
            {/* Icon */}
            <div
              className={cn(
                'flex items-center justify-center rounded-full border-2 shrink-0 transition-colors',
                iconSize,
                step.status === 'completed' && 'border-success bg-success text-success-foreground',
                step.status === 'in_progress' && 'border-primary bg-primary/10 text-primary',
                step.status === 'pending' && 'border-muted-foreground/30 bg-background text-muted-foreground/50',
                step.status === 'skipped' && 'border-muted bg-muted text-muted-foreground',
                step.status === 'error' && 'border-destructive bg-destructive/10 text-destructive'
              )}
            >
              {step.status === 'completed' ? (
                <Check className={innerIcon} />
              ) : step.status === 'in_progress' ? (
                <Loader2 className={cn(innerIcon, 'animate-spin')} />
              ) : step.status === 'skipped' ? (
                <SkipForward className={innerIcon} />
              ) : step.status === 'error' ? (
                <span className="text-[10px] font-bold">!</span>
              ) : (
                <Circle className={cn(size === 'sm' ? 'h-2 w-2' : 'h-3 w-3')} />
              )}
            </div>

            {/* Label area */}
            <div className={cn(isVertical ? 'pb-1' : 'text-center')}>
              <span
                className={cn(
                  'text-[11px] font-medium whitespace-nowrap',
                  !isVertical && 'max-w-[80px] truncate block',
                  step.status === 'completed' && 'text-success',
                  step.status === 'in_progress' && 'text-primary font-semibold',
                  step.status === 'pending' && 'text-muted-foreground',
                  step.status === 'skipped' && 'text-muted-foreground line-through',
                  step.status === 'error' && 'text-destructive'
                )}
              >
                {step.label}
              </span>
              {isVertical && step.description && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{step.description}</p>
              )}
              {isVertical && step.timestamp && (
                <p className="text-[10px] text-muted-foreground/70 tabular-nums mt-0.5">{step.timestamp}</p>
              )}
            </div>
          </div>

          {/* Connector */}
          {i < steps.length - 1 && (
            <div
              className={cn(
                connectorClass,
                isVertical && 'ml-[11px]',
                !isVertical && 'mt-[-18px]',
                step.status === 'completed' ? 'bg-success' : 'bg-border'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
