import type { Company, Employee, PayrollRun, ComplianceTask, AuditLogEntry, Invoice, User } from './types';

export const currentUser: User = {
  id: 'u1',
  email: 'admin@atlasone.com',
  name: 'Sarah Chen',
  role: 'super_admin',
  avatarInitials: 'SC',
};

export const companies: Company[] = [
  { id: 'c1', name: 'Meridian Construction', ein: '12-3456789', status: 'active', employeeCount: 47, state: 'TX', primaryContact: 'Mike Rodriguez', createdAt: '2024-08-15' },
  { id: 'c2', name: 'Pacific Staffing Group', ein: '98-7654321', status: 'active', employeeCount: 132, state: 'CA', primaryContact: 'Lisa Chang', createdAt: '2024-06-01' },
  { id: 'c3', name: 'Summit Logistics', ein: '45-6789012', status: 'active', employeeCount: 28, state: 'FL', primaryContact: 'James Whitaker', createdAt: '2024-11-20' },
  { id: 'c4', name: 'Greenfield Manufacturing', ein: '67-8901234', status: 'onboarding', employeeCount: 63, state: 'OH', primaryContact: 'Dana Petrova', createdAt: '2025-02-10' },
  { id: 'c5', name: 'Harborview Hospitality', ein: '23-4567890', status: 'active', employeeCount: 89, state: 'NY', primaryContact: 'Tom Nguyen', createdAt: '2024-09-30' },
];

export const employees: Employee[] = [
  { id: 'e1', companyId: 'c1', companyName: 'Meridian Construction', firstName: 'Carlos', lastName: 'Ramirez', email: 'carlos.r@meridian.com', status: 'active', department: 'Operations', title: 'Site Foreman', startDate: '2024-09-01', salary: 72000, payType: 'salary', avatarInitials: 'CR' },
  { id: 'e2', companyId: 'c1', companyName: 'Meridian Construction', firstName: 'Angela', lastName: 'Torres', email: 'angela.t@meridian.com', status: 'active', department: 'HR', title: 'HR Coordinator', startDate: '2024-10-15', salary: 58000, payType: 'salary', avatarInitials: 'AT' },
  { id: 'e3', companyId: 'c2', companyName: 'Pacific Staffing Group', firstName: 'Kevin', lastName: 'Park', email: 'kevin.p@pacificstaffing.com', status: 'active', department: 'Sales', title: 'Account Executive', startDate: '2024-07-01', salary: 85000, payType: 'salary', avatarInitials: 'KP' },
  { id: 'e4', companyId: 'c2', companyName: 'Pacific Staffing Group', firstName: 'Brittany', lastName: 'Howell', email: 'brittany.h@pacificstaffing.com', status: 'on_leave', department: 'Recruiting', title: 'Senior Recruiter', startDate: '2024-06-15', salary: 68000, payType: 'salary', avatarInitials: 'BH' },
  { id: 'e5', companyId: 'c3', companyName: 'Summit Logistics', firstName: 'Derek', lastName: 'Simmons', email: 'derek.s@summitlog.com', status: 'active', department: 'Warehouse', title: 'Warehouse Lead', startDate: '2024-12-01', salary: 22.50, payType: 'hourly', avatarInitials: 'DS' },
  { id: 'e6', companyId: 'c4', companyName: 'Greenfield Manufacturing', firstName: 'Priya', lastName: 'Sharma', email: 'priya.s@greenfield.com', status: 'onboarding', department: 'Engineering', title: 'QA Engineer', startDate: '2025-03-15', salary: 92000, payType: 'salary', avatarInitials: 'PS' },
  { id: 'e7', companyId: 'c5', companyName: 'Harborview Hospitality', firstName: 'Marcus', lastName: 'Williams', email: 'marcus.w@harborview.com', status: 'active', department: 'F&B', title: 'Restaurant Manager', startDate: '2024-10-01', salary: 65000, payType: 'salary', avatarInitials: 'MW' },
  { id: 'e8', companyId: 'c1', companyName: 'Meridian Construction', firstName: 'Rachel', lastName: 'Kim', email: 'rachel.k@meridian.com', status: 'terminated', department: 'Finance', title: 'Bookkeeper', startDate: '2024-08-20', salary: 52000, payType: 'salary', avatarInitials: 'RK' },
];

