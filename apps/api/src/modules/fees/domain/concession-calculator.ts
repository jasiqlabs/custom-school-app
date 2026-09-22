import type { ConcessionType } from '@custom-school/contracts';

export function roundHalfUp(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export interface ConcessionCalculationResult {
  baseAmount: number;
  concessionType: ConcessionType;
  concessionValue: number;
  concessionAmount: number;
  netDue: number;
}

export class ConcessionCalculator {
  static calculate(
    baseAmount: number,
    concessionType: ConcessionType,
    concessionValue: number
  ): ConcessionCalculationResult {
    const base = roundHalfUp(Math.max(0, Number(baseAmount)));
    const val = roundHalfUp(Math.max(0, Number(concessionValue)));

    let concessionAmount = 0;

    if (concessionType === 'FIXED_AMOUNT') {
      concessionAmount = roundHalfUp(Math.min(base, val));
    } else if (concessionType === 'PERCENTAGE') {
      const pct = Math.min(100, val);
      concessionAmount = roundHalfUp((base * pct) / 100);
    } else {
      concessionAmount = 0;
    }

    const netDue = roundHalfUp(Math.max(0, base - concessionAmount));

    return {
      baseAmount: base,
      concessionType,
      concessionValue: val,
      concessionAmount,
      netDue,
    };
  }
}
