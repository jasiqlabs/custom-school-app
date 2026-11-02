import { buildUnicodeReceiptPages } from './unicode-receipt-pdf';

describe('FIX-11 Unicode receipt layouts (pure, no font/network needed)', () => {
  const receipt: any = {
    receiptNumber: 'REC-2026-000001', schoolName: 'दिल्ली मदरसा स्कूल',
    schoolAddress: 'Main Road, Delhi', studentName: 'محمد احمد',
    studentCode: 'STU-0001', className: '8 A', feeMonth: '2026-11',
    paymentDate: '2026-11-02', paymentMode: 'CASH',
    amountPaidThisReceipt: 2500, status: 'ACTIVE', reference: 'Cash',
    collectorName: 'José Fernandes', items: [
      { description: 'Tuition', period: '2026-11', paidAmount: 800 },
      { description: 'Books', period: '2026-11', paidAmount: 900 },
      { description: 'Transport', period: '2026-11', paidAmount: 800 },
    ],
  };
  it('keeps both school and student Unicode names in Office and Student copies', () => {
    const pages = buildUnicodeReceiptPages(receipt);
    expect(pages).toHaveLength(2);
    expect(pages[0].accessibleText).toContain('दिल्ली मदरसा स्कूल');
    expect(pages[0].accessibleText).toContain('محمد احمد');
    expect(pages[0].accessibleText).toContain('José Fernandes');
    expect(pages[0].accessibleText).toContain('OFFICE COPY');
    expect(pages[1].accessibleText).toContain('STUDENT COPY');
    for (const page of pages) {
      expect(page.accessibleText).toContain('REC-2026-000001');
      expect(page.accessibleText).toContain('2500.00');
      expect(page.svg).not.toContain('undefined');
    }
  });

  it('prints 25 ordinary allocations without losing a line or a third copy', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      description: 'Fee line ' + i, paidAmount: 100, period: '2026-11',
    }));
    const pages = buildUnicodeReceiptPages({ ...receipt, items });
    expect(pages).toHaveLength(2);
    for (const page of pages) {
      expect((page.accessibleText.match(/Fee line \d+/g) || []).length).toBe(25);
      expect(page.accessibleText).toContain('Rs. 2500.00');
    }
  });

  it('escapes hostile names as XML rather than injecting SVG/HTML', () => {
    const pages = buildUnicodeReceiptPages({ ...receipt, studentName: '<script>alert("x")</script> & Dev' });
    const svg = pages[0].svg;
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&amp; Dev');
  });

  it('fails closed for impossible school names instead of silently clipping identity', () => {
    expect(() => buildUnicodeReceiptPages({
      ...receipt, schoolName: 'An extremely long and unusual school name '.repeat(25),
    })).toThrow('DOCUMENT_LAYOUT_OVERFLOW');
  });
});
