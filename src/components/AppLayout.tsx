import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { NotificationBell, type Notification } from '@/components/workflow/NotificationBell';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { ImpersonationSelector } from '@/components/ImpersonationSelector';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

const initialNotifications: Notification[] = [
  { id: 'n1', title: 'Payroll approval due', message: 'Meridian Construction payroll needs approval by Tuesday 6 PM EST.', type: 'warning', read: false, timestamp: new Date(Date.now() - 1800000).toISOString(), actionUrl: '/payroll/pr1' },
  { id: 'n2', title: 'Onboarding started', message: 'Priya Sharma has been added to the Standard Employee Onboarding workflow.', type: 'info', read: false, timestamp: new Date(Date.now() - 7200000).toISOString(), actionUrl: '/onboarding' },
  { id: 'n3', title: 'Invoice overdue', message: 'Summit Logistics monthly invoice is 10 days past due.', type: 'error', read: false, timestamp: new Date(Date.now() - 86400000).toISOString(), actionUrl: '/invoices' },
  { id: 'n4', title: 'Compliance task completed', message: 'TX SUI Rate Update for Meridian Construction has been resolved.', type: 'success', read: true, timestamp: new Date(Date.now() - 172800000).toISOString(), actionUrl: '/compliance' },
];

export function AppLayout() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, role, signOut } = useAuth();
  const isMobile = useIsMobile();

  const handleMarkRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
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
