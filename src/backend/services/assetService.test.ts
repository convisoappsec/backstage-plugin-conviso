import { AssetService } from './assetService';
import { ConvisoApiService } from './convisoApiService';

describe('AssetService', () => {
  let service: AssetService;
  let mockApiService: jest.Mocked<ConvisoApiService>;

  beforeEach(() => {
    mockApiService = {
      request: jest.fn(),
    } as any;
    service = new AssetService(mockApiService as any);
  });

  describe('getImportedAssets', () => {
    it('should fetch all assets with pagination', async () => {
      mockApiService.request
        .mockResolvedValueOnce({
          assets: {
            collection: [
              { id: '1', name: 'Asset 1' },
              { id: '2', name: 'Asset 2' },
            ],
            metadata: {
              totalPages: 2,
              totalCount: 150,
              currentPage: 1,
              limitValue: 100,
            },
          },
        })
        .mockResolvedValueOnce({
          assets: {
            collection: [{ id: '3', name: 'Asset 3' }],
            metadata: {
              totalPages: 2,
              totalCount: 150,
              currentPage: 2,
              limitValue: 100,
            },
          },
        });

      const result = await service.getImportedAssets(123);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Asset 1');
      expect(result[1].name).toBe('Asset 2');
      expect(result[2].name).toBe('Asset 3');
      expect(mockApiService.request).toHaveBeenCalledTimes(2);
    });

    it('should handle single page of assets', async () => {
      mockApiService.request.mockResolvedValue({
        assets: {
          collection: [{ id: '1', name: 'Asset 1' }],
          metadata: {
            totalPages: 1,
            totalCount: 1,
            currentPage: 1,
            limitValue: 100,
          },
        },
      });

      const result = await service.getImportedAssets(123);

      expect(result).toHaveLength(1);
      expect(mockApiService.request).toHaveBeenCalledTimes(1);
    });

    it('should filter by BACKSTAGE integration type', async () => {
      mockApiService.request.mockResolvedValue({
        assets: {
          collection: [],
          metadata: {
            totalPages: 1,
            totalCount: 0,
            currentPage: 1,
            limitValue: 100,
          },
        },
      });

      await service.getImportedAssets(123);

      expect(mockApiService.request).toHaveBeenCalledWith({
        query: expect.stringContaining('GetAssets'),
        variables: {
          companyId: '123',
          page: 1,
          limit: 2000,
          search: {
            integrationTypes: ['BACKSTAGE'],
          },
        },
      });
    });
  });

  describe('getImportedAssetNames', () => {
    it('should return normalized asset names as Set', async () => {
      mockApiService.request.mockResolvedValue({
        assets: {
          collection: [
            { id: '1', name: 'Asset One' },
            { id: '2', name: '  Asset Two  ' },
            { id: '3', name: 'ASSET THREE' },
          ],
          metadata: {
            totalPages: 1,
            totalCount: 3,
            currentPage: 1,
            limitValue: 100,
          },
        },
      });

      const result = await service.getImportedAssetNames(123);

      expect(result).toBeInstanceOf(Set);
      expect(result.has('asset one')).toBe(true);
      expect(result.has('asset two')).toBe(true);
      expect(result.has('asset three')).toBe(true);
    });

    it('should return empty Set on error', async () => {
      mockApiService.request.mockRejectedValue(new Error('API Error'));

      const result = await service.getImportedAssetNames(123);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });
  });

  describe('importProjects', () => {
    it('should import projects successfully', async () => {
      mockApiService.request.mockResolvedValue({
        importAssetToIntegration: {
          success: true,
          importedCount: 2,
          errors: [],
        },
      });

      const result = await service.importProjects({
        companyId: 123,
        projects: [
          {
            id: '1',
            name: 'Project 1',
            description: 'Description 1',
          },
          {
            id: '2',
            name: 'Project 2',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(2);
      expect(mockApiService.request).toHaveBeenCalledWith({
        query: expect.stringContaining('ImportAssetToIntegration'),
        variables: {
          input: {
            companyId: '123',
            integrationType: 'backstage',
            projects: [
              expect.objectContaining({
                id: '1',
                name: 'Project 1',
                description: 'Description 1',
              }),
              expect.objectContaining({
                id: '2',
                name: 'Project 2',
                description: '',
              }),
            ],
          },
        },
      });
    });

    it('should use default values for optional fields', async () => {
      mockApiService.request.mockResolvedValue({
        importAssetToIntegration: {
          success: true,
          importedCount: 1,
        },
      });

      await service.importProjects({
        companyId: 123,
        projects: [
          {
            id: '1',
            name: 'Project 1',
          },
        ],
      });

      expect(mockApiService.request).toHaveBeenCalledWith({
        query: expect.any(String),
        variables: {
          input: {
            companyId: '123',
            integrationType: 'backstage',
            projects: [
              expect.objectContaining({
                description: '',
                url: '',
                repoUrl: '',
                lifecycle: '',
                tags: [],
                owner: '',
                assetType: 'api',
              }),
            ],
          },
        },
      });
    });
  });
});

