import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Building2, FileText, DollarSign, Users, Rocket, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useClientOnboardingWizard, useSaveWizardStep, useLaunchClient } from '@/hooks/useClientOnboarding';
import type { WizardData } from '@/hooks/useClientOnboarding';
import { CompanySetupStep } from '@/components/client-onboarding/CompanySetupStep';
import { TaxComplianceStep } from '@/components/client-onboarding/TaxComplianceStep';
import { PayrollConfigStep } from '@/components/client-onboarding/PayrollConfigStep';
import { EmployeeImportStep } from '@/components/client-onboarding/EmployeeImportStep';
import { ReviewLaunchStep } from '@/components/client-onboarding/ReviewLaunchStep';
import { EmployeeProvisioningStep } from '@/components/client-onboarding/EmployeeProvisioningStep';

const STEPS = [
  { id: 1, label: 'Company Setup', icon: Building2 },
  { id: 2, label: 'Tax & Compliance', icon: FileText },
  { id: 3, label: 'Payroll Config', icon: DollarSign },
  { id: 4, label: 'Employee Import', icon: Users },
  { id: 5, label: 'Review & Launch', icon: Rocket },
  { id: 6, label: 'Provisioning', icon: UserPlus },
];

export default function ClientOnboardingWizard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: wizard, isLoading } = useClientOnboardingWizard(id || '');
  const saveStep = useSaveWizardStep();
  const launchClient = useLaunchClient();

  const [activeStep, setActiveStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [launchedCompanyId, setLaunchedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (wizard) {
      setActiveStep(Math.min(wizard.current_step, 6));
      setWizardData(wizard.wizard_data || {});
      if (wizard.company_id) {
        setLaunchedCompanyId(wizard.company_id);
      }
    }
  }, [wizard]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading wizard...</div>;
  }

  if (!wizard) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/onboarding')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />Back
        </Button>
        <div className="text-center py-12 text-muted-foreground">Wizard not found</div>
      </div>
    );
  }

  const handleSave = async (step: number, data: Partial<WizardData>) => {
    const updated = { ...wizardData, ...data };
    setWizardData(updated);
    await saveStep.mutateAsync({ wizardId: wizard.id, step, data });
    setActiveStep(step + 1);
  };

  const handleBack = () => {
    if (activeStep > 1) setActiveStep(activeStep - 1);
  };

  const handleLaunch = async () => {
    const result = await launchClient.mutateAsync({ wizardId: wizard.id, wizardData });
    setLaunchedCompanyId(result.id);
    setActiveStep(6);
  };

  const handleStepClick = (step: number) => {
    if (step <= wizard.current_step) setActiveStep(step);
  };

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('/onboarding')} className="animate-in-up">
        <ArrowLeft className="h-4 w-4 mr-1.5" />Back to Onboarding
      </Button>

      {/* Progress stepper */}
      <Card className="animate-in-up stagger-1">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isCompleted = wizard.current_step > step.id;
              const isActive = activeStep === step.id;
              const isAccessible = step.id <= wizard.current_step;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => handleStepClick(step.id)}
                    disabled={!isAccessible}
                    className={cn(
                      'flex flex-col items-center gap-1.5 transition-colors',
                      isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                      isCompleted && 'border-success bg-success text-success-foreground',
                      isActive && !isCompleted && 'border-primary bg-primary/10 text-primary',
                      !isActive && !isCompleted && 'border-muted-foreground/30 text-muted-foreground/50'
                    )}>
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={cn(
                      'text-xs font-medium text-center whitespace-nowrap',
                      isCompleted && 'text-success',
                      isActive && !isCompleted && 'text-primary font-semibold',
                      !isActive && !isCompleted && 'text-muted-foreground'
                    )}>
                      {step.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={cn(
                      'h-0.5 flex-1 mx-2 mt-[-18px]',
                      isCompleted ? 'bg-success' : 'bg-border'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step content */}
      <div className="animate-in-up stagger-2">
        {activeStep === 1 && (
          <CompanySetupStep
            data={wizardData}
            onSave={(d) => handleSave(1, d)}
            isSaving={saveStep.isPending}
          />
        )}
        {activeStep === 2 && (
          <TaxComplianceStep
            data={wizardData}
            onSave={(d) => handleSave(2, d)}
            onBack={handleBack}
            isSaving={saveStep.isPending}
          />
        )}
        {activeStep === 3 && (
          <PayrollConfigStep
            data={wizardData}
            onSave={(d) => handleSave(3, d)}
            onBack={handleBack}
            isSaving={saveStep.isPending}
          />
        )}
        {activeStep === 4 && (
          <EmployeeImportStep
            data={wizardData}
            onSave={(d) => handleSave(4, d)}
            onBack={handleBack}
            isSaving={saveStep.isPending}
          />
        )}
        {activeStep === 5 && (
          <ReviewLaunchStep
            data={wizardData}
            onLaunch={handleLaunch}
            onBack={handleBack}
            onEdit={(step) => setActiveStep(step)}
            isLaunching={launchClient.isPending}
          />
        )}
        {activeStep === 6 && launchedCompanyId && (
          <EmployeeProvisioningStep
            companyId={launchedCompanyId}
            onDone={() => navigate('/companies')}
          />
        )}
      </div>
    </div>
  );
}
