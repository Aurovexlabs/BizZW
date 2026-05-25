/**
 * Lightweight CSV generator — no external deps, just plain string building.
 * Used for inventory export and sales report downloads.
 */

type CsvRow = Record<string, string | number | boolean | null | undefined>;

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, newline, or double-quote → wrap in double-quotes and escape inner quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(rows: CsvRow[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(',');
  const body = rows.map((row) =>
    columns.map((c) => escapeCsvCell(row[c.key])).join(',')
  );
  return [header, ...body].join('\r\n');
}

export function csvHeaders(filename: string): Record<string, string> {
  return {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  };
}

// ─── Inventory CSV columns ────────────────────────────────────

export const INVENTORY_CSV_COLUMNS = [
  { key: 'name', label: 'Product Name' },
  { key: 'sku', label: 'SKU' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'category', label: 'Category' },
  { key: 'costPrice', label: 'Cost Price' },
  { key: 'sellPrice', label: 'Sell Price' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'lowStockThreshold', label: 'Low Stock Alert' },
  { key: 'isActive', label: 'Active' },
];

// ─── Sales CSV columns ────────────────────────────────────────

export const SALES_CSV_COLUMNS = [
  { key: 'saleNumber', label: 'Sale Number' },
  { key: 'receiptNumber', label: 'Receipt' },
  { key: 'createdAt', label: 'Date & Time' },
  { key: 'items', label: 'Items' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'discount', label: 'Discount' },
  { key: 'total', label: 'Total' },
  { key: 'currency', label: 'Currency' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'change', label: 'Change' },
];

// ─── Expense CSV columns ──────────────────────────────────────

export const EXPENSE_CSV_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'currency', label: 'Currency' },
  { key: 'date', label: 'Date' },
  { key: 'notes', label: 'Notes' },
];
