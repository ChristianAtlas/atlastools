import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  WorkflowStepper,
  ApprovalPanel,
  AuditTimeline,
  InternalNotes,
  DeadlineCountdown,
  NotificationBell,
  StatusBadge,
  type WorkflowStep,
  type AuditEntry,
  type InternalNote,
  type Notification,
  type WorkflowStatus,
} from '@/components/workflow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

// ── Demo Data ──────────────────────────────────────────────

const payrollSteps: WorkflowStep[] = [
  { id: 's1', label: 'Time Review', status: 'completed', description: 'Review employee timesheets', timestamp: 'Mar 18, 10:30 AM' },
  { id: 's2', label: 'Edit Payroll', status: 'completed', description: 'Adjust pay details', timestamp: 'Mar 18, 11:15 AM' },
  { id: 's3', label: 'Preview', status: 'completed', description: 'Verify totals and deductions', timestamp: 'Mar 18, 2:00 PM' },
  { id: 's4', label: 'Client Approval', status: 'in_progress', description: 'Awaiting client sign-off' },
  { id: 's5', label: 'Admin Approval', status: 'pending', description: 'AtlasOne final review' },
  { id: 's6', label: 'Submit to Everee', status: 'pending', description: 'Send payroll for processing' },
];

const onboardingSteps: WorkflowStep[] = [
  { id: 'o1', label: 'Personal Info', status: 'completed' },
  { id: 'o2', label: 'Tax Forms', status: 'completed' },
  { id: 'o3', label: 'Direct Deposit', status: 'in_progress' },
  { id: 'o4', label: 'Benefits', status: 'pending' },
  { id: 'o5', label: 'Documents', status: 'pending' },
];

const errorSteps: WorkflowStep[] = [
  { id: 'e1', label: 'Submitted', status: 'completed' },
  { id: 'e2', label: 'Processing', status: 'error', description: 'Bank rejected ACH transfer' },
  { id: 'e3', label: 'Funded', status: 'pending' },
  { id: 'e4', label: 'Complete', status: 'skipped' },
];

const auditEntries: AuditEntry[] = [
  { id: 'a1', action: 'created', actor: 'Sarah Chen', actorRole: 'Super Admin', entity: 'Payroll Run #PR-2024-089', details: 'Created for Meridian Construction, pay period Mar 11–17', timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: 'a2', action: 'approved', actor: 'James Wilson', actorRole: 'Client Admin', entity: 'Payroll Run #PR-2024-089', details: 'Client approval granted', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'a3', action: 'updated', actor: 'Sarah Chen', actorRole: 'Super Admin', entity: 'Employee: Mike Johnson', details: 'Changed pay rate from $28.50/hr to $31.00/hr', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'a4', action: 'uploaded', actor: 'Priya Sharma', actorRole: 'Employee', entity: 'Document: W-4 Form', details: 'Federal withholding form uploaded', timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: 'a5', action: 'submitted', actor: 'Sarah Chen', actorRole: 'Super Admin', entity: 'Invoice #INV-2024-032', details: 'Monthly invoice sent to Summit Logistics — $12,450.00', timestamp: new Date(Date.now() - 172800000).toISOString() },
  { id: 'a6', action: 'payment', actor: 'System', entity: 'Invoice #INV-2024-031', details: 'Payment received via ACH — $8,200.00', timestamp: new Date(Date.now() - 259200000).toISOString() },
  { id: 'a7', action: 'rejected', actor: 'Sarah Chen', actorRole: 'Super Admin', entity: 'PTO Request', details: 'Insufficient PTO balance', timestamp: new Date(Date.now() - 345600000).toISOString() },
];

const internalNotes: InternalNote[] = [
  { id: 'in1', author: 'Sarah Chen', authorRole: 'Super Admin', content: 'Client requested a rush payroll correction for Mike Johnson. Verified the hours discrepancy with the site foreman — adjusting from 42h to 45h this period.', jiraRef: 'ATLAS-1847', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'in2', author: 'David Park', authorRole: 'Operations', content: 'SUI rate for TX has been updated in Everee. Confirmed with their support team that it will take effect next payroll cycle.', createdAt: new Date(Date.now() - 86400000).toISOString() },
];

