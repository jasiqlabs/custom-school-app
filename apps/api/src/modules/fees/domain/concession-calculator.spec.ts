import { ConcessionCalculator, roundHalfUp } from './concession-calculator';

describe('ConcessionCalculator', () => {
  describe('roundHalfUp', () => {
    it('rounds 2 decimal places correctly', () => {
      expect(roundHalfUp(12.345)).toBe(12.35);
      expect(roundHalfUp(12.344)).toBe(12.34);
      expect(roundHalfUp(100)).toBe(100);
    });
  });

  describe('ConcessionCalculator.calculate', () => {
    it('handles NONE concession', () => {
      const result = ConcessionCalculator.calculate(1500, 'NONE', 0);
      expect(result.baseAmount).toBe(1500);
      expect(result.concessionAmount).toBe(0);
      expect(result.netDue).toBe(1500);
    });

    it('handles FIXED_AMOUNT concession when value <= base', () => {
      const result = ConcessionCalculator.calculate(2000, 'FIXED_AMOUNT', 500);
      expect(result.baseAmount).toBe(2000);
      expect(result.concessionAmount).toBe(500);
      expect(result.netDue).toBe(1500);
    });

    it('caps FIXED_AMOUNT concession at base amount if value > base', () => {
      const result = ConcessionCalculator.calculate(1000, 'FIXED_AMOUNT', 1500);
      expect(result.baseAmount).toBe(1000);
      expect(result.concessionAmount).toBe(1000);
      expect(result.netDue).toBe(0);
    });

    it('handles PERCENTAGE concession with roundHalfUp', () => {
      // 1550 * 15% = 232.5
      const result = ConcessionCalculator.calculate(1550, 'PERCENTAGE', 15);
      expect(result.baseAmount).toBe(1550);
      expect(result.concessionAmount).toBe(232.5);
      expect(result.netDue).toBe(1317.5);
    });

    it('handles 100% PERCENTAGE concession yielding 0 net due', () => {
      const result = ConcessionCalculator.calculate(2500, 'PERCENTAGE', 100);
      expect(result.baseAmount).toBe(2500);
      expect(result.concessionAmount).toBe(2500);
      expect(result.netDue).toBe(0);
    });

    it('caps percentage at 100% maximum', () => {
      const result = ConcessionCalculator.calculate(2000, 'PERCENTAGE', 120);
      expect(result.concessionAmount).toBe(2000);
      expect(result.netDue).toBe(0);
    });
  });
});
