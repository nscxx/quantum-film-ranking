type CellValue = string | number | null;

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function cellXml(value: CellValue) {
  if (value === null || value === '') {
    return '<Cell><Data ss:Type="String"></Data></Cell>';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

function sheetXml(name: string, headers: string[], rows: CellValue[][]) {
  const headerRow = `<Row>${headers.map((header) => cellXml(header)).join('')}</Row>`;
  const body = rows.map((row) => `<Row>${row.map((value) => cellXml(value)).join('')}</Row>`).join('');
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${headerRow}${body}</Table></Worksheet>`;
}

export function buildExcelXmlWorkbook(sheets: Array<{ name: string; headers: string[]; rows: CellValue[][] }>) {
  const worksheets = sheets.map((sheet) => sheetXml(sheet.name, sheet.headers, sheet.rows)).join('');
  return `\uFEFF<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheets}
</Workbook>`;
}

export function formatShanghaiDateTime(value: string | null) {
  if (!value) return '';
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')} ${read('hour')}:${read('minute')}:${read('second')}`;
}