const demoNotifications: Notification[] = [
  { id: 'dn1', title: 'Payroll approval due', message: 'Meridian Construction payroll needs approval by Tuesday 6 PM EST.', type: 'warning', read: false, timestamp: new Date(Date.now() - 1800000).toISOString(), actionUrl: '/payroll' },
  { id: 'dn2', title: 'Onboarding complete', message: 'Priya Sharma has finished all onboarding tasks.', type: 'success', read: false, timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'dn3', title: 'Invoice overdue', message: 'Summit Logistics invoice is 10 days past due.', type: 'error', read: true, timestamp: new Date(Date.now() - 86400000).toISOString() },
];

const allStatuses: WorkflowStatus[] = [
  'active', 'onboarding', 'suspended', 'terminated', 'on_leave',
  'draft', 'in_review', 'pending_approval', 'approved', 'processing', 'completed', 'failed',
  'pending', 'in_progress', 'overdue',
  'sent', 'paid',
  'not_started', 'cancelled', 'escalated', 'changes_requested', 'rejected',
  'blocked', 'skipped', 'expired', 'resolved', 'voided', 'reversed',
];

// ── Page Component ─────────────────────────────────────────

export default function WorkflowDemo() {
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | 'escalated' | 'changes_requested'>('pending');
  const [notes, setNotes] = useState(internalNotes);
  const [notifs, setNotifs] = useState(demoNotifications);

  // Generate future deadlines for demo
  const deadlineNormal = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const deadlineWarning = new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString();
  const deadlineCritical = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const deadlineExpired = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workflow Components"
        description="Interactive showcase of all 7 reusable workflow components used across AtlasOne HR"
      />

      {/* 1. WorkflowStepper */}
      <section className="space-y-4 animate-in-up stagger-1">
        <h2 className="text-lg font-semibold">1. WorkflowStepper</h2>
        <p className="text-sm text-muted-foreground">Tracks multi-step processes with completed, in-progress, pending, error, and skipped states.</p>

        <Tabs defaultValue="horizontal" className="w-full">
          <TabsList>
            <TabsTrigger value="horizontal">Horizontal</TabsTrigger>
            <TabsTrigger value="vertical">Vertical</TabsTrigger>
            <TabsTrigger value="error">Error State</TabsTrigger>
          </TabsList>

          <TabsContent value="horizontal">
            <Card>
              <CardHeader><CardTitle className="text-sm">Payroll Cycle — Horizontal</CardTitle></CardHeader>
              <CardContent>
                <WorkflowStepper steps={payrollSteps} orientation="horizontal" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vertical">
            <Card>
              <CardHeader><CardTitle className="text-sm">Payroll Cycle — Vertical with timestamps</CardTitle></CardHeader>
              <CardContent>
                <WorkflowStepper steps={payrollSteps} orientation="vertical" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="error">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-sm">Error + Skipped States</CardTitle></CardHeader>
                <CardContent>
                  <WorkflowStepper steps={errorSteps} orientation="vertical" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Onboarding — Small Size</CardTitle></CardHeader>
                <CardContent>
                  <WorkflowStepper steps={onboardingSteps} orientation="horizontal" size="sm" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      {/* 2. ApprovalPanel */}
      <section className="space-y-4 animate-in-up stagger-2">
        <h2 className="text-lg font-semibold">2. ApprovalPanel</h2>
        <p className="text-sm text-muted-foreground">Multi-action approval UI with mandatory comments for rejections and change requests.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <ApprovalPanel
            title="Client Payroll Approval"
            description="Meridian Construction — Pay period Mar 11–17, 2024. Gross pay: $48,250.00"
            status={approvalStatus}
            approver={approvalStatus !== 'pending' ? 'James Wilson' : undefined}
            approvedAt={approvalStatus !== 'pending' ? new Date().toISOString() : undefined}
            deadline="Tue, Mar 19 at 6:00 PM EST"
            onAction={(actionId, comment) => {
              if (actionId === 'approve') setApprovalStatus('approved');
              else if (actionId === 'reject') setApprovalStatus('rejected');
              else if (actionId === 'request_changes') setApprovalStatus('changes_requested');
            }}
          />
          <div className="space-y-3">
            <Card>
              <CardContent className="pt-4 space-y-2">
                <p className="text-sm font-medium">Try the interactive panel →</p>
                <p className="text-xs text-muted-foreground">Click Approve, Request Changes, or Reject. Rejections and change requests require a comment.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setApprovalStatus('pending')}
                >
                  Reset to Pending
                </Button>
              </CardContent>
            </Card>
            <ApprovalPanel
              title="Admin Final Review"
              status="approved"
              approver="Sarah Chen"
              approvedAt={new Date(Date.now() - 3600000).toISOString()}
              canAct={false}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* 3. AuditTimeline */}
      <section className="space-y-4 animate-in-up stagger-3">
        <h2 className="text-lg font-semibold">3. AuditTimeline</h2>
        <p className="text-sm text-muted-foreground">Vertical timeline with action-specific icons, relative timestamps, and role badges.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Full Timeline</CardTitle></CardHeader>
            <CardContent>
              <AuditTimeline entries={auditEntries} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Truncated (maxItems=3)</CardTitle></CardHeader>
            <CardContent>
              <AuditTimeline entries={auditEntries} maxItems={3} />
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* 4. InternalNotes */}
      <section className="space-y-4 animate-in-up stagger-4">
        <h2 className="text-lg font-semibold">4. InternalNotes</h2>
        <p className="text-sm text-muted-foreground">Staff-only note panel with Jira ticket references. Visible only to Super Admins in production.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <InternalNotes
            notes={notes}
            onAddNote={(content, jiraRef) => {
              setNotes(prev => [
                ...prev,
                {
                  id: `in-${Date.now()}`,
                  author: 'You',
                  authorRole: 'Super Admin',
                  content,
                  jiraRef,
                  createdAt: new Date().toISOString(),
                },
              ]);
            }}
          />
          <Card>
            <CardContent className="pt-4 space-y-2">
              <p className="text-sm font-medium">Try adding a note →</p>
              <p className="text-xs text-muted-foreground">Click "Add Internal Note", type a message, optionally add a Jira reference, and save. Notes are only visible to AtlasOne staff — never to clients or employees.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* 5. DeadlineCountdown */}
      <section className="space-y-4 animate-in-up stagger-5">
        <h2 className="text-lg font-semibold">5. DeadlineCountdown</h2>
        <p className="text-sm text-muted-foreground">Live-updating countdown that changes severity based on time remaining. Updates every minute.</p>

        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3">
              <DeadlineCountdown deadline={deadlineNormal} label="Normal (3d)" />
              <DeadlineCountdown deadline={deadlineWarning} label="Warning (18h)" />
              <DeadlineCountdown deadline={deadlineCritical} label="Critical (2h)" />
              <DeadlineCountdown deadline={deadlineExpired} label="Expired" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Default thresholds: warning at 24h, critical at 4h. The critical state pulses to grab attention.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* 6. NotificationBell */}
      <section className="space-y-4 animate-in-up stagger-6">
        <h2 className="text-lg font-semibold">6. NotificationBell</h2>
        <p className="text-sm text-muted-foreground">Dropdown notification center with unread count badge, type-based styling, and mark-as-read actions.</p>

        <Card>
          <CardContent className="pt-4 flex items-start gap-6">
            <div className="p-3 rounded-lg border bg-sidebar">
              <NotificationBell
                notifications={notifs}
                onMarkRead={(id) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))}
                onMarkAllRead={() => setNotifs(prev => prev.map(n => ({ ...n, read: true })))}
                onDismiss={(id) => setNotifs(prev => prev.filter(n => n.id !== id))}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Click the bell to open →</p>
              <p className="text-xs text-muted-foreground">Mark individual notifications as read, dismiss them, or mark all as read. The badge shows unread count.</p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setNotifs(demoNotifications.map(n => ({ ...n, read: false })))}
              >
                Reset Notifications
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* 7. StatusBadge */}
      <section className="space-y-4 animate-in-up stagger-7">
        <h2 className="text-lg font-semibold">7. StatusBadge</h2>
        <p className="text-sm text-muted-foreground">28 unique workflow states with consistent color semantics. Supports pulse animation and size variants.</p>

        <Card>
          <CardHeader><CardTitle className="text-sm">All Status Variants</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allStatuses.map(s => (
                <StatusBadge key={s} status={s} />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">With Pulse Animation</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="in_progress" pulse />
                <StatusBadge status="pending_approval" pulse />
                <StatusBadge status="processing" pulse />
                <StatusBadge status="overdue" pulse />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Size Comparison</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status="approved" size="sm" />
                <StatusBadge status="approved" size="md" />
                <StatusBadge status="rejected" size="sm" />
                <StatusBadge status="rejected" size="md" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
