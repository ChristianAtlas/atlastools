import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { NotificationBell, type Notification } from '@/components/workflow/NotificationBell';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Building2 } from 'lucide-react';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { ImpersonationSelector } from '@/components/ImpersonationSelector';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCompanies } from '@/hooks/useCompanies';

const initialNotifications: (Notification & { companyId?: string })[] = [
  { id: 'n1', title: 'Payroll approval due', message: 'Meridian Construction payroll needs approval by Tuesday 6 PM EST.', type: 'warning', read: false, timestamp: new Date(Date.now() - 1800000).toISOString(), actionUrl: '/payroll/pr1', companyId: 'demo-company-1' },
  { id: 'n2', title: 'Onboarding started', message: 'Priya Sharma has been added to the Standard Employee Onboarding workflow.', type: 'info', read: false, timestamp: new Date(Date.now() - 7200000).toISOString(), actionUrl: '/onboarding', companyId: 'demo-company-1' },
  { id: 'n3', title: 'Invoice overdue', message: 'Summit Logistics monthly invoice is 10 days past due.', type: 'error', read: false, timestamp: new Date(Date.now() - 86400000).toISOString(), actionUrl: '/invoices', companyId: 'demo-company-2' },
  { id: 'n4', title: 'Compliance task completed', message: 'TX SUI Rate Update for Meridian Construction has been resolved.', type: 'success', read: true, timestamp: new Date(Date.now() - 172800000).toISOString(), actionUrl: '/compliance', companyId: 'demo-company-1' },
];

export function AppLayout() {
  const [allNotifications, setAllNotifications] = useState(initialNotifications);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, role, signOut } = useAuth();
  const isMobile = useIsMobile();
  const isClientAdmin = role === 'client_admin';
  const isEmployeeRole = role === 'employee';

  // Fetch company info for client admins and employees
  const { data: companies = [] } = useCompanies();
  const userCompany = (isClientAdmin || isEmployeeRole) && profile?.company_id
    ? companies.find(c => c.id === profile.company_id)
    : null;
  // Filter notifications by company for client admins and employees
  const notifications = (isClientAdmin || isEmployeeRole) && profile?.company_id
    ? allNotifications.filter(n => !n.companyId || n.companyId === profile.company_id)
    : allNotifications;

  const handleMarkRead = (id: string) => {
    setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = () => {
    setAllNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDismiss = (id: string) => {
    setAllNotifications(prev => prev.filter(n => n.id !== id));
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'client_admin' ? 'Client Admin' : 'Employee';

  const sidebarContent = (
    <AppSidebar
      userName={profile?.full_name || 'User'}
      userInitials={initials}
      roleLabel={roleLabel}
      role={role}
      onNavClick={() => isMobile && setSidebarOpen(false)}
    />
  );

  return (
    <ImpersonationProvider realRole={role}>
      <div className="min-h-screen bg-background">
        {/* Desktop sidebar */}
        {!isMobile && (
          <div className="hidden md:block">
            {sidebarContent}
          </div>
        )}

        {/* Mobile sidebar drawer */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-60 p-0 [&>button]:hidden">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        )}

        <main className={isMobile ? '' : 'pl-60'}>
          <ImpersonationBanner />
          {/* Top bar */}
          <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 py-2">
            <div className="flex items-center gap-2">
              {isMobile && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              {userCompany && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <div className="leading-tight">
                    <span className="font-semibold text-sm">{userCompany.name}</span>
                    <span className="ml-2 text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{userCompany.cid}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ImpersonationSelector />
              <NotificationBell
                notifications={notifications}
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
                onDismiss={handleDismiss}
              />
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={signOut}>
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-4 md:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </ImpersonationProvider>
  );
}
