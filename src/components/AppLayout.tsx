import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { NotificationBell, type Notification } from '@/components/workflow/NotificationBell';
import { useState } from 'react';

const initialNotifications: Notification[] = [
  { id: 'n1', title: 'Payroll approval due', message: 'Meridian Construction payroll needs approval by Tuesday 6 PM EST.', type: 'warning', read: false, timestamp: new Date(Date.now() - 1800000).toISOString(), actionUrl: '/payroll/pr1' },
  { id: 'n2', title: 'Onboarding started', message: 'Priya Sharma has been added to the Standard Employee Onboarding workflow.', type: 'info', read: false, timestamp: new Date(Date.now() - 7200000).toISOString(), actionUrl: '/onboarding' },
  { id: 'n3', title: 'Invoice overdue', message: 'Summit Logistics monthly invoice is 10 days past due.', type: 'error', read: false, timestamp: new Date(Date.now() - 86400000).toISOString(), actionUrl: '/invoices' },
  { id: 'n4', title: 'Compliance task completed', message: 'TX SUI Rate Update for Meridian Construction has been resolved.', type: 'success', read: true, timestamp: new Date(Date.now() - 172800000).toISOString(), actionUrl: '/compliance' },
];

export function AppLayout() {
  const [notifications, setNotifications] = useState(initialNotifications);

  const handleMarkRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pl-60">
        {/* Top bar with notification bell */}
        <div className="sticky top-0 z-20 flex items-center justify-end border-b bg-background/80 backdrop-blur-sm px-6 py-2">
          <NotificationBell
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onDismiss={handleDismiss}
          />
        </div>
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
