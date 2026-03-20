import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { currentUser } from '@/lib/mock-data';
import {
  LayoutDashboard, Users, Building2, CreditCard, FileText,
  ClipboardCheck, ScrollText, BarChart3, Settings, DollarSign,
  CalendarDays
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Companies', to: '/companies', icon: Building2 },
  { label: 'Employees', to: '/employees', icon: Users },
  { label: 'Payroll', to: '/payroll', icon: DollarSign },
  { label: 'PTO', to: '/pto', icon: CalendarDays },
  { label: 'Invoices', to: '/invoices', icon: CreditCard },
  { label: 'Documents', to: '/documents', icon: FileText },
  { label: 'Compliance', to: '/compliance', icon: ClipboardCheck },
  { label: 'Audit Log', to: '/audit-log', icon: ScrollText },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5 border-b border-sidebar-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
          <span className="text-xs font-bold text-sidebar-primary-foreground">A1</span>
        </div>
        <span className="text-sm font-semibold text-sidebar-accent-foreground">AtlasOne HR</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-thin">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            {currentUser.avatarInitials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-sidebar-accent-foreground">{currentUser.name}</p>
            <p className="truncate text-[11px] text-sidebar-muted">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
