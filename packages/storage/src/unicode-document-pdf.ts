import { deflateSync } from 'node:zlib';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

export type DocumentPage = { svg: string; accessibleText: string };
type Rasterized = { pixels: Buffer; width: number; height: number };
const A4_W = 595;
const A4_H = 842;
const MAX_PAGES = 8;
const MAX_PIXELS = 4_000_000;

export function escapeDocumentXml(value: unknown): string {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
    }[char] || ''));
}
export function a4Svg(body: string): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842" viewBox="0 0 595 842">' +
    '<rect width="595" height="842" fill="#fff"/>' + body + '</svg>';
}
export function textSvg(x: number, y: number, value: unknown, size = 10, bold = false,
  maxWidth?: number): string {
  const safe = escapeDocumentXml(value);
  const width = maxWidth ? ' textLength="' + maxWidth + '" lengthAdjust="spacingAndGlyphs"' : '';
  return '<text x="' + x + '" y="' + y + '" font-family="Noto Sans,Noto Sans Devanagari,Noto Naskh Arabic"' +
    ' font-size="' + size + '" font-weight="' + (bold ? 700 : 400) +
    '" fill="#183153" xml:space="preserve"' + width + '>' + safe + '</text>';
}
export function ruleSvg(y: number): string {
  return '<path d="M40 ' + y + ' H555" stroke="#e2e8f0" stroke-width=".8"/>';
}
export function imageSvg(image: Buffer | null | undefined, mime: string, x: number, y: number,
  width: number, height: number): string {
  if (!image?.length) return '';
  if (image.length > 5_000_000 || !['image/png', 'image/jpeg'].includes(mime))
    throw new Error('DOCUMENT_BRANDING_INVALID');
  return '<image x="' + x + '" y="' + y + '" width="' + width + '" height="' + height +
    '" preserveAspectRatio="xMidYMid meet" href="data:' + mime + ';base64,' +
    image.toString('base64') + '"/>';
}
export function documentFontDir(): string {
  // npm --workspace apps/api|apps/worker launches with workspace CWD; Render
  // starts from the repository root. Both must locate the SAME verified assets.
  const candidates = process.env.PDF_FONT_DIR
    ? [resolve(process.env.PDF_FONT_DIR)]
    : [resolve(process.cwd(), 'assets/pdf-fonts'),
       resolve(process.cwd(), '../assets/pdf-fonts'),
       resolve(process.cwd(), '../../assets/pdf-fonts')];
  const directory = candidates.find(candidate =>
    existsSync(join(candidate, 'fonts.conf')) &&
    ['NotoSans', 'NotoSansDevanagari', 'NotoNaskhArabic']
      .every(family => existsSync(join(candidate, family + '-Regular.ttf'))));
  if (!directory) throw new Error('DOCUMENT_FONT_UNAVAILABLE');
  const config = join(directory, 'fonts.conf');
  // Set before the SVG rasterizer loads fontconfig; no network access at render time.
  process.env.FONTCONFIG_FILE = config;
  return directory;
}
function utf16Hex(value: string): string {
  const utf = Buffer.from(value, 'utf16le');
  const be = Buffer.from(utf);
  for (let i = 0; i < be.length; i += 2) {
    const swap = be[i]; be[i] = be[i + 1]; be[i + 1] = swap;
  }
  return be.toString('hex').toUpperCase();
}
function cmapForTexts(texts: string[]): string {
  const units = new Set<number>();
  for (const value of texts) {
    const utf = Buffer.from(value, 'utf16le');
    for (let i = 0; i < utf.length; i += 2) units.add(utf[i] | utf[i + 1] << 8);
  }
  const chars = Array.from(units).sort((a, b) => a - b);
  let cmap = '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n' +
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n' +
    '/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n' +
    '1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n';
  for (let i = 0; i < chars.length; i += 100) {
    const group = chars.slice(i, i + 100);
    cmap += group.length + ' beginbfchar\n';
    for (const code of group) {
      const hex = code.toString(16).toUpperCase().padStart(4, '0');
      cmap += '<' + hex + '> <' + hex + '>\n';
    }
    cmap += 'endbfchar\n';
  }
  return cmap + 'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n';
}
/**
 * Self-contained A4 PDF with shaped 180-dpi visuals AND an embedded, invisible
 * Type0 Unicode text layer (ToUnicode CMap) for text extraction and searching.
 * The visible glyphs are rasterized by librsvg/Pango/Noto, which correctly
 * handles Indic/Arabic shaping; the text layer preserves original characters.
 * Historical version-1 certificates never pass through this renderer.
 */
