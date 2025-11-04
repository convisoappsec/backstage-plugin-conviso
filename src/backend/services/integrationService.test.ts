import { inMemoryStore } from '../store/inMemoryStore';
import { ConvisoApiService } from './convisoApiService';
import { IntegrationService } from './integrationService';

describe('IntegrationService', () => {
  let service: IntegrationService;
  let mockApiService: jest.Mocked<ConvisoApiService>;

  beforeEach(() => {
    mockApiService = {
      request: jest.fn(),
    } as any;
    service = new IntegrationService(mockApiService as any);
    
    const store = inMemoryStore as any;
    store.autoImportSettings.clear();
    store.instanceCompanyIds.clear();
  });

  describe('getIntegration', () => {
    it('should return integration when found', async () => {
      const mockIntegration = {
        id: '1',
        backstageUrl: 'https://backstage.example.com',
        instanceId: 'instance-1',
        autoImportEnabled: true,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockApiService.request.mockResolvedValue({
        backstageIntegration: mockIntegration,
      });

      const result = await service.getIntegration('instance-1');

      expect(result).toEqual(mockIntegration);
      expect(mockApiService.request).toHaveBeenCalledWith({
        query: expect.stringContaining('GetBackstageIntegration'),
        variables: { instanceId: 'instance-1' },
      });
      expect(inMemoryStore.getAutoImportSetting('instance-1')).toBe(true);
    });

    it('should return null when integration not found', async () => {
      mockApiService.request.mockResolvedValue({
        backstageIntegration: null,
      });

      const result = await service.getIntegration('instance-1');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockApiService.request.mockRejectedValue(new Error('API Error'));

      const result = await service.getIntegration('instance-1');

      expect(result).toBeNull();
    });

    it('should update autoImportEnabled in store when present', async () => {
      const mockIntegration = {
        id: '1',
        backstageUrl: 'https://backstage.example.com',
        instanceId: 'instance-1',
        autoImportEnabled: false,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockApiService.request.mockResolvedValue({
        backstageIntegration: mockIntegration,
      });

      await service.getIntegration('instance-1');

      expect(inMemoryStore.getAutoImportSetting('instance-1')).toBe(false);
    });
  });

  describe('createOrUpdateIntegration', () => {
    it('should create or update integration', async () => {
      const mockIntegration = {
        id: '1',
        backstageUrl: 'https://backstage.example.com',
        instanceId: 'instance-1',
        autoImportEnabled: false,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockApiService.request.mockResolvedValue({
        createOrUpdateBackstageIntegration: {
          backstageIntegration: mockIntegration,
        },
      });

      const result = await service.createOrUpdateIntegration({
        companyId: 123,
        backstageUrl: 'https://backstage.example.com',
        instanceId: 'instance-1',
      });

      expect(result.backstageIntegration).toEqual(mockIntegration);
      expect(inMemoryStore.getCompanyId('instance-1')).toBe(123);
      expect(mockApiService.request).toHaveBeenCalledWith({
        query: expect.stringContaining('CreateOrUpdateBackstageIntegration'),
        variables: {
          input: {
            companyId: 123,
            backstageUrl: 'https://backstage.example.com',
            instanceId: 'instance-1',
          },
        },
      });
    });
  });

  describe('updateAutoImportSetting', () => {
    it('should update auto import setting', async () => {
      mockApiService.request.mockResolvedValue({
        createOrUpdateBackstageIntegration: {
          backstageIntegration: {
            id: '1',
            autoImportEnabled: true,
          },
        },
      });

      await service.updateAutoImportSetting({
        companyId: 123,
        backstageUrl: 'https://backstage.example.com',
        instanceId: 'instance-1',
        autoImportEnabled: true,
      });

      expect(mockApiService.request).toHaveBeenCalledWith({
        query: expect.stringContaining('CreateOrUpdateBackstageIntegration'),
        variables: {
          input: {
            companyId: '123',
            backstageUrl: 'https://backstage.example.com',
            instanceId: 'instance-1',
            autoImportEnabled: true,
          },
        },
      });
    });
  });
});

