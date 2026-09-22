import * as zlib from 'zlib';

function computeCrc32(buf: Buffer): number {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return (~crc) >>> 0;
}

interface ZipEntry {
  name: string;
  content: string | Buffer;
}

export function packZip(entries: ZipEntry[]): Buffer {
  const fileRecords: Array<{
    nameBuf: Buffer;
    crc: number;
    compSize: number;
    uncompSize: number;
    offset: number;
  }> = [];
  let offset = 0;
  const parts: Buffer[] = [];

  for (const entry of entries) {
    const data = typeof entry.content === 'string' ? Buffer.from(entry.content, 'utf8') : entry.content;
    const compressed = zlib.deflateRawSync(data);
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const crc = computeCrc32(data);

    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuf.copy(localHeader, 30);

    fileRecords.push({
      nameBuf,
      crc,
      compSize: compressed.length,
      uncompSize: data.length,
      offset,
    });

    parts.push(localHeader, compressed);
    offset += localHeader.length + compressed.length;
  }

  const cdStart = offset;
  for (const rec of fileRecords) {
    const cdHeader = Buffer.alloc(46 + rec.nameBuf.length);
    cdHeader.writeUInt32LE(0x02014b50, 0);
    cdHeader.writeUInt16LE(20, 4);
    cdHeader.writeUInt16LE(20, 6);
    cdHeader.writeUInt16LE(0, 8);
    cdHeader.writeUInt16LE(8, 10);
    cdHeader.writeUInt16LE(0, 12);
    cdHeader.writeUInt16LE(0, 14);
    cdHeader.writeUInt32LE(rec.crc, 16);
    cdHeader.writeUInt32LE(rec.compSize, 20);
    cdHeader.writeUInt32LE(rec.uncompSize, 24);
    cdHeader.writeUInt16LE(rec.nameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30);
    cdHeader.writeUInt16LE(0, 32);
    cdHeader.writeUInt16LE(0, 34);
    cdHeader.writeUInt16LE(0, 36);
    cdHeader.writeUInt32LE(0, 38);
    cdHeader.writeUInt32LE(rec.offset, 42);
    rec.nameBuf.copy(cdHeader, 46);

    parts.push(cdHeader);
    offset += cdHeader.length;
  }

  const cdSize = offset - cdStart;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(fileRecords.length, 8);
  eocd.writeUInt16LE(fileRecords.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);

  parts.push(eocd);
  return Buffer.concat(parts);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function indexToColLetter(colIdx: number): string {
  let letter = '';
  let temp = colIdx;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function buildXlsx(sheetName: string, headers: string[], rows: (string | number)[][]): Buffer {
  const allStrings: string[] = [];
  const stringMap = new Map<string, number>();

  function getStringId(str: string): number {
    const existing = stringMap.get(str);
    if (existing !== undefined) return existing;
    const id = allStrings.length;
    allStrings.push(str);
    stringMap.set(str, id);
    return id;
  }

  const headerRowXml = headers
    .map((h, colIdx) => {
      const colLetter = indexToColLetter(colIdx);
      const strId = getStringId(String(h));
      return `<c r="${colLetter}1" t="s"><v>${strId}</v></c>`;
    })
    .join('');

  const rowsXml = rows
    .map((row, rowIdx) => {
      const rNum = rowIdx + 2;
      const cellXml = row
        .map((cell, colIdx) => {
          const colLetter = indexToColLetter(colIdx);
          if (cell === null || cell === undefined || cell === '') {
            const strId = getStringId('');
            return `<c r="${colLetter}${rNum}" t="s"><v>${strId}</v></c>`;
          }
          if (typeof cell === 'number') {
            return `<c r="${colLetter}${rNum}"><v>${cell}</v></c>`;
          }
          const strId = getStringId(String(cell));
          return `<c r="${colLetter}${rNum}" t="s"><v>${strId}</v></c>`;
        })
        .join('');
      return `<row r="${rNum}">${cellXml}</row>`;
    })
    .join('');

  const sheetData = `<sheetData><row r="1">${headerRowXml}</row>${rowsXml}</sheetData>`;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${sheetData}
</worksheet>`;

  const sstXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${allStrings.length}" uniqueCount="${allStrings.length}">
${allStrings.map((s) => `<si><t>${escapeXml(s)}</t></si>`).join('')}
</sst>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  return packZip([
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: rootRelsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/sharedStrings.xml', content: sstXml },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
  ]);
}
