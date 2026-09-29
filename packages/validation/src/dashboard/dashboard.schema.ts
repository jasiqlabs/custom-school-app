import { z } from 'zod';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const FEE_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const feeCollectionQuerySchema = z.object({
  from: z.string().regex(ISO_DATE_REGEX, 'from must be YYYY-MM-DD').optional(),
  to: z.string().regex(ISO_DATE_REGEX, 'to must be YYYY-MM-DD').optional(),
}).refine(
  (data) => {
    if (data.from && data.to) {
      const fromDate = new Date(data.from);
      const toDate = new Date(data.to);
      if (toDate < fromDate) return false;
      const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 366;
    }
    return true;
  },
  { message: 'Date range cannot exceed 366 days and toDate must be >= fromDate' }
);

export const feeDuesQuerySchema = z.object({
  feeMonth: z.string().regex(FEE_MONTH_REGEX, 'feeMonth must be YYYY-MM').optional(),
});

export const feeChartQuerySchema = z.object({
  from: z.string().regex(ISO_DATE_REGEX, 'from must be YYYY-MM-DD').optional(),
  to: z.string().regex(ISO_DATE_REGEX, 'to must be YYYY-MM-DD').optional(),
}).refine(
  (data) => {
    if (data.from && data.to) {
      const fromDate = new Date(data.from);
      const toDate = new Date(data.to);
      if (toDate < fromDate) return false;
      const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 366;
    }
    return true;
  },
  { message: 'Date range cannot exceed 366 days and toDate must be >= fromDate' }
);

export const transportDashboardQuerySchema = z.object({
  businessDate: z.string().regex(ISO_DATE_REGEX, 'businessDate must be YYYY-MM-DD').optional(),
});

export type FeeCollectionQueryInput = z.infer<typeof feeCollectionQuerySchema>;
export type FeeDuesQueryInput = z.infer<typeof feeDuesQuerySchema>;
export type FeeChartQueryInput = z.infer<typeof feeChartQuerySchema>;
export type TransportDashboardQueryInput = z.infer<typeof transportDashboardQuerySchema>;
