type CellValue = string | number | null;

const TEXT_ENCODER = new TextEncoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[index] = crc;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(chunks: Uint8Array[]) {
  const output = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

function buildZip(files: Array<{ name: string; data: Uint8Array }>) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = TEXT_ENCODER.encode(file.name);
    const crc = crc32(file.data);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 26, nameBytes.length);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, file.data.length);
    writeUint32(localView, 22, file.data.length);
    local.set(nameBytes, 30);
    locals.push(local, file.data);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, file.data.length);
    writeUint32(centralView, 24, file.data.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint32(centralView, 42, offset);
    central.set(nameBytes, 46);
    centrals.push(central);
    offset += local.length + file.data.length;
  }

  const centralOffset = offset;
  const centralSize = centrals.reduce((total, chunk) => total + chunk.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  writeUint32(eocdView, 0, 0x06054b50);
  writeUint16(eocdView, 8, files.length);
  writeUint16(eocdView, 10, files.length);
  writeUint32(eocdView, 12, centralSize);
  writeUint32(eocdView, 16, centralOffset);
  return concatBytes([...locals, ...centrals, eocd]);
}

function escapeXml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function columnLetter(index: number) {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
}

function sanitizeSheetName(name: string, used: Set<string>) {
  const cleaned = name.replace(/[:\\/?*[\]]/g, '_').slice(0, 31) || 'Sheet';
  let candidate = cleaned;
  let suffix = 1;
  while (used.has(candidate)) {
    const tail = `_${suffix}`;
    candidate = `${cleaned.slice(0, Math.max(1, 31 - tail.length))}${tail}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function cellXml(column: number, row: number, value: CellValue) {
  const ref = `${columnLetter(column)}${row}`;
  if (value === null || value === '') {
    return `<c r="${ref}"/>`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  const text = String(value);
  const space = text !== text.trim() ? ' xml:space="preserve"' : '';
  return `<c r="${ref}" t="inlineStr"><is><t${space}>${escapeXml(text)}</t></is></c>`;
}

function worksheetXml(headers: string[], rows: CellValue[][]) {
  const width = Math.max(headers.length, ...rows.map((row) => row.length), 1);
  const height = rows.length + 1;
  const headerRow = `<row r="1">${headers.map((header, index) => cellXml(index, 1, header)).join('')}</row>`;
  const body = rows
    .map((row, rowIndex) => {
      const excelRow = rowIndex + 2;
      return `<row r="${excelRow}">${row.map((value, index) => cellXml(index, excelRow, value)).join('')}</row>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${columnLetter(width - 1)}${height}"/>
  <sheetData>${headerRow}${body}</sheetData>
</worksheet>`;
}

function xmlFile(content: string) {
  return { data: TEXT_ENCODER.encode(content) };
}

export function buildExcelWorkbook(sheets: Array<{ name: string; headers: string[]; rows: CellValue[][] }>) {
  const usedNames = new Set<string>();
  const namedSheets = sheets.map((sheet, index) => ({
    ...sheet,
    name: sanitizeSheetName(sheet.name, usedNames),
    path: `xl/worksheets/sheet${index + 1}.xml`,
    relId: `rId${index + 1}`,
  }));

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${namedSheets
    .map((sheet) => `<Override PartName="/${sheet.path}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join('\n  ')}
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${namedSheets
      .map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="${sheet.relId}"/>`)
      .join('\n    ')}
  </sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${namedSheets
    .map((sheet) => `<Relationship Id="${sheet.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/${sheet.path.split('/').pop()}"/>`)
    .join('\n  ')}
  <Relationship Id="rId${namedSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`;

  return buildZip([
    { name: '[Content_Types].xml', ...xmlFile(contentTypes) },
    { name: '_rels/.rels', ...xmlFile(rootRels) },
    { name: 'xl/workbook.xml', ...xmlFile(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', ...xmlFile(workbookRels) },
    { name: 'xl/styles.xml', ...xmlFile(styles) },
    ...namedSheets.map((sheet) => ({ name: sheet.path, ...xmlFile(worksheetXml(sheet.headers, sheet.rows)) })),
  ]);
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
