/**
 * Everee Payroll Provider Implementation
 * 
 * Stub implementation — replace with actual Everee API calls.
 * All payroll calculation, tax filing, and money movement
 * is delegated to Everee. AtlasOne manages data and workflows.
 */

import type { IPayrollProvider, PayrollProviderEmployee, PayrollSubmission, PayrollResult } from './interface';

export class EvereeService implements IPayrollProvider {
  name = 'Everee';

  private baseUrl: string;
  private apiKey: string;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  async syncEmployee(employee: PayrollProviderEmployee): Promise<{ externalId: string }> {
    // TODO: POST to Everee API
    console.log(`[Everee] Syncing employee: ${employee.firstName} ${employee.lastName}`);
    return { externalId: `everee_emp_${Date.now()}` };
  }

  async getEmployee(externalId: string): Promise<PayrollProviderEmployee | null> {
    // TODO: GET from Everee API
    console.log(`[Everee] Fetching employee: ${externalId}`);
    return null;
  }

  async submitPayroll(submission: PayrollSubmission): Promise<PayrollResult> {
    // TODO: POST to Everee API
    console.log(`[Everee] Submitting payroll for ${submission.employees.length} employees`);
    return {
      externalPayrollId: `everee_pr_${Date.now()}`,
      status: 'pending',
      grossPay: 0,
      netPay: 0,
      employerTaxes: 0,
      employeeTaxes: 0,
      deductions: 0,
    };
  }

  async getPayrollStatus(externalPayrollId: string): Promise<PayrollResult> {
    // TODO: GET from Everee API
    console.log(`[Everee] Checking status: ${externalPayrollId}`);
    return {
      externalPayrollId,
      status: 'processing',
      grossPay: 0,
      netPay: 0,
      employerTaxes: 0,
      employeeTaxes: 0,
      deductions: 0,
    };
  }

  async registerCompany(company: { name: string; ein: string; state: string }): Promise<{ externalId: string }> {
    // TODO: POST to Everee API
    console.log(`[Everee] Registering company: ${company.name}`);
    return { externalId: `everee_co_${Date.now()}` };
  }
}
