// Shared SSN / ITIN / EIN validation. Mirrors the server-side
// public.validate_full_tin() function so the client and database
// reject the same patterns with the same error messages.

export type TaxIdType = 'ssn' | 'itin' | 'ein';

export interface TaxIdValidationResult {
  ok: boolean;
  /** Stripped, digit-only representation (≤9 chars). */
  digits: string;
  /** Human-readable error message, or null when valid. */
  error: string | null;
}

const INVALID_EIN_PREFIXES = new Set([
  0, 7, 8, 9, 17, 18, 19, 28, 29, 49, 78, 79, 89,
]);

export function stripTaxId(raw: string): string {
  return (raw ?? '').replace(/\D/g, '').slice(0, 9);
}

export function formatTaxId(raw: string, type: TaxIdType): string {
  const d = stripTaxId(raw);
  if (type === 'ein') {
    if (d.length <= 2) return d;
    return `${d.slice(0, 2)}-${d.slice(2)}`;
  }
  // SSN / ITIN: ###-##-####
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export function validateTaxId(type: TaxIdType, raw: string): TaxIdValidationResult {
  const digits = stripTaxId(raw);
  if (digits.length === 0) {
    return { ok: false, digits, error: 'Tax ID is required.' };
  }
  if (digits.length !== 9) {
    return {
      ok: false,
      digits,
      error: `Enter all 9 digits (got ${digits.length}).`,
    };
  }

  if (type === 'ssn') {
    const area = digits.slice(0, 3);
    const grp = digits.slice(3, 5);
    const serial = digits.slice(5, 9);
    if (area === '000' || area === '666' || area.startsWith('9')) {
      return {
        ok: false,
        digits,
        error: 'Invalid SSN: the first three digits cannot be 000, 666, or start with 9.',
      };
    }
    if (grp === '00') {
      return { ok: false, digits, error: 'Invalid SSN: the middle two digits cannot be 00.' };
    }
    if (serial === '0000') {
      return { ok: false, digits, error: 'Invalid SSN: the last four digits cannot be 0000.' };
    }
    return { ok: true, digits, error: null };
  }

  if (type === 'itin') {
    const area = digits.slice(0, 3);
    const grp = parseInt(digits.slice(3, 5), 10);
    const serial = digits.slice(5, 9);
    if (!area.startsWith('9')) {
      return { ok: false, digits, error: 'Invalid ITIN: must begin with the digit 9.' };
    }
    const validGroup =
      (grp >= 50 && grp <= 65) ||
      (grp >= 70 && grp <= 88) ||
      (grp >= 90 && grp <= 92) ||
      (grp >= 94 && grp <= 99);
    if (!validGroup) {
      return {
        ok: false,
        digits,
        error: 'Invalid ITIN: middle two digits must be in 50–65, 70–88, 90–92, or 94–99.',
      };
    }
    if (serial === '0000') {
      return { ok: false, digits, error: 'Invalid ITIN: the last four digits cannot be 0000.' };
    }
    return { ok: true, digits, error: null };
  }

  // EIN
  const prefix = parseInt(digits.slice(0, 2), 10);
  if (INVALID_EIN_PREFIXES.has(prefix)) {
    return {
      ok: false,
      digits,
      error: `Invalid EIN: prefix ${digits.slice(0, 2)} is not issued by the IRS.`,
    };
  }
  if (digits.slice(2, 9) === '0000000') {
    return {
      ok: false,
      digits,
      error: 'Invalid EIN: the last seven digits cannot all be zero.',
    };
  }
  return { ok: true, digits, error: null };
}

/** Type-aware example shown in input placeholders. */
export function taxIdPlaceholder(type: TaxIdType): string {
  return type === 'ein' ? '12-3456789' : '123-45-6789';
}

/** Friendly display name for the type. */
export function taxIdLabel(type: TaxIdType): string {
  return type === 'ein' ? 'EIN' : type === 'itin' ? 'ITIN' : 'SSN';
}