export function packUnicodeDocumentPdf(pages: Array<Rasterized & { accessibleText: string }>): Buffer {
  if (!pages.length || pages.length > MAX_PAGES) throw new Error('DOCUMENT_PAGE_LIMIT');
  const fontId = 3 + pages.length * 3;
  const cidId = fontId + 1;
  const descriptorId = fontId + 2;
  const cmapId = fontId + 3;
  const fontFileId = fontId + 4;
  const objects: Buffer[] = [];
  const put = (data: Buffer | string) => {
    objects.push(typeof data === 'string' ? Buffer.from(data, 'latin1') : data);
    return objects.length;
  };
  put('<< /Type /Catalog /Pages 2 0 R >>');
  put('<< /Type /Pages /Kids [' + pages.map((_, i) => (3 + i * 3) + ' 0 R').join(' ') +
    '] /Count ' + pages.length + ' >>');
  for (const page of pages) {
    if (page.width <= 0 || page.height <= 0 || page.width * page.height > MAX_PIXELS ||
        page.pixels.length !== page.width * page.height * 3)
      throw new Error('DOCUMENT_RASTER_INVALID');
    const id = objects.length + 1;
    put('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + A4_W + ' ' + A4_H +
      '] /Resources << /Font << /FU ' + fontId + ' 0 R >> /XObject << /Im0 ' + (id + 1) +
      ' 0 R >> >> /Contents ' + (id + 2) + ' 0 R >>');
    const encoded = deflateSync(page.pixels, { level: 6 });
    put(Buffer.concat([
      Buffer.from('<< /Type /XObject /Subtype /Image /Width ' + page.width +
        ' /Height ' + page.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8' +
        ' /Filter /FlateDecode /Length ' + encoded.length + ' >>\nstream\n', 'latin1'),
      encoded, Buffer.from('\nendstream', 'latin1'),
    ]));
    // The text is invisible but searchable; never draw unshaped Unicode glyphs
    // on top of the correctly rendered document image.
    const textLines = page.accessibleText.split('\n');
    if (textLines.length > 150) throw new Error('DOCUMENT_PAGE_LIMIT');
    const layers = textLines.map((line, i) =>
      'BT /FU 8 Tf 3 Tr 1 0 0 1 40 ' + Math.max(20, 770 - i * 10) +
      ' Tm <' + utf16Hex(line || ' ') + '> Tj ET').join('\n');
    const stream = 'q ' + A4_W + ' 0 0 ' + A4_H + ' 0 0 cm /Im0 Do Q\n' + layers + '\n';
    put('<< /Length ' + Buffer.byteLength(stream, 'latin1') + ' >>\nstream\n' +
      stream + 'endstream');
  }
  if (objects.length + 1 !== fontId) throw new Error('DOCUMENT_PDF_STRUCTURE_INVALID');
  put('<< /Type /Font /Subtype /Type0 /BaseFont /NotoSans-Identity-H' +
    ' /Encoding /Identity-H /DescendantFonts [' + cidId + ' 0 R]' +
    ' /ToUnicode ' + cmapId + ' 0 R >>');
  put('<< /Type /Font /Subtype /CIDFontType2 /BaseFont /NotoSans' +
    ' /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >>' +
    ' /FontDescriptor ' + descriptorId + ' 0 R /DW 1000 /CIDToGIDMap /Identity >>');
  put('<< /Type /FontDescriptor /FontName /NotoSans /Flags 4' +
    ' /FontBBox [-500 -500 1500 1500] /ItalicAngle 0' +
    ' /Ascent 900 /Descent -200 /CapHeight 700 /StemV 80' +
    ' /FontFile2 ' + fontFileId + ' 0 R >>');
  const cmap = Buffer.from(cmapForTexts(pages.map(p => p.accessibleText)), 'ascii');
  put(Buffer.concat([Buffer.from('<< /Length ' + cmap.length + ' >>\nstream\n', 'latin1'),
    cmap, Buffer.from('\nendstream', 'latin1')]));
  const font = readFileSync(join(documentFontDir(), 'NotoSans-Regular.ttf'));
  const compressedFont = deflateSync(font, { level: 6 });
  put(Buffer.concat([
    Buffer.from('<< /Length ' + compressedFont.length + ' /Length1 ' + font.length +
      ' /Filter /FlateDecode >>\nstream\n', 'latin1'),
    compressedFont, Buffer.from('\nendstream', 'latin1'),
  ]));
  const parts: Buffer[] = [Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  const offsets = [0];
  let totalBytes = parts[0].length;
  for (let i = 0; i < objects.length; i++) {
    offsets.push(totalBytes);
    const part = Buffer.concat([
      Buffer.from((i + 1) + ' 0 obj\n', 'latin1'),
      objects[i], Buffer.from('\nendobj\n', 'latin1'),
    ]);
    totalBytes += part.length;
    parts.push(part);
  }
  const xrefOffset = totalBytes;
  let xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) xref += String(offset).padStart(10, '0') + ' 00000 n \n';
  xref += 'trailer\n<< /Size ' + (objects.length + 1) +
    ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';
  parts.push(Buffer.from(xref, 'latin1'));
  return Buffer.concat(parts);
}


export async function rasterizeUnicodePages(
  pages: DocumentPage[],
  rasterize: (svg: string) => Promise<Rasterized>,
): Promise<Buffer> {
  if (!pages.length || pages.length > MAX_PAGES) throw new Error('DOCUMENT_PAGE_LIMIT');
  documentFontDir();
  const rendered: Array<Rasterized & { accessibleText: string }> = [];
  for (const page of pages) {
    if (page.svg.length > 15_000_000 || page.accessibleText.length > 18_000)
      throw new Error('DOCUMENT_PAGE_LIMIT');
    const image = await rasterize(page.svg);
    rendered.push({ ...image, accessibleText: page.accessibleText });
  }
  return packUnicodeDocumentPdf(rendered);
}
