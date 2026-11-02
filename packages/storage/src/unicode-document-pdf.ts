import { deflateSync } from 'node:zlib';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

export type DocumentPage = { svg: string; accessibleText: string };
type Rasterized = { pixels: Buffer; width: number; height: number };
const A4_W = 595;
const A4_H = 842;
const MAX_PAGES = 16;
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
function actualText(value: string): string {
  // PDF's ActualText marked content associates the image with its semantic Unicode text.
  // Unicode text is bounded and represented as UTF-16BE with BOM.
  const chars = Array.from(value.slice(0, 18000));
  const units: number[] = [0xfe, 0xff];
  for (const codePoint of chars) {
    const u16 = Buffer.from(codePoint, 'utf16le');
    for (let i = 0; i < u16.length; i += 2) units.push(u16[i + 1], u16[i]);
  }
  return Buffer.from(units).toString('hex').toUpperCase();
}
/**
 * Build self-contained A4 PDF image pages with an accessible Unicode ActualText layer.
 * No external binaries, network calls, generated HTML or in-memory unbounded caches.
 * Images are 180 dpi, visually script-shaped by librsvg/Pango using pinned Noto fonts.
 * This is visual printing plus semantic text, not a true vector embedded-font document.
 */
export function packUnicodeDocumentPdf(pages: Rasterized & { accessibleText: string } | Array<Rasterized & {
  accessibleText: string
}>): Buffer {
  const list = Array.isArray(pages) ? pages : [pages];
  if (!list.length || list.length > MAX_PAGES) throw new Error('DOCUMENT_PAGE_LIMIT');
  const objects: Buffer[] = [];
  const put = (data: Buffer | string) => {
    objects.push(typeof data === 'string' ? Buffer.from(data, 'latin1') : data);
    return objects.length;
  };
  put('<< /Type /Catalog /Pages 2 0 R >>');
  put('<< /Type /Pages /Kids [' + list.map((_, i) => (3 + i * 3) + ' 0 R').join(' ') +
    '] /Count ' + list.length + ' >>');
  for (const page of list) {
    if (page.width <= 0 || page.height <= 0 || page.width * page.height > MAX_PIXELS ||
        page.pixels.length !== page.width * page.height * 3)
      throw new Error('DOCUMENT_RASTER_INVALID');
    const id = objects.length + 1;
    put('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + A4_W + ' ' + A4_H +
      '] /Resources << /XObject << /Im0 ' + (id + 1) +
      ' 0 R >> >> /Contents ' + (id + 2) + ' 0 R >>');
    const encoded = deflateSync(page.pixels, { level: 6 });
    put(Buffer.concat([
      Buffer.from('<< /Type /XObject /Subtype /Image /Width ' + page.width +
        ' /Height ' + page.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8' +
        ' /Filter /FlateDecode /Length ' + encoded.length + ' >>\nstream\n', 'latin1'),
      encoded, Buffer.from('\nendstream', 'latin1'),
    ]));
    const stream = '/Span << /ActualText <' + actualText(page.accessibleText) +
      '> >> BDC\nq ' + A4_W + ' 0 0 ' + A4_H +
      ' 0 0 cm /Im0 Do Q\nEMC\n';
    put('<< /Length ' + Buffer.byteLength(stream, 'latin1') + ' >>\nstream\n' +
      stream + 'endstream');
  }
  let pdf = Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n', 'latin1');
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf = Buffer.concat([pdf, Buffer.from((i + 1) + ' 0 obj\n', 'latin1'),
      objects[i], Buffer.from('\nendobj\n', 'latin1')]);
  }
  const xrefOffset = pdf.length;
  let xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) xref += String(offset).padStart(10, '0') + ' 00000 n \n';
  xref += 'trailer\n<< /Size ' + (objects.length + 1) +
    ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';
  return Buffer.concat([pdf, Buffer.from(xref, 'latin1')]);
}


export async function rasterizeUnicodePages(
  pages: DocumentPage[],
  rasterize: (svg: string) => Promise<Rasterized>,
): Promise<Buffer> {
  if (!pages.length || pages.length > MAX_PAGES) throw new Error('DOCUMENT_PAGE_LIMIT');
  documentFontDir();
  const rendered: Array<Rasterized & { accessibleText: string }> = [];
  for (const page of pages) {
    if (page.svg.length > 300_000 || page.accessibleText.length > 18_000)
      throw new Error('DOCUMENT_PAGE_LIMIT');
    const image = await rasterize(page.svg);
    rendered.push({ ...image, accessibleText: page.accessibleText });
  }
  return packUnicodeDocumentPdf(rendered);
}
