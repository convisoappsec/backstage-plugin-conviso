import { AuthService, LoggerService } from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { ConvisoConfig } from '../config/convisoConfig';
import { inMemoryStore } from '../store/inMemoryStore';
import { AssetCacheService } from './assetCacheService';
import { AssetService } from './assetService';
import { AutoImportService } from './autoImportService';

jest.mock('../store/inMemoryStore');
jest.mock('../utils/batchProcessor');
jest.mock('../utils/entityMapper');
jest.mock('../utils/nameNormalizer');

describe('AutoImportService', () => {
  let mockAssetService: jest.Mocked<AssetService>;
  let mockAssetCacheService: jest.Mocked<AssetCacheService>;
  let mockCatalogApi: jest.Mocked<CatalogService>;
  let mockAuth: jest.Mocked<AuthService>;
  let mockConfig: jest.Mocked<ConvisoConfig>;
  let mockLogger: jest.Mocked<LoggerService>;
  let autoImportService: AutoImportService;

  const mockEntity1: Entity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'project-1',
      namespace: 'default',
      description: 'First project',
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'team-a',
    },
  };

  const mockEntity2: Entity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'project-2',
      namespace: 'default',
      description: 'Second project',
    },
    spec: {
      type: 'library',
      lifecycle: 'development',
      owner: 'team-b',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockAssetService = {
      getImportedAssets: jest.fn(),
      importProjects: jest.fn().mockResolvedValue({
        success: true,
        importedCount: 1,
        errors: [],
      }),
    } as any;

    mockAssetCacheService = {
      isStale: jest.fn().mockReturnValue(false),
      sync: jest.fn().mockResolvedValue({ synced: 0, duration: 0 }),
      checkNames: jest.fn().mockReturnValue(new Set<string>()),
      addNames: jest.fn(),
      getCache: jest.fn(),
    } as any;

    mockCatalogApi = {
      getEntities: jest.fn(),
    } as any;

    mockAuth = {
      getOwnServiceCredentials: jest.fn().mockResolvedValue({}),
    } as any;

    mockConfig = {
      companyId: 123,
    } as any;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    autoImportService = new AutoImportService(
      mockAssetService,
      mockAssetCacheService,
      mockCatalogApi,
      mockAuth,
      mockConfig,
      mockLogger
    );
  });

  describe('checkAndImportNewEntities', () => {
    it('should return empty result when no enabled instances', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([]);

      const result = await autoImportService.checkAndImportNewEntities();

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith('No enabled instances found, skipping auto-import');
    });

    it('should process enabled instances', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: 123 },
      ]);

      mockCatalogApi.getEntities.mockResolvedValue({
        items: [],
      });

      await autoImportService.checkAndImportNewEntities();

      expect(mockLogger.info).toHaveBeenCalledWith('Processing instance', {
        instanceId: 'instance-1',
        companyIdFromStore: 123,
      });
    });

    it('should handle errors during processing', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: 123 },
      ]);

      mockCatalogApi.getEntities.mockRejectedValue(new Error('Catalog error'));

      const result = await autoImportService.checkAndImportNewEntities();

      expect(result.imported).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should aggregate results from multiple instances', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: 123 },
        { instanceId: 'instance-2', companyId: 456 },
      ]);

      mockCatalogApi.getEntities.mockResolvedValue({
        items: [],
      });

      await autoImportService.checkAndImportNewEntities();

      expect(mockLogger.info).toHaveBeenCalledWith('Found enabled instances', {
        count: 2,
        instances: expect.arrayContaining([
          { instanceId: 'instance-1', companyId: 123 },
          { instanceId: 'instance-2', companyId: 456 },
        ]),
      });
    });
  });

  describe('processInstance', () => {
    it('should use companyId from store when provided', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: 456 },
      ]);

      mockCatalogApi.getEntities.mockResolvedValue({
        items: [],
      });

      await autoImportService.checkAndImportNewEntities();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting auto-import process', {
        instanceId: 'instance-1',
        companyId: 456,
      });
    });

    it('should use companyId from config when not in store', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: undefined },
      ]);

      mockCatalogApi.getEntities.mockResolvedValue({
        items: [],
      });

      await autoImportService.checkAndImportNewEntities();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting auto-import process', {
        instanceId: 'instance-1',
        companyId: 123,
      });
    });

    it('should return error when no companyId is available', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: undefined },
      ]);

      mockConfig.companyId = undefined;

      const result = await autoImportService.checkAndImportNewEntities();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('No companyId found');
    });

    it('should sync cache if stale', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: 123 },
      ]);

      mockAssetCacheService.isStale.mockReturnValue(true);
      mockCatalogApi.getEntities.mockResolvedValue({
        items: [],
      });

      await autoImportService.checkAndImportNewEntities();

      expect(mockAssetCacheService.sync).toHaveBeenCalledWith(123, false);
    });

    it('should continue even if cache sync fails', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: 123 },
      ]);

      mockAssetCacheService.isStale.mockReturnValue(true);
      mockAssetCacheService.sync.mockRejectedValue(new Error('Sync failed'));
      mockCatalogApi.getEntities.mockResolvedValue({
        items: [],
      });

      const result = await autoImportService.checkAndImportNewEntities();

      expect(result.errors).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache sync failed, continuing with auto-import',
        expect.any(Object)
      );
    });
  });

  describe('processEntitiesInBatches', () => {
    it('should fetch entities from catalog in batches', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: 123 },
      ]);

      mockCatalogApi.getEntities
        .mockResolvedValueOnce({
          items: [mockEntity1, mockEntity2],
        })
        .mockResolvedValueOnce({
          items: [],
        });

      mockAssetCacheService.checkNames.mockReturnValue(new Set<string>());

      const { BatchProcessor } = require('../utils/batchProcessor');
      BatchProcessor.processInBatches = jest.fn().mockResolvedValue({
        results: [{ success: true, entityName: 'project-1' }],
        errors: [],
      });

      await autoImportService.checkAndImportNewEntities();

      expect(mockCatalogApi.getEntities).toHaveBeenCalled();
    });

    it('should filter out already imported entities', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: 123 },
      ]);

      mockCatalogApi.getEntities.mockResolvedValue({
        items: [mockEntity1, mockEntity2],
      });

      const { normalizeEntityName } = require('../utils/nameNormalizer');
      jest.mocked(normalizeEntityName).mockImplementation((name: string) => 
        (name || '').toLowerCase().trim().replace(/\s+/g, ' ')
      );

      mockAssetCacheService.checkNames.mockReturnValue(new Set(['project-1']));

      const { BatchProcessor } = require('../utils/batchProcessor');
      BatchProcessor.processInBatches = jest.fn().mockResolvedValue({
        results: [],
        errors: [],
      });

      await autoImportService.checkAndImportNewEntities();

      expect(BatchProcessor.processInBatches).toHaveBeenCalled();
      const callArgs = (BatchProcessor.processInBatches as jest.Mock).mock.calls[0];
      const entitiesToImport = callArgs[0];
      
      expect(entitiesToImport).toHaveLength(1);
      expect(entitiesToImport[0].metadata.name).toBe('project-2');
    });

    it('should update cache after successful import', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: 123 },
      ]);

      mockCatalogApi.getEntities.mockResolvedValue({
        items: [mockEntity1],
      });

      mockAssetCacheService.checkNames.mockReturnValue(new Set<string>());

      const { BatchProcessor } = require('../utils/batchProcessor');
      BatchProcessor.processInBatches = jest.fn().mockResolvedValue({
        results: [{ success: true, entityName: 'project-1' }],
        errors: [],
      });

      await autoImportService.checkAndImportNewEntities();

      expect(mockAssetCacheService.addNames).toHaveBeenCalledWith(123, ['project-1']);
    });

    it('should handle errors during batch processing', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: 123 },
      ]);

      mockCatalogApi.getEntities.mockResolvedValue({
        items: [mockEntity1],
      });

      mockAssetCacheService.checkNames.mockReturnValue(new Set<string>());

      const { BatchProcessor } = require('../utils/batchProcessor');
      BatchProcessor.processInBatches = jest.fn().mockResolvedValue({
        results: [],
        errors: ['Import failed'],
      });

      const result = await autoImportService.checkAndImportNewEntities();

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('importEntities', () => {
    it('should import entities in batches', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: 123 },
      ]);

      mockCatalogApi.getEntities.mockResolvedValue({
        items: [mockEntity1, mockEntity2],
      });

      mockAssetCacheService.checkNames.mockReturnValue(new Set<string>());

      const { extractProjectDataFromEntity } = require('../utils/entityMapper');
      extractProjectDataFromEntity.mockImplementation((entity: Entity) => ({
        id: entity.metadata.name,
        name: entity.metadata.name,
        description: entity.metadata.description,
      }));

      const { BatchProcessor } = require('../utils/batchProcessor');
      BatchProcessor.processInBatches = jest.fn().mockImplementation(
        async (entities: Entity[], batchSize: number, callback: (batch: Entity[]) => Promise<any[]>) => {
          const results = [];
          for (let i = 0; i < entities.length; i += batchSize) {
            const batch = entities.slice(i, i + batchSize);
            const batchResults = await callback(batch);
            results.push(...batchResults);
          }
          return { results, errors: [] };
        }
      );

      mockAssetService.importProjects.mockResolvedValue({
        success: true,
        importedCount: 2,
        errors: [],
      });

      const result = await autoImportService.checkAndImportNewEntities();

      expect(result.imported).toBe(2);
      expect(mockAssetService.importProjects).toHaveBeenCalled();
    });

    it('should handle import errors', async () => {
      (inMemoryStore.getEnabledInstances as jest.Mock).mockReturnValue([
        { instanceId: 'instance-1', companyId: 123 },
      ]);

      mockCatalogApi.getEntities.mockResolvedValue({
        items: [mockEntity1],
      });

      mockAssetCacheService.checkNames.mockReturnValue(new Set<string>());

      const { BatchProcessor } = require('../utils/batchProcessor');
      BatchProcessor.processInBatches = jest.fn().mockRejectedValue(new Error('Import failed'));

      const result = await autoImportService.checkAndImportNewEntities();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

