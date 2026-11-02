import { ReceiptNumberAllocator } from './receipt-number-allocator';

describe('ReceiptNumberAllocator — Error Drafts ERR-03', () => {
  it('casts the legacy school UUID explicitly when inserting the sequence', async () => {
    const schoolId = '11111111-1111-4111-8111-111111111111';
    const raw = jest.fn().mockResolvedValue([{ last_value: 7 }]);
    const tx: any = {
      school: { findUnique: jest.fn().mockResolvedValue({ receiptNumberPolicy: 'LEGACY' }) },
      $queryRaw: raw,
      feePayment: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const result = await new ReceiptNumberAllocator().allocateReceiptNumber(tx, schoolId);
    expect(result).toMatch(/^REC-\d{4}-00007$/);
    expect(raw).toHaveBeenCalledTimes(1);
    expect(raw.mock.calls[0][0].join('$')).toContain('VALUES ($::uuid, 1, now())');
    expect(raw.mock.calls[0][1]).toBe(schoolId);
  });

  it('skips a duplicate receipt number without a second charge', async () => {
    const raw = jest.fn()
      .mockResolvedValueOnce([{ last_value: 1 }])
      .mockResolvedValueOnce([{ last_value: 2 }]);
    const tx: any = {
      school: { findUnique: jest.fn().mockResolvedValue(null) },
      $queryRaw: raw,
      feePayment: { findUnique: jest.fn().mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce(null) },
    };
    const result = await new ReceiptNumberAllocator().allocateReceiptNumber(tx, '11111111-1111-4111-8111-111111111111');
    expect(result).toMatch(/^REC-\d{4}-00002$/);
    expect(raw).toHaveBeenCalledTimes(2);
  });
  it('casts the school UUID in configured receipt numbering as well', async () => {
    const schoolId = '11111111-1111-4111-8111-111111111111';
    const raw = jest.fn().mockResolvedValue([{ last_value: 1 }]);
    const tx: any = {
      school: { findUnique: jest.fn().mockResolvedValue({
        receiptNumberPolicy: 'CONTINUOUS', receiptNumberPrefix: 'REC',
      }) },
      $queryRaw: raw,
      feePayment: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const result = await new ReceiptNumberAllocator().allocateReceiptNumber(tx, schoolId);
    expect(result).toBe('REC-00001');
    expect(raw).toHaveBeenCalledTimes(1);
    expect(raw.mock.calls[0][0].join('$'))
      .toContain('VALUES ($::uuid,$,$,1)');
    expect(raw.mock.calls[0][1]).toBe(schoolId);
  });

});
