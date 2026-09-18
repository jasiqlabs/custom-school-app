import { BadRequestException } from '@nestjs/common';
import { StudentDomainValidator } from './student.validator';

describe('StudentDomainValidator', () => {
  let validator: StudentDomainValidator;
  let mockPrisma: any;

  beforeEach(() => {
    validator = new StudentDomainValidator();
  });

  describe('Aadhaar Validation (Verhoeff)', () => {
    it('accepts valid 12-digit Aadhaar number with valid Verhoeff checksum', () => {
      // 999999990019 is a valid Verhoeff number
      const result = validator.validateAadhaar('9999 9999 0019');
      expect(result.clean).toBe('999999990019');
      expect(result.last4).toBe('0019');
    });

    it('rejects invalid Aadhaar length or non-digits', () => {
      expect(() => validator.validateAadhaar('1234')).toThrow(BadRequestException);
      expect(() => validator.validateAadhaar('12345678901A')).toThrow(BadRequestException);
    });

    it('rejects checksum corruption', () => {
      // Alter last digit of 999999990019 to 8
      expect(() => validator.validateAadhaar('999999990018')).toThrow(BadRequestException);
    });
  });

  describe('Age & DOB Validation', () => {
    it('accepts birth date within allowed age boundaries (2.5 to 25 yrs)', () => {
      const validDate = new Date();
      validDate.setFullYear(validDate.getFullYear() - 7);
      const dobStr = validDate.toISOString().split('T')[0];

      const parsed = validator.validateDob(dobStr);
      expect(parsed).toBeInstanceOf(Date);
    });

    it('rejects infant below 2.5 years', () => {
      const infantDate = new Date();
      infantDate.setFullYear(infantDate.getFullYear() - 1);
      const dobStr = infantDate.toISOString().split('T')[0];

      expect(() => validator.validateDob(dobStr)).toThrow(BadRequestException);
    });

    it('rejects adult above 25 years', () => {
      const adultDate = new Date();
      adultDate.setFullYear(adultDate.getFullYear() - 26);
      const dobStr = adultDate.toISOString().split('T')[0];

      expect(() => validator.validateDob(dobStr)).toThrow(BadRequestException);
    });
  });

  describe('Concession Validation', () => {
    it('accepts NONE concession with 0 value', () => {
      expect(() => validator.validateConcession('NONE', 0)).not.toThrow();
    });

    it('rejects percentage concession > 100', () => {
      expect(() => validator.validateConcession('PERCENTAGE', 105)).toThrow(BadRequestException);
    });

    it('rejects negative concession value', () => {
      expect(() => validator.validateConcession('FIXED_AMOUNT', -500)).toThrow(BadRequestException);
    });
  });

  describe('Masking Utilities', () => {
    it('masks Aadhaar preserving only last 4 digits', () => {
      expect(validator.maskAadhaar('1234')).toBe('XXXX-XXXX-1234');
    });

    it('masks PAN keeping last 5 characters masked prefix', () => {
      expect(validator.maskPan('ABCDE1234F')).toBe('XXXXX1234F');
    });

    it('masks Bank Account number leaving only last 4 visible', () => {
      expect(validator.maskAccountNumber('123456789012')).toBe('XXXXXX9012');
    });
  });
});
