import { DashboardService } from './dashboard.service';
import { DashboardCacheService } from '../infrastructure/dashboard-cache.service';
import type {
  StudentsPublicFacade,
  FeesPublicFacade,
  TransportPublicFacade,
} from '@custom-school/contracts';

describe('DashboardService', () => {
  let service: DashboardService;
  let cache: DashboardCacheService;
  let mockStudentsFacade: jest.Mocked<StudentsPublicFacade>;
  let mockFeesFacade: jest.Mocked<FeesPublicFacade>;
  let mockTransportFacade: jest.Mocked<TransportPublicFacade>;

  beforeEach(() => {
    cache = new DashboardCacheService();

    mockStudentsFacade = {
      searchForPlatformTc: jest.fn(),
      getTcSnapshot: jest.fn(),
      countActiveEnrollment: jest.fn(),
      getSchoolPopulationSummary: jest.fn(),
      getStudentDashboardSummary: jest.fn(),
    } as any;

    mockFeesFacade = {
      getStudentFeeSummary: jest.fn(),
      getCollectionTotal: jest.fn(),
      getOutstandingTotal: jest.fn(),
      getCollectionBuckets: jest.fn(),
      ensureStudentDues: jest.fn(),
      syncConcessionDues: jest.fn(),
    } as any;

    mockTransportFacade = {
      getStudentTransportSummary: jest.fn(),
      getActiveChoices: jest.fn(),
      getEffectiveSummary: jest.fn(),
      getEffectiveCounts: jest.fn(),
    } as any;

    service = new DashboardService(
      mockStudentsFacade,
      mockFeesFacade,
      mockTransportFacade,
      cache,
    );
  });

  describe('Student Summary (US-006-001 / VT-006-001, VT-006-002, VT-006-004)', () => {
    it('returns AVAILABLE student counts when facade succeeds', async () => {
      mockStudentsFacade.getStudentDashboardSummary.mockResolvedValueOnce({
        availability: 'AVAILABLE',
        total: 150,
        active: 140,
        inactive: 10,
        activeBoys: 75,
        activeGirls: 65,
      });

      const res = await service.getStudentSummary('school-1');

      expect(res.availability).toBe('AVAILABLE');
      expect(res.data).toEqual({
        total: 150,
        active: 140,
        inactive: 10,
      });
      expect(res.generatedAt).toBeDefined();
    });

    it('returns AVAILABLE gender counts when facade succeeds', async () => {
      mockStudentsFacade.getStudentDashboardSummary.mockResolvedValueOnce({
        availability: 'AVAILABLE',
        total: 100,
        active: 100,
        inactive: 0,
        activeBoys: 60,
        activeGirls: 40,
      });

      const res = await service.getGenderSummary('school-1');

      expect(res.availability).toBe('AVAILABLE');
      expect(res.data).toEqual({
        activeBoys: 60,
        activeGirls: 40,
      });
    });

    it('returns UNAVAILABLE when students facade fails or returns UNAVAILABLE (no fake zero)', async () => {
      mockStudentsFacade.getStudentDashboardSummary.mockResolvedValueOnce({
        availability: 'UNAVAILABLE',
        reason: 'Students DB is under maintenance',
      });

      const res = await service.getStudentSummary('school-1');

      expect(res.availability).toBe('UNAVAILABLE');
      expect(res.reason).toBe('Students DB is under maintenance');
      expect(res.data).toBeUndefined();
    });

    it('returns UNAVAILABLE when students facade rejects/throws', async () => {
      mockStudentsFacade.getStudentDashboardSummary.mockRejectedValueOnce(
        new Error('Connection terminated'),
      );

      const res = await service.getStudentSummary('school-1');

      expect(res.availability).toBe('UNAVAILABLE');
      expect(res.reason).toContain('Connection terminated');
      expect(res.data).toBeUndefined();
    });
  });

  describe('Fee Summary & Charts (US-006-002 / VT-006-005, VT-006-006, VT-006-007, VT-006-008)', () => {
    it('returns AVAILABLE non-voided fee collection total', async () => {
      mockFeesFacade.getCollectionTotal.mockResolvedValueOnce(45000);

      const res = await service.getFeeCollection('school-1', '2026-09-01', '2026-09-29');

      expect(res.availability).toBe('AVAILABLE');
      expect(res.data).toEqual({
        totalCollected: 45000,
        currency: 'INR',
        fromDate: '2026-09-01',
        toDate: '2026-09-29',
      });
    });

    it('preserves true-zero collection as AVAILABLE with 0 (distinguishable from UNAVAILABLE)', async () => {
      mockFeesFacade.getCollectionTotal.mockResolvedValueOnce(0);

      const res = await service.getFeeCollection('school-1', '2026-09-01', '2026-09-29');

      expect(res.availability).toBe('AVAILABLE');
      expect(res.data?.totalCollected).toBe(0);
    });

    it('returns AVAILABLE net outstanding dues for active students', async () => {
      mockFeesFacade.getOutstandingTotal.mockResolvedValueOnce(18500);

      const res = await service.getFeeDues('school-1', '2026-09');

      expect(res.availability).toBe('AVAILABLE');
      expect(res.data).toEqual({
        totalOutstanding: 18500,
        currency: 'INR',
        feeMonth: '2026-09',
      });
    });

    it('returns AVAILABLE collection buckets for day period', async () => {
      mockFeesFacade.getCollectionBuckets.mockResolvedValueOnce([
        { bucket: '2026-09-20', amount: 5000 },
        { bucket: '2026-09-21', amount: 12000 },
      ]);

      const res = await service.getFeeChart('school-1', 'day', '2026-09-20', '2026-09-21');

      expect(res.availability).toBe('AVAILABLE');
      expect(res.data?.buckets).toHaveLength(2);
      expect(res.data?.buckets[0]).toEqual({ bucket: '2026-09-20', amount: 5000 });
    });

    it('returns UNAVAILABLE when fee service throws', async () => {
      mockFeesFacade.getCollectionTotal.mockRejectedValueOnce(new Error('Fee engine error'));

      const res = await service.getFeeCollection('school-1');

      expect(res.availability).toBe('UNAVAILABLE');
      expect(res.reason).toContain('Fee engine error');
    });
  });

  describe('Transport Summary (US-006-003 / VT-006-010, VT-006-011)', () => {
    it('returns AVAILABLE active transports, stoppages, and effective student counts', async () => {
      mockTransportFacade.getEffectiveCounts.mockResolvedValueOnce({
        totalActiveTransports: 3,
        totalActiveStoppages: 12,
        totalEffectiveStudents: 85,
        businessDate: '2026-09-29',
        transports: [
          {
            id: 'tr-1',
            name: 'Route 1 - Downtown',
            transportNumber: 'BUS-01',
            vehicleNumber: 'DL-01-AB-1234',
            status: 'ACTIVE',
            effectiveStudents: 45,
            stoppages: [
              {
                id: 'stp-1',
                name: 'Main Square',
                sortOrder: 1,
                status: 'ACTIVE',
                effectiveStudents: 25,
              },
              {
                id: 'stp-2',
                name: 'City Park',
                sortOrder: 2,
                status: 'ACTIVE',
                effectiveStudents: 20,
              },
            ],
          },
        ] as any,
      });

      const res = await service.getTransportSummary('school-1', '2026-09-29');

      expect(res.availability).toBe('AVAILABLE');
      expect(res.data?.totalActiveTransports).toBe(3);
      expect(res.data?.totalActiveStoppages).toBe(12);
      expect(res.data?.totalEffectiveStudents).toBe(85);
      expect(res.data?.transports).toHaveLength(1);
      expect(res.data?.transports[0].stoppageCount).toBe(2);
      expect(res.data?.transports[0].effectiveStudents).toBe(45);
    });

    it('returns UNAVAILABLE when transport facade fails', async () => {
      mockTransportFacade.getEffectiveCounts.mockRejectedValueOnce(new Error('Transport DB timeout'));

      const res = await service.getTransportSummary('school-1');

      expect(res.availability).toBe('UNAVAILABLE');
      expect(res.reason).toContain('Transport DB timeout');
    });
  });

  describe('Multi-Tenant Cache & Timeout Isolation (VT-006-015, VT-006-016)', () => {
    it('serves subsequent requests from cache within TTL', async () => {
      mockStudentsFacade.getStudentDashboardSummary.mockResolvedValue({
        availability: 'AVAILABLE',
        total: 50,
        active: 50,
        inactive: 0,
        activeBoys: 25,
        activeGirls: 25,
      });

      const res1 = await service.getStudentSummary('school-1');
      const res2 = await service.getStudentSummary('school-1');

      expect(res1.data).toEqual(res2.data);
      expect(mockStudentsFacade.getStudentDashboardSummary).toHaveBeenCalledTimes(1);
    });

    it('strictly isolates cache between different schools (no cross-tenant leakage)', async () => {
      mockStudentsFacade.getStudentDashboardSummary
        .mockResolvedValueOnce({
          availability: 'AVAILABLE',
          total: 100,
          active: 90,
          inactive: 10,
          activeBoys: 50,
          activeGirls: 40,
        })
        .mockResolvedValueOnce({
          availability: 'AVAILABLE',
          total: 200,
          active: 180,
          inactive: 20,
          activeBoys: 90,
          activeGirls: 90,
        });

      const schoolA = await service.getStudentSummary('school-A');
      const schoolB = await service.getStudentSummary('school-B');

      expect(schoolA.data?.total).toBe(100);
      expect(schoolB.data?.total).toBe(200);
      expect(mockStudentsFacade.getStudentDashboardSummary).toHaveBeenCalledTimes(2);
    });

    it('handles facade timeout gracefully without crashing', async () => {
      // Simulate hanging promise
      mockStudentsFacade.getStudentDashboardSummary.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 5000)),
      );

      // Fast timeout test
      const originalTimeout = (service as any).withTimeout;
      (service as any).withTimeout = (p: Promise<any>) => originalTimeout.call(service, p, 50, 'Test timeout');

      const res = await service.getStudentSummary('school-1');
      expect(res.availability).toBe('UNAVAILABLE');
      expect(res.reason).toContain('Test timeout');
    });
  });
});
