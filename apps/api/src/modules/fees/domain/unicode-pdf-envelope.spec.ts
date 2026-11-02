import { packUnicodeDocumentPdf } from '@custom-school/storage';

describe('Unicode PDF envelope — bounded pages, embedded font and ToUnicode extraction', () => {
  // Run npm run prepare:pdf-fonts before Jest. This test must never download files.
  it('produces a PDF with 2 A4 pages and one embedded searchable Unicode font', () => {
    const blank = Buffer.alloc(3 * 2 * 2, 255);
    const pdf = packUnicodeDocumentPdf([
      { pixels: blank, width: 2, height: 2, accessibleText: 'दिल्ली विद्यालय\nStudent A' },
      { pixels: blank, width: 2, height: 2, accessibleText: 'محمد احمد\nSTU-0001' },
    ]);
    const source = pdf.toString('latin1');
    expect(source.startsWith('%PDF-1.7')).toBe(true);
    expect(source).toContain('/Count 2');
    expect(source).toContain('/Subtype /Type0');
    expect(source).toContain('/CIDFontType2');
    expect(source).toContain('/FontFile2');
    expect(source).toContain('/ToUnicode');
    expect(source).toContain('begincmap');
    expect(source).toContain('startxref');
    expect(pdf.length).toBeGreaterThan(10000);
  });

  it('rejects invalid image lengths before rendering a PDF', () => {
    expect(() => packUnicodeDocumentPdf([
      { pixels: Buffer.alloc(2), width: 4, height: 4, accessibleText: 'test' },
    ])).toThrow('DOCUMENT_RASTER_INVALID');
  });

  it('rejects unbounded page counts rather than exhausting memory', () => {
    const pages = Array.from({ length: 9 }, () => ({
      pixels: Buffer.alloc(12), width: 2, height: 2, accessibleText: 'test',
    }));
    expect(() => packUnicodeDocumentPdf(pages)).toThrow('DOCUMENT_PAGE_LIMIT');
  });
});
