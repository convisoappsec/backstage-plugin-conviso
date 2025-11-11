import { LoggerService } from '@backstage/backend-plugin-api';
import * as fs from 'fs';
import * as path from 'path';
import { AssetCacheService } from './assetCacheService';
import { AssetService } from './assetService';

jest.mock('fs');
jest.mock('path');

describe('AssetCacheService', () => {
  let mockAssetService: jest.Mocked<AssetService>;
  let mockLogger: jest.Mocked<LoggerService>;
  let cacheService: AssetCacheService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAssetService = {
      getImportedAssets: jest.fn(),
      importProjects: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;
    
    (path.resolve as jest.Mock).mockReturnValue('/tmp');
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('{}');
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

    cacheService = new AssetCacheService(mockAssetService, mockLogger);
  });

  describe('constructor', () => {
    it('should create cache directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      new AssetCacheService(mockAssetService, mockLogger);
      
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('should load cache from file if it exists', () => {
      const cacheData = {
        '123': {
          assets: ['asset-1', 'asset-2'],
          lastSync: new Date().toISOString(),
          totalCount: 2,
        },
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(cacheData));
      
      const service = new AssetCacheService(mockAssetService, mockLogger);
      const cache = service.getCache(123);
      
      expect(cache).toBeTruthy();
      expect(cache?.assets).toContain('asset-1');
      expect(cache?.assets).toContain('asset-2');
    });
  });

  describe('getCache', () => {
    it('should return null for non-existent company', () => {
      const cache = cacheService.getCache(999);
      expect(cache).toBeNull();
    });

    it('should return cache entry for existing company', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
        { name: 'asset-2', id: '2' },
      ]);

      await cacheService.sync(123, true);
      const cache = cacheService.getCache(123);

      expect(cache).toBeTruthy();
      expect(cache?.assets).toContain('asset-1');
      expect(cache?.totalCount).toBe(2);
      expect(cache?.lastSync).toBeTruthy();
    });
  });

  describe('checkNames', () => {
    it('should return empty set for non-existent company', () => {
      const result = cacheService.checkNames(999, ['asset-1']);
      expect(result.size).toBe(0);
    });

    it('should return found names from cache', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
        { name: 'asset-2', id: '2' },
      ]);

      await cacheService.sync(123, true);
      const result = cacheService.checkNames(123, ['asset-1', 'asset-3']);

      expect(result.size).toBe(1);
      expect(result.has('asset-1')).toBe(true);
      expect(result.has('asset-3')).toBe(false);
    });

    it('should normalize names before checking', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: '  Asset-1  ', id: '1' },
      ]);

      await cacheService.sync(123, true);
      const result = cacheService.checkNames(123, ['asset-1', '  Asset-1  ']);

      expect(result.size).toBe(1);
    });
  });

  describe('sync', () => {
    it('should sync assets from AssetService', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
        { name: 'asset-2', id: '2' },
      ]);

      const result = await cacheService.sync(123, true);

      expect(mockAssetService.getImportedAssets).toHaveBeenCalledWith(123);
      expect(result.synced).toBe(2);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should not sync if cache is not stale and force is false', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
      ]);

      await cacheService.sync(123, true);
      jest.clearAllMocks();

      const result = await cacheService.sync(123, false);

      expect(mockAssetService.getImportedAssets).not.toHaveBeenCalled();
      expect(result.synced).toBe(1);
    });

    it('should sync if force is true even if cache is not stale', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
      ]);

      await cacheService.sync(123, true);
      jest.clearAllMocks();

      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
        { name: 'asset-2', id: '2' },
      ]);

      const result = await cacheService.sync(123, true);

      expect(mockAssetService.getImportedAssets).toHaveBeenCalled();
      expect(result.synced).toBe(2);
    });

    it('should handle concurrent sync requests', async () => {
      mockAssetService.getImportedAssets.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([{ name: 'asset-1', id: '1' }]), 100))
      );

      const sync1 = cacheService.sync(123, true);
      const sync2 = cacheService.sync(123, true);

      const [result1, result2] = await Promise.all([sync1, sync2]);

      expect(mockAssetService.getImportedAssets).toHaveBeenCalledTimes(1);
      expect(result1.synced).toBe(1);
      expect(result2.synced).toBe(1);
    });

    it('should handle sync errors', async () => {
      mockAssetService.getImportedAssets.mockRejectedValue(new Error('Sync failed'));

      await expect(cacheService.sync(123, true)).rejects.toThrow('Sync failed');
    });

    it('should save cache to file after sync', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
      ]);

      await cacheService.sync(123, true);

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('addNames', () => {
    it('should add new names to cache', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
      ]);

      await cacheService.sync(123, true);
      cacheService.addNames(123, ['asset-2', 'asset-3']);

      const cache = cacheService.getCache(123);
      expect(cache?.assets).toContain('asset-1');
      expect(cache?.assets).toContain('asset-2');
      expect(cache?.assets).toContain('asset-3');
      expect(cache?.totalCount).toBe(3);
    });

    it('should not add duplicate names', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
      ]);

      await cacheService.sync(123, true);
      cacheService.addNames(123, ['asset-1', 'asset-2']);

      const cache = cacheService.getCache(123);
      expect(cache?.totalCount).toBe(2);
    });

    it('should not add names if cache does not exist', () => {
      cacheService.addNames(999, ['asset-1']);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should save cache to file after adding names', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
      ]);

      await cacheService.sync(123, true);
      jest.clearAllMocks();

      cacheService.addNames(123, ['asset-2']);

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('removeNames', () => {
    it('should remove names from cache', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
        { name: 'asset-2', id: '2' },
        { name: 'asset-3', id: '3' },
      ]);

      await cacheService.sync(123, true);
      cacheService.removeNames(123, ['asset-2']);

      const cache = cacheService.getCache(123);
      expect(cache?.assets).toContain('asset-1');
      expect(cache?.assets).not.toContain('asset-2');
      expect(cache?.assets).toContain('asset-3');
      expect(cache?.totalCount).toBe(2);
    });

    it('should not remove names if cache does not exist', () => {
      cacheService.removeNames(999, ['asset-1']);
    });

    it('should save cache to file after removing names', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
        { name: 'asset-2', id: '2' },
      ]);

      await cacheService.sync(123, true);
      jest.clearAllMocks();

      cacheService.removeNames(123, ['asset-2']);

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('isStale', () => {
    it('should return true for non-existent cache', () => {
      expect(cacheService.isStale(999)).toBe(true);
    });

    it('should return false for fresh cache', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
      ]);

      await cacheService.sync(123, true);
      expect(cacheService.isStale(123)).toBe(false);
    });

    it('should return true for stale cache (older than 24 hours)', async () => {
      mockAssetService.getImportedAssets.mockResolvedValue([
        { name: 'asset-1', id: '1' },
      ]);

      await cacheService.sync(123, true);
      
      const originalDateNow = Date.now;
      const futureTime = Date.now() + 25 * 60 * 60 * 1000;
      Date.now = jest.fn(() => futureTime);

      expect(cacheService.isStale(123)).toBe(true);

      Date.now = originalDateNow;
    });
  });
});

