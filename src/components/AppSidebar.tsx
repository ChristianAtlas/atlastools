import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, CreditCard, FileText, Workflow,
  ClipboardCheck, ScrollText, BarChart3, Settings, DollarSign,
  CalendarDays, UserPlus
} from 'lucide-react';
import type { AppRole } from '@/contexts/AuthContext';
import logoImg from '@/assets/logo.png';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  roles?: AppRole[]; // if undefined, visible to all
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Companies', to: '/companies', icon: Building2, roles: ['super_admin'] },
  { label: 'Employees', to: '/employees', icon: Users, roles: ['super_admin', 'client_admin'] },
  { label: 'Onboarding', to: '/onboarding', icon: UserPlus, roles: ['super_admin', 'client_admin'] },
  { label: 'Payroll', to: '/payroll', icon: DollarSign, roles: ['super_admin', 'client_admin'] },
  { label: 'PTO', to: '/pto', icon: CalendarDays, roles: ['client_admin', 'employee'] },
  { label: 'Invoices', to: '/invoices', icon: CreditCard, roles: ['super_admin', 'client_admin'] },
  { label: 'Documents', to: '/documents', icon: FileText },
  { label: 'Compliance', to: '/compliance', icon: ClipboardCheck, roles: ['super_admin'] },
  { label: 'Audit Log', to: '/audit-log', icon: ScrollText, roles: ['super_admin'] },
  { label: 'Reports', to: '/reports', icon: BarChart3, roles: ['super_admin', 'client_admin'] },
  { label: 'Settings', to: '/settings', icon: Settings, roles: ['super_admin'] },
  { label: 'Workflow Demo', to: '/workflow-demo', icon: Workflow, roles: ['super_admin'] },
];

interface AppSidebarProps {
  userName: string;
  userInitials: string;
  roleLabel: string;
  role: AppRole | null;
}

export function AppSidebar({ userName, userInitials, roleLabel, role }: AppSidebarProps) {
  const location = useLocation();

  const visibleItems = navItems.filter(item => !item.roles || (role && item.roles.includes(role)));

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5 border-b border-sidebar-border">
        <img src={logoImg} alt="AtlasOne logo" className="h-7 w-7 rounded-md invert" />
        <span className="text-sm font-semibold text-sidebar-accent-foreground">AtlasOne HR</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-thin">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={cn(
                    'group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150',
                    isActive
                      ? 'text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-md opacity-20" style={{ background: 'var(--gradient-primary)' }} />
                  )}
                  <item.icon className="h-4 w-4 shrink-0 relative z-10" />
                  <span className="relative z-10">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white shrink-0" style={{ background: 'var(--gradient-primary)' }}>
            {userInitials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-sidebar-accent-foreground">{userName}</p>
            <p className="truncate text-[11px] text-sidebar-muted">{roleLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
