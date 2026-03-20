export type UserRole = 'super_admin' | 'client_admin' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;
  avatarInitials: string;
}

export interface Company {
  id: string;
  name: string;
  ein: string;
  status: 'active' | 'onboarding' | 'suspended';
  employeeCount: number;
  state: string;
  primaryContact: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'active' | 'onboarding' | 'terminated' | 'on_leave';
  department: string;
  title: string;
  startDate: string;
  salary: number;
  payType: 'salary' | 'hourly';
  avatarInitials: string;
}

export type PayrollStatus = 'draft' | 'in_review' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed';

export interface PayrollRun {
  id: string;
  companyId: string;
  companyName: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  status: PayrollStatus;
  grossPay: number;
  netPay: number;
  employeeCount: number;
  createdBy: string;
  updatedAt: string;
}

export interface ComplianceTask {
  id: string;
  title: string;
  companyId?: string;
  companyName?: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assignee: string;
  category: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: string;
  timestamp: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  companyName: string;
  type: 'monthly' | 'payroll';
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
}
