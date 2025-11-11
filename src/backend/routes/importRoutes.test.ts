import express, { Express } from 'express';
import request from 'supertest';
import { ConvisoConfig } from '../config/convisoConfig';
import { AssetCacheService } from '../services/assetCacheService';
import { AssetService } from '../services/assetService';
import { createImportRoutes } from './importRoutes';

describe('createImportRoutes', () => {
  let app: Express;
  let mockAssetService: jest.Mocked<AssetService>;
  let mockAssetCacheService: jest.Mocked<AssetCacheService>;
  let mockConfig: ConvisoConfig;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockAssetService = {
      getImportedAssets: jest.fn(),
      importProjects: jest.fn(),
    } as any;

    mockAssetCacheService = {
      checkNames: jest.fn(),
      getCache: jest.fn(),
      sync: jest.fn(),
      addNames: jest.fn(),
    } as any;

    mockConfig = {
      apiBase: 'https://api.test.com',
      apiKey: 'test-api-key',
      environment: 'test',
      companyId: 123,
    };

    const router = createImportRoutes(mockAssetService, mockAssetCacheService, mockConfig);
    app.use('/api/conviso', router);
  });

  describe('GET /imported-assets/:companyId?', () => {
    it('should return imported assets with companyId from URL', async () => {
      const mockAssets = [
        { id: '1', name: 'Asset 1' },
        { id: '2', name: 'Asset 2' },
      ];

      mockAssetService.getImportedAssets.mockResolvedValue(mockAssets);

      const response = await request(app)
        .get('/api/conviso/imported-assets/456')
        .expect(200);

      expect(response.body).toEqual({
        assets: [
          { id: '1', name: 'Asset 1' },
          { id: '2', name: 'Asset 2' },
        ],
      });
      expect(mockAssetService.getImportedAssets).toHaveBeenCalledWith(456);
    });

    it('should use companyId from config when not provided in URL', async () => {
      const mockAssets = [{ id: '1', name: 'Asset 1' }];
      mockAssetService.getImportedAssets.mockResolvedValue(mockAssets);

      const response = await request(app)
        .get('/api/conviso/imported-assets')
        .expect(200);

      expect(mockAssetService.getImportedAssets).toHaveBeenCalledWith(123);
      expect(response.body.assets).toHaveLength(1);
    });

    it('should return 400 when companyId is missing', async () => {
      const configWithoutCompanyId: ConvisoConfig = {
        ...mockConfig,
        companyId: undefined,
      };

      const router = createImportRoutes(mockAssetService, mockAssetCacheService, configWithoutCompanyId);
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/conviso', router);

      await request(testApp)
        .get('/api/conviso/imported-assets')
        .expect(400);
    });

    it('should return 500 when API key is not configured', async () => {
      const configWithoutApiKey: ConvisoConfig = {
        ...mockConfig,
        apiKey: '',
      };

      const router = createImportRoutes(mockAssetService, mockAssetCacheService, configWithoutApiKey);
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/conviso', router);

      const response = await request(testApp)
        .get('/api/conviso/imported-assets/123')
        .expect(500);

      expect(response.body.error).toContain('API Key not configured');
    });

    it('should handle errors from assetService', async () => {
      mockAssetService.getImportedAssets.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/conviso/imported-assets/123')
        .expect(500);

      expect(response.body.error).toBe('Service error');
    });
  });

  describe('POST /check-imported-names', () => {
    it('should check imported names with companyId from body', async () => {
      mockAssetCacheService.checkNames.mockReturnValue(new Set(['asset-1', 'asset-2']));

      const response = await request(app)
        .post('/api/conviso/check-imported-names')
        .send({
          companyId: 456,
          names: ['asset-1', 'asset-2', 'asset-3'],
        })
        .expect(200);

      expect(response.body).toEqual({
        importedNames: ['asset-1', 'asset-2'],
      });
      expect(mockAssetCacheService.checkNames).toHaveBeenCalledWith(456, ['asset-1', 'asset-2', 'asset-3']);
    });

    it('should use companyId from config when not provided in body', async () => {
      mockAssetCacheService.checkNames.mockReturnValue(new Set(['asset-1']));

      await request(app)
        .post('/api/conviso/check-imported-names')
        .send({
          names: ['asset-1'],
        })
        .expect(200);

      expect(mockAssetCacheService.checkNames).toHaveBeenCalledWith(123, ['asset-1']);
    });

    it('should return 400 when names array is missing', async () => {
      const response = await request(app)
        .post('/api/conviso/check-imported-names')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('names array is required');
    });

    it('should return 400 when names is not an array', async () => {
      const response = await request(app)
        .post('/api/conviso/check-imported-names')
        .send({ names: 'not-an-array' })
        .expect(400);

      expect(response.body.error).toBe('names array is required');
    });

    it('should return 400 when companyId is missing', async () => {
      const configWithoutCompanyId: ConvisoConfig = {
        ...mockConfig,
        companyId: undefined,
      };

      const router = createImportRoutes(mockAssetService, mockAssetCacheService, configWithoutCompanyId);
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/conviso', router);

      const response = await request(testApp)
        .post('/api/conviso/check-imported-names')
        .send({ names: ['asset-1'] })
        .expect(400);

      expect(response.body.error).toContain('Company ID is required');
    });
  });

  describe('GET /imported-assets-cache/:companyId?', () => {
    it('should return cache with companyId from URL', async () => {
      const mockCache = {
        assets: ['asset-1', 'asset-2'],
        lastSync: new Date().toISOString(),
      };

      mockAssetCacheService.getCache.mockReturnValue(mockCache as any);

      const response = await request(app)
        .get('/api/conviso/imported-assets-cache/456')
        .expect(200);

      expect(response.body).toEqual(mockCache);
      expect(mockAssetCacheService.getCache).toHaveBeenCalledWith(456);
    });

    it('should return 404 when cache is not found', async () => {
      mockAssetCacheService.getCache.mockReturnValue(null);

      const response = await request(app)
        .get('/api/conviso/imported-assets-cache/123')
        .expect(404);

      expect(response.body.error).toContain('Cache not found');
    });
  });

  describe('POST /sync-imported-assets/:companyId?', () => {
    it('should sync cache with companyId from URL', async () => {
      mockAssetCacheService.sync.mockResolvedValue({
        synced: 100,
        duration: 5000,
      });

      const response = await request(app)
        .post('/api/conviso/sync-imported-assets/456')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        synced: 100,
        duration: '5.00s',
      });
      expect(mockAssetCacheService.sync).toHaveBeenCalledWith(456, false);
    });

    it('should sync with force flag from body', async () => {
      mockAssetCacheService.sync.mockResolvedValue({
        synced: 50,
        duration: 3000,
      });

      await request(app)
        .post('/api/conviso/sync-imported-assets/123')
        .send({ force: true })
        .expect(200);

      expect(mockAssetCacheService.sync).toHaveBeenCalledWith(123, true);
    });

    it('should handle sync errors', async () => {
      mockAssetCacheService.sync.mockRejectedValue(new Error('Sync failed'));

      const response = await request(app)
        .post('/api/conviso/sync-imported-assets/123')
        .expect(500);

      expect(response.body.error).toBe('Sync failed');
    });
  });

  describe('POST /import-projects', () => {
    it('should import projects successfully', async () => {
      mockAssetService.importProjects.mockResolvedValue({
        success: true,
        importedCount: 2,
        errors: [],
      });

      const projects = [
        { id: '1', name: 'Project 1' },
        { id: '2', name: 'Project 2' },
      ];

      const response = await request(app)
        .post('/api/conviso/import-projects')
        .send({
          companyId: 456,
          projects,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.importedCount).toBe(2);
      expect(mockAssetService.importProjects).toHaveBeenCalledWith({
        companyId: 456,
        projects,
      });
    });

    it('should update cache after successful import', async () => {
      mockAssetService.importProjects.mockResolvedValue({
        success: true,
        importedCount: 2,
        errors: [],
      });

      const projects = [
        { id: '1', name: 'Project 1' },
        { id: '2', name: 'Project 2' },
      ];

      await request(app)
        .post('/api/conviso/import-projects')
        .send({
          companyId: 123,
          projects,
        })
        .expect(200);

      expect(mockAssetCacheService.addNames).toHaveBeenCalledWith(123, ['Project 1', 'Project 2']);
    });

    it('should not update cache when importedCount is 0', async () => {
      mockAssetService.importProjects.mockResolvedValue({
        success: true,
        importedCount: 0,
        errors: [],
      });

      const response = await request(app)
        .post('/api/conviso/import-projects')
        .send({
          companyId: 123,
          projects: [{ id: '1', name: 'Project 1' }],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAssetCacheService.addNames).not.toHaveBeenCalled();
    });

    it('should return 400 when projects array is missing', async () => {
      const response = await request(app)
        .post('/api/conviso/import-projects')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('projects array is required');
    });
  });

  describe('POST /add-imported-names', () => {
    it('should add imported names to cache', async () => {
      const response = await request(app)
        .post('/api/conviso/add-imported-names')
        .send({
          companyId: 456,
          names: ['asset-1', 'asset-2'],
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        added: 2,
      });
      expect(mockAssetCacheService.addNames).toHaveBeenCalledWith(456, ['asset-1', 'asset-2']);
    });

    it('should use companyId from config when not provided', async () => {
      await request(app)
        .post('/api/conviso/add-imported-names')
        .send({
          names: ['asset-1'],
        })
        .expect(200);

      expect(mockAssetCacheService.addNames).toHaveBeenCalledWith(123, ['asset-1']);
    });

    it('should return 400 when names array is missing', async () => {
      const response = await request(app)
        .post('/api/conviso/add-imported-names')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('names array is required');
    });
  });
});