export const payrollRuns: PayrollRun[] = [
  { id: 'pr1', companyId: 'c1', companyName: 'Meridian Construction', payPeriodStart: '2025-03-01', payPeriodEnd: '2025-03-15', payDate: '2025-03-20', status: 'pending_approval', grossPay: 128450, netPay: 96337, employeeCount: 45, createdBy: 'Sarah Chen', updatedAt: '2025-03-16' },
  { id: 'pr2', companyId: 'c2', companyName: 'Pacific Staffing Group', payPeriodStart: '2025-03-01', payPeriodEnd: '2025-03-15', payDate: '2025-03-20', status: 'in_review', grossPay: 412800, netPay: 309600, employeeCount: 130, createdBy: 'Lisa Chang', updatedAt: '2025-03-15' },
  { id: 'pr3', companyId: 'c3', companyName: 'Summit Logistics', payPeriodStart: '2025-03-01', payPeriodEnd: '2025-03-15', payDate: '2025-03-20', status: 'completed', grossPay: 48200, netPay: 36150, employeeCount: 28, createdBy: 'Sarah Chen', updatedAt: '2025-03-18' },
  { id: 'pr4', companyId: 'c5', companyName: 'Harborview Hospitality', payPeriodStart: '2025-03-01', payPeriodEnd: '2025-03-15', payDate: '2025-03-20', status: 'draft', grossPay: 198500, netPay: 148875, employeeCount: 87, createdBy: 'Tom Nguyen', updatedAt: '2025-03-14' },
  { id: 'pr5', companyId: 'c1', companyName: 'Meridian Construction', payPeriodStart: '2025-02-15', payPeriodEnd: '2025-02-28', payDate: '2025-03-05', status: 'completed', grossPay: 125800, netPay: 94350, employeeCount: 46, createdBy: 'Sarah Chen', updatedAt: '2025-03-03' },
];

export const complianceTasks: ComplianceTask[] = [
  { id: 'ct1', title: 'TX SUI Rate Update — Meridian', companyId: 'c1', companyName: 'Meridian Construction', dueDate: '2025-03-25', status: 'pending', assignee: 'Sarah Chen', category: 'Tax Registration' },
  { id: 'ct2', title: 'CA New Hire Reporting — Pacific', companyId: 'c2', companyName: 'Pacific Staffing Group', dueDate: '2025-03-22', status: 'overdue', assignee: 'Sarah Chen', category: 'Compliance Filing' },
  { id: 'ct3', title: 'PEO License Renewal — Florida', dueDate: '2025-04-15', status: 'in_progress', assignee: 'Legal Team', category: 'Licensing' },
  { id: 'ct4', title: 'Q1 Payroll Tax Filing', dueDate: '2025-04-30', status: 'pending', assignee: 'Sarah Chen', category: 'Tax Filing' },
];

export const auditLog: AuditLogEntry[] = [
  { id: 'al1', userId: 'u1', userName: 'Sarah Chen', action: 'Updated', entity: 'Employee', entityId: 'e1', changes: 'salary: $68,000 → $72,000', timestamp: '2025-03-18T14:32:00Z' },
  { id: 'al2', userId: 'u1', userName: 'Sarah Chen', action: 'Approved', entity: 'Payroll', entityId: 'pr3', changes: 'status: pending_approval → approved', timestamp: '2025-03-17T16:45:00Z' },
  { id: 'al3', userId: 'u2', userName: 'Lisa Chang', action: 'Submitted', entity: 'Payroll', entityId: 'pr2', timestamp: '2025-03-15T11:20:00Z' },
  { id: 'al4', userId: 'u1', userName: 'Sarah Chen', action: 'Created', entity: 'Employee', entityId: 'e6', timestamp: '2025-03-14T09:10:00Z' },
  { id: 'al5', userId: 'u3', userName: 'Tom Nguyen', action: 'Uploaded', entity: 'Document', entityId: 'd1', changes: 'W-4 form for Marcus Williams', timestamp: '2025-03-13T15:55:00Z' },
];

export const invoices: Invoice[] = [
  { id: 'inv1', companyId: 'c1', companyName: 'Meridian Construction', type: 'monthly', amount: 4700, status: 'sent', dueDate: '2025-03-31', createdAt: '2025-03-01' },
  { id: 'inv2', companyId: 'c2', companyName: 'Pacific Staffing Group', type: 'payroll', amount: 18240, status: 'paid', dueDate: '2025-03-15', createdAt: '2025-03-05' },
  { id: 'inv3', companyId: 'c3', companyName: 'Summit Logistics', type: 'monthly', amount: 2800, status: 'overdue', dueDate: '2025-03-10', createdAt: '2025-03-01' },
  { id: 'inv4', companyId: 'c5', companyName: 'Harborview Hospitality', type: 'payroll', amount: 12650, status: 'draft', dueDate: '2025-03-25', createdAt: '2025-03-18' },
];
