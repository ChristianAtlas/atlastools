/**
 * Tiny CSV utilities — escapes per RFC 4180 and triggers a browser download.
 * Values that contain commas, quotes, or newlines are wrapped in double quotes
 * with embedded quotes doubled.
 */
export type CsvCell = string | number | null | undefined;

export function escapeCsvCell(v: CsvCell): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(headers: string[], rows: CsvCell[][]): string {
  const head = headers.map(escapeCsvCell).join(',');
  const body = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
  return body ? `${head}\r\n${body}\r\n` : `${head}\r\n`;
}

export function downloadCsv(filename: string, csv: string) {
  // Prepend BOM so Excel detects UTF-8 correctly
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}