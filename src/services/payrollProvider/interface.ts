/**
 * Payroll Provider Interface
 * 
 * Abstraction layer for external payroll providers.
 * AtlasOne owns all employee data and workflows;
 * the provider handles calculation, tax filing, and money movement.
 */

export interface PayrollProviderEmployee {
  externalId?: string;
  firstName: string;
  lastName: string;
  email: string;
  ssn?: string; // masked in transit
  dateOfBirth?: string;
  startDate: string;
  salary: number;
  payType: 'salary' | 'hourly';
  federalFilingStatus?: string;
  stateFilingStatus?: string;
  directDeposit?: {
    routingNumber: string;
    accountNumber: string;
    accountType: 'checking' | 'savings';
  };
}

export interface PayrollSubmission {
  externalPayrollId?: string;
  companyExternalId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  employees: {
    employeeExternalId: string;
    regularHours?: number;
    overtimeHours?: number;
    bonus?: number;
    commission?: number;
    reimbursement?: number;
  }[];
}

export interface PayrollResult {
  externalPayrollId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  grossPay: number;
  netPay: number;
  employerTaxes: number;
  employeeTaxes: number;
  deductions: number;
}

export interface IPayrollProvider {
  name: string;

  // Employee sync
  syncEmployee(employee: PayrollProviderEmployee): Promise<{ externalId: string }>;
  getEmployee(externalId: string): Promise<PayrollProviderEmployee | null>;

  // Payroll execution
  submitPayroll(submission: PayrollSubmission): Promise<PayrollResult>;
  getPayrollStatus(externalPayrollId: string): Promise<PayrollResult>;

  // Company onboarding
  registerCompany(company: { name: string; ein: string; state: string }): Promise<{ externalId: string }>;
}
