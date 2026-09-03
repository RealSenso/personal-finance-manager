import { Bucket, KeywordRule, ParsedCsvRow, Transaction } from '../types';

export function parseBankCsv(
  csvContent: string,
  rules: KeywordRule[],
  buckets: Bucket[]
): ParsedCsvRow[] {
  const lines = csvContent
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return [];
  }

  // Detect header line (find line with keywords like date, description, narration, debit, withdrawal, amount)
  let headerIndex = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const lineLower = lines[i].toLowerCase();
    if (
      (lineLower.includes('date') || lineLower.includes('txn')) &&
      (lineLower.includes('narration') ||
        lineLower.includes('description') ||
        lineLower.includes('particulars') ||
        lineLower.includes('remark') ||
        lineLower.includes('details'))
    ) {
      headerIndex = i;
      break;
    }
  }

  const rawHeaders = splitCsvLine(lines[headerIndex]).map((h) => h.toLowerCase().trim());

  let dateCol = rawHeaders.findIndex((h) => h.includes('date') || h.includes('txn date'));
  let descCol = rawHeaders.findIndex(
    (h) =>
      h.includes('narration') ||
      h.includes('description') ||
      h.includes('particulars') ||
      h.includes('remarks') ||
      h.includes('details')
  );
  let debitCol = rawHeaders.findIndex(
    (h) => h.includes('debit') || h.includes('withdrawal') || h.includes('dr')
  );
  let creditCol = rawHeaders.findIndex(
    (h) => h.includes('credit') || h.includes('deposit') || h.includes('cr')
  );
  let amountCol = rawHeaders.findIndex(
    (h) => (h.includes('amount') || h.includes('txn amount')) && !h.includes('balance')
  );

  // Fallbacks if not recognized
  if (dateCol === -1) dateCol = 0;
  if (descCol === -1) descCol = 1;
  if (debitCol === -1 && amountCol === -1) debitCol = 2;

  const parsedRows: ParsedCsvRow[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = splitCsvLine(rawLine);
    if (cols.length <= 1) continue;

    const rawDate = cols[dateCol] || '';
    const description = cols[descCol] || 'Bank Transaction';

    let debitAmount = 0;
    let creditAmount = 0;

    if (debitCol !== -1 && cols[debitCol]) {
      debitAmount = cleanAmount(cols[debitCol]);
    }
    if (creditCol !== -1 && cols[creditCol]) {
      creditAmount = cleanAmount(cols[creditCol]);
    }
    if (amountCol !== -1 && debitAmount === 0 && creditAmount === 0 && cols[amountCol]) {
      const amt = cleanAmount(cols[amountCol]);
      if (amt < 0) {
        debitAmount = Math.abs(amt);
      } else {
        // Assume debit if normal expense export, or check text
        debitAmount = amt;
      }
    }

    const isDebit = debitAmount > 0 || (debitAmount === 0 && creditAmount === 0);
    const amount = isDebit ? debitAmount : creditAmount;
    if (amount <= 0) continue;

    // Normalize date (Supports DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.)
    const normalizedDate = normalizeDateString(rawDate);

    // Rule-based Keyword matching
    const match = matchTransactionToBucket(description, rules, buckets);

    parsedRows.push({
      id: `csv-${i}-${Date.now()}`,
      rawDate,
      date: normalizedDate,
      description,
      amount,
      type: isDebit ? 'debit' : 'credit',
      suggestedBucketId: match.bucketId,
      matchedKeyword: match.keyword,
      confidence: match.bucketId ? 'high' : 'manual',
      selectedBucketId: match.bucketId,
      excluded: false,
    });
  }

  return parsedRows;
}

// Split a CSV row while respecting quoted commas
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function cleanAmount(raw: string): number {
  if (!raw) return 0;
  // Remove currency symbols, commas, spaces
  const cleaned = raw.replace(/[₹$,\s]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.abs(val);
}

function normalizeDateString(rawDate: string): string {
  const trimmed = rawDate.trim();
  if (!trimmed) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  // Try Date.parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Fallback to current date
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function matchTransactionToBucket(
  text: string,
  rules: KeywordRule[],
  buckets: Bucket[]
): { bucketId: string | null; keyword?: string } {
  const lower = text.toLowerCase();
  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const rule of sortedRules) {
    const kw = rule.keyword.toLowerCase().trim();
    if (kw && lower.includes(kw)) {
      const bucketExists = buckets.some((b) => b.id === rule.bucketId && !b.isArchived);
      if (bucketExists) {
        return { bucketId: rule.bucketId, keyword: rule.keyword };
      }
    }
  }

  return { bucketId: null };
}

// Generate sample CSV for the user to test download or import
export function generateSampleBankCsv(): string {
  return `Txn Date,Narration / Description,Debit,Credit,Balance
01/09/2026,SWIGGY INSTAMART GURGAON,450.00,,21950.00
01/09/2026,ANTHROPIC CLAUDE PRO SUB,1999.00,,19951.00
02/09/2026,ZOMATO DINING NEW DELHI,1200.00,,18751.00
02/09/2026,JIO PREPAID 84 DAYS DATA,899.00,,17852.00
03/09/2026,BLINKIT QUICK COMMERCE,320.00,,17532.00
03/09/2026,UPI-HOSTEL SECURITY DEPOSIT,5000.00,,12532.00
03/09/2026,APPLE STORE INDIA CHARGE,2500.00,,10032.00
03/09/2026,METRO RECHARGE DELHI,200.00,,9832.00
03/09/2026,STIPEND CREDIT - COLLEGE RESEARCH,,12400.00,22232.00
`;
}

// CSV Exporters
export function exportTransactionsToCsv(
  transactions: Transaction[],
  buckets: Bucket[],
  filename = 'expenses_export.csv'
): void {
  const bucketMap = new Map(buckets.map((b) => [b.id, b.name]));

  const headers = ['Date', 'Type', 'Bucket', 'Amount (INR)', 'Note / Merchant', 'Source'];
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    `"${(bucketMap.get(t.bucketId) || 'Uncategorized').replace(/"/g, '""')}"`,
    t.amount,
    `"${(t.note || t.merchant || '').replace(/"/g, '""')}"`,
    t.source,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportFullJsonBackup(data: {
  income: unknown;
  buckets: unknown;
  transactions: unknown;
  rules: unknown;
}): void {
  const json = JSON.stringify(data, null, 2);
  const now = new Date().toISOString().slice(0, 10);
  triggerDownload(json, `finance_backup_${now}.json`, 'application/json');
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
