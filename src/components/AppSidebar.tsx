import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, CreditCard, FileText, Workflow,
  ClipboardCheck, ScrollText, BarChart3, Settings, DollarSign,
  CalendarDays, UserPlus, ShieldCheck, Clock, Heart, User, Landmark, Banknote, Mail
} from 'lucide-react';
import type { AppRole } from '@/contexts/AuthContext';
import logoImg from '@/assets/logo.png';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  roles?: AppRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Super-admin grouped nav
const superAdminNavGroups: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Companies', to: '/companies', icon: Building2 },
      { label: 'Communications', to: '/communications', icon: Mail },
      { label: 'Employees', to: '/employees', icon: Users },
      { label: 'Onboarding', to: '/onboarding', icon: UserPlus },
      { label: 'Payroll', to: '/payroll', icon: DollarSign },
      { label: 'Workers\' Comp', to: '/workers-comp', icon: ShieldCheck },
      { label: 'Benefits Admin', to: '/benefits-admin', icon: Heart },
    ],
  },
  {
    label: 'Finance & Admin',
    items: [
      { label: 'Invoices', to: '/invoices', icon: CreditCard },
      { label: 'ACH Tool', to: '/ach-tool', icon: Banknote },
      { label: 'Documents', to: '/documents', icon: FileText },
      { label: 'Reports', to: '/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Tax & Compliance',
    items: [
      { label: 'Tax Management', to: '/tax-management', icon: Landmark },
      { label: 'Compliance', to: '/compliance', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Audit Log', to: '/audit-log', icon: ScrollText },
      { label: 'Settings', to: '/settings', icon: Settings },
      { label: 'Workflow Demo', to: '/workflow-demo', icon: Workflow },
    ],
  },
];

// Client admin grouped nav
const clientAdminNavGroups: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Employees', to: '/employees', icon: Users },
      { label: 'Onboarding', to: '/onboarding', icon: UserPlus },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { label: 'Timecards', to: '/timecards', icon: Clock },
      { label: 'Payroll', to: '/payroll', icon: DollarSign },
    ],
  },
  {
    label: 'HR & People',
    items: [
      { label: 'PTO', to: '/pto', icon: CalendarDays },
    ],
  },
  {
    label: 'Finance & Admin',
    items: [
      { label: 'Invoices', to: '/invoices', icon: CreditCard },
      { label: 'Reports', to: '/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Tax & Compliance',
    items: [
      { label: 'Tax Management', to: '/client-tax', icon: Landmark },
      { label: 'Documents', to: '/documents', icon: FileText },
    ],
  },
];

// Employee-only nav items
const employeeNavItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, roles: ['employee'] },
  { label: 'My Pay', to: '/my-pay', icon: DollarSign, roles: ['employee'] },
  { label: 'Time Off', to: '/time-off', icon: CalendarDays, roles: ['employee'] },
  { label: 'Time Card', to: '/time-card', icon: Clock, roles: ['employee'] },
  { label: 'Benefits', to: '/benefits', icon: Heart, roles: ['employee'] },
  { label: 'Documents', to: '/my-documents', icon: FileText, roles: ['employee'] },
  { label: 'Profile', to: '/my-profile', icon: User, roles: ['employee'] },
];

interface AppSidebarProps {
  userName: string;
  userInitials: string;
  roleLabel: string;
  role: AppRole | null;
  onNavClick?: () => void;
}

export function AppSidebar({ userName, userInitials, roleLabel, role, onNavClick }: AppSidebarProps) {
  const location = useLocation();

  const renderNavItem = (item: NavItem) => {
    const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
    return (
      <li key={item.to}>
        <NavLink
          to={item.to}
          onClick={onNavClick}
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
  };

  const isSuperAdmin = role === 'super_admin';
  const isEmployee = role === 'employee';
  const flatItems = isEmployee ? employeeNavItems : clientAdminNavItems;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5 border-b border-sidebar-border">
        <img src={logoImg} alt="AtlasOne logo" className="h-7 w-7 rounded-md invert" />
        <span className="text-sm font-semibold text-sidebar-accent-foreground">AtlasOne HR</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-thin">
        {isSuperAdmin ? (
          <div className="space-y-4">
            {superAdminNavGroups.map((group) => (
              <div key={group.label}>
                <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map(renderNavItem)}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {flatItems.map(renderNavItem)}
          </ul>
        )}
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
