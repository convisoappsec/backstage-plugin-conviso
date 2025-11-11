import { LoggerService } from '@backstage/backend-plugin-api';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEntityName } from '../utils/nameNormalizer';
import { AssetService } from './assetService';

interface CacheEntry {
  assets: Set<string>;
  lastSync: Date;
  totalCount: number;
}

interface CacheEntrySerialized {
  assets: string[];
  lastSync: string;
  totalCount: number;
}

export class AssetCacheService {
  private cache = new Map<number, CacheEntry>();
  private syncInProgress = new Map<number, Promise<void>>();
  private cacheFilePath: string;

  constructor(
    private assetService: AssetService,
    private logger: LoggerService
  ) {

    const pluginDir = path.resolve(__dirname, '..', '..', '..');
    const cacheDir = path.join(pluginDir, '.cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    this.cacheFilePath = path.join(cacheDir, 'imported-assets-cache.json');
    this.loadCacheFromFile();
  }

  getCache(companyId: number): { assets: string[]; lastSync: string; totalCount: number } | null {
    const entry = this.cache.get(companyId);
    if (!entry) {
      return null;
    }

    return {
      assets: Array.from(entry.assets),
      lastSync: entry.lastSync.toISOString(),
      totalCount: entry.totalCount,
    };
  }

  checkNames(companyId: number, names: string[]): Set<string> {
    const entry = this.cache.get(companyId);
    if (!entry) {
      return new Set<string>();
    }

    const normalizedNames = new Set(names.map(name => normalizeEntityName(name)));
    const foundNames = new Set<string>();

    normalizedNames.forEach(name => {
      if (entry.assets.has(name)) {
        foundNames.add(name);
      }
    });

    return foundNames;
  }

  async sync(companyId: number, force = false): Promise<{ synced: number; duration: number }> {
    const startTime = Date.now();

    if (this.syncInProgress.has(companyId)) {
      this.logger.info(`Sync already in progress for company ${companyId}, waiting...`);
      await this.syncInProgress.get(companyId);
      const entry = this.cache.get(companyId);
      return {
        synced: entry?.totalCount || 0,
        duration: Date.now() - startTime,
      };
    }

    const syncPromise = this.performSync(companyId, force);
    this.syncInProgress.set(companyId, syncPromise);

    try {
      await syncPromise;
      const entry = this.cache.get(companyId);
      return {
        synced: entry?.totalCount || 0,
        duration: Date.now() - startTime,
      };
    } finally {
      this.syncInProgress.delete(companyId);
    }
  }

  addNames(companyId: number, names: string[]): void {
    const entry = this.cache.get(companyId);
    if (!entry) {
      this.logger.warn(`Cache not found for company ${companyId}, cannot add names incrementally`);
      return;
    }

    const normalizedNames = names.map(name => normalizeEntityName(name));
    let added = 0;

    normalizedNames.forEach(name => {
      if (!entry.assets.has(name)) {
        entry.assets.add(name);
        added++;
      }
    });

    if (added > 0) {
      entry.totalCount += added;
      this.saveCacheToFile();
      this.logger.info(`Added ${added} new assets to cache for company ${companyId}`, {
        companyId,
        added,
        totalCount: entry.totalCount,
      });
    }
  }

  removeNames(companyId: number, names: string[]): void {
    const entry = this.cache.get(companyId);
    if (!entry) {
      return;
    }

    const normalizedNames = names.map(name => normalizeEntityName(name));
    let removed = 0;

    normalizedNames.forEach(name => {
      if (entry.assets.has(name)) {
        entry.assets.delete(name);
        removed++;
      }
    });

    if (removed > 0) {
      entry.totalCount = Math.max(0, entry.totalCount - removed);
      this.saveCacheToFile();
      this.logger.info(`Removed ${removed} assets from cache for company ${companyId}`, {
        companyId,
        removed,
        totalCount: entry.totalCount,
      });
    }
  }

  isStale(companyId: number): boolean {
    const entry = this.cache.get(companyId);
    if (!entry) {
      return true;
    }

    const hoursSinceSync = (Date.now() - entry.lastSync.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > 24;
  }

  private loadCacheFromFile(): void {
    try {
      if (!fs.existsSync(this.cacheFilePath)) {
        this.logger.info('Cache file does not exist, starting with empty cache');
        return;
      }

      const fileContent = fs.readFileSync(this.cacheFilePath, 'utf-8');
      const data: Record<string, CacheEntrySerialized> = JSON.parse(fileContent);

      for (const [companyIdStr, entry] of Object.entries(data)) {
        const companyId = parseInt(companyIdStr, 10);
        if (isNaN(companyId)) {
          continue;
        }

        this.cache.set(companyId, {
          assets: new Set(entry.assets),
          lastSync: new Date(entry.lastSync),
          totalCount: entry.totalCount,
        });
      }

      this.logger.info(`Loaded cache from file`, {
        companies: Array.from(this.cache.keys()),
        totalEntries: this.cache.size,
      });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to load cache from file: ${errorMsg}`, {
        filePath: this.cacheFilePath,
      });
    }
  }

  private saveCacheToFile(): void {
    try {
      const data: Record<string, CacheEntrySerialized> = {};

      for (const [companyId, entry] of this.cache.entries()) {
        data[companyId.toString()] = {
          assets: Array.from(entry.assets),
          lastSync: entry.lastSync.toISOString(),
          totalCount: entry.totalCount,
        };
      }

      fs.writeFileSync(this.cacheFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to save cache to file: ${errorMsg}`, {
        filePath: this.cacheFilePath,
      });
    }
  }

  private async performSync(companyId: number, force: boolean): Promise<void> {
    if (!force && !this.isStale(companyId)) {
      this.logger.info(`Cache for company ${companyId} is still fresh, skipping sync`);
      return;
    }

    this.logger.info(`Starting cache sync for company ${companyId}`);

    try {
      const assets = await this.assetService.getImportedAssets(companyId);
      const normalizedNames = new Set<string>();

      assets.forEach(asset => {
        const normalized = normalizeEntityName(asset.name);
        normalizedNames.add(normalized);
      });

      this.cache.set(companyId, {
        assets: normalizedNames,
        lastSync: new Date(),
        totalCount: normalizedNames.size,
      });

      this.saveCacheToFile();

      this.logger.info(`Cache sync completed for company ${companyId}`, {
        companyId,
        totalCount: normalizedNames.size,
      });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache sync failed for company ${companyId}`, {
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}

