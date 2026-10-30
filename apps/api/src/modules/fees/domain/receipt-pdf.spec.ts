import { makeTwoCopyReceiptPdf } from './receipt-pdf';

describe('FIX-11: immutable two-copy receipt PDF', () => {
  const receipt: any = {
    id: 'receipt-1', receiptNumber: 'REC-2026-00001',
    schoolName: 'Sample School', schoolAddress: 'Sample Road',
    studentName: 'Test Student', studentCode: 'STU-0001', className: '8A',
    feeMonth: '2026-10', paymentDate: '2026-10-30', paymentMode: 'CASH',
    amountPaidThisReceipt: 650, reference: 'manual',
    collectorName: 'Test Operator', status: 'ACTIVE',
    items: [
      { description: 'Tuition', period: '2026-10', paidAmount: 450 },
      { description: 'Transport', period: '2026-10', paidAmount: 200 },
    ],
  };
  it('is an A4 PDF with exactly two copies and one original receipt number', () => {
    const out = makeTwoCopyReceiptPdf(receipt);
    const source = out.toString('latin1');
    expect(source.startsWith('%PDF-1.4')).toBe(true);
    expect(source).toContain('/Count 2');
    expect(source).toContain('OFFICE COPY');
    expect(source).toContain('STUDENT COPY');
    expect((source.match(/REC-2026-00001/g) || []).length).toBe(2);
    expect((source.match(/Amount collected: Rs. 650.00/g) || []).length).toBe(2);
    expect(source).toContain('startxref');
  });
  it('shows VOIDED without rewriting the original amount', () => {
    const pdf = makeTwoCopyReceiptPdf({ ...receipt, status: 'VOIDED', voidReason: 'Test cancellation' });
    const source = pdf.toString('latin1');
    expect((source.match(/VOIDED - Test cancellation/g) || []).length).toBe(2);
    expect((source.match(/REC-2026-00001/g) || []).length).toBe(2);
  });
});
