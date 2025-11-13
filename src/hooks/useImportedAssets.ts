import { useApi } from '@backstage/core-plugin-api';
import { useCallback, useEffect, useState } from 'react';
import { convisoPlatformApiRef } from '../api/convisoPlatformApi';
import { normalizeName } from '../utils/nameNormalizer';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LOCAL_STORAGE_KEY_PREFIX = 'conviso_imported_assets_';

interface LocalStorageCacheEntry {
  assets: string[];
  timestamp: number;
  lastSync: string;
}

export function useImportedAssets(companyId: number | null) {
  const api = useApi(convisoPlatformApiRef);
  const [importedAssets, setImportedAssets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const getLocalStorageKey = useCallback((id: number): string => {
    return `${LOCAL_STORAGE_KEY_PREFIX}${id}`;
  }, []);

  const getCachedAssetsFromLocalStorage = useCallback((id: number): Set<string> | null => {
    try {
      const key = getLocalStorageKey(id);
      const cached = localStorage.getItem(key);
      if (!cached) {
        return null;
      }

      const entry: LocalStorageCacheEntry = JSON.parse(cached);
      const age = Date.now() - entry.timestamp;

      if (age > CACHE_TTL_MS) {
        localStorage.removeItem(key);
        return null;
      }

      return new Set(entry.assets);
    } catch {
      // Error reading from localStorage - return null to use backend cache
      return null;
    }
  }, [getLocalStorageKey]);

  const setCachedAssetsToLocalStorage = useCallback((id: number, assets: Set<string>, lastSync?: string): void => {
    try {
      const key = getLocalStorageKey(id);
      const entry: LocalStorageCacheEntry = {
        assets: Array.from(assets),
        timestamp: Date.now(),
        lastSync: lastSync || new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // Error saving to localStorage - non-critical, continue without cache
    }
  }, [getLocalStorageKey]);

  const loadFromBackendCache = useCallback(async (targetCompanyId: number): Promise<Set<string>> => {
    try {
      const cacheResult = await api.getImportedAssetsCache(targetCompanyId);
      const assets = new Set<string>(cacheResult.assets.map(name => normalizeName(name)));
      
      setCachedAssetsToLocalStorage(targetCompanyId, assets, cacheResult.lastSync);
      
      return assets;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      
      if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('Cache not found')) {
        try {
          await api.syncImportedAssets(targetCompanyId, false);
          const cacheResult = await api.getImportedAssetsCache(targetCompanyId);
          const assets = new Set(cacheResult.assets.map(name => normalizeName(name)));
          
          setCachedAssetsToLocalStorage(targetCompanyId, assets, cacheResult.lastSync);
          
          return assets;
        } catch (syncErr: unknown) {
          throw new Error(`Failed to load cache: ${errorMsg}. Sync also failed: ${syncErr instanceof Error ? syncErr.message : 'Unknown error'}`);
        }
      }
      
      throw err;
    }
  }, [api, setCachedAssetsToLocalStorage]);

  const refreshImportedAssets = useCallback(async (
    targetCompanyId: number,
    forceRefresh = false
  ): Promise<Set<string>> => {
    setLoading(true);
    setError(undefined);

    try {
      if (forceRefresh) {
        try {
          await api.syncImportedAssets(targetCompanyId, true);
        } catch {
          // Sync failed - will try to load existing cache
        }
      }

      const assets = await loadFromBackendCache(targetCompanyId);
      
      setImportedAssets(new Set(assets));
      setLoading(false);
      
      return assets;
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to refresh imported assets';
      setError(errorMsg);
      setLoading(false);
      
      const cached = getCachedAssetsFromLocalStorage(targetCompanyId);
      if (cached) {
        setImportedAssets(cached);
        return cached;
      }
      
      throw e;
    }
  }, [api, loadFromBackendCache, getCachedAssetsFromLocalStorage]);

  const checkImportedNames = useCallback(async (targetCompanyId: number, names: string[]): Promise<Set<string>> => {
    if (names.length === 0) {
      return new Set<string>();
    }

    try {
      const result = await api.checkImportedAssetNames(targetCompanyId, names);
      const foundNames = new Set(result.importedNames || []);
      
      setImportedAssets(prev => {
        const updated = new Set(prev);
        foundNames.forEach(name => updated.add(name));
        setCachedAssetsToLocalStorage(targetCompanyId, updated);
        return new Set(updated);
      });
      
      return foundNames;
    } catch {
      return new Set<string>();
    }
  }, [api, setCachedAssetsToLocalStorage]);

  useEffect(() => {
    if (companyId) {
      const cached = getCachedAssetsFromLocalStorage(companyId);
      if (cached) {
        setImportedAssets(new Set(cached));
      }

      loadFromBackendCache(companyId)
        .then(assets => {
          setImportedAssets(new Set(assets));
        })
        .catch(() => {
        });
    }
  }, [companyId, getCachedAssetsFromLocalStorage, loadFromBackendCache]);

  const isImported = useCallback((entityName: string): boolean => {
    return importedAssets.has(normalizeName(entityName));
  }, [importedAssets]);

  const addImportedNames = useCallback(async (names: string[]): Promise<void> => {
    if (!companyId || names.length === 0) return;

    try {
      await api.addImportedNames(companyId, names);
    } catch {
      // Silently fail - error is handled by the API layer
    }

    setImportedAssets(prev => {
      const updated = new Set(prev);
      names.forEach(name => {
        updated.add(normalizeName(name));
      });
      setCachedAssetsToLocalStorage(companyId, updated);
      return new Set(updated);
    });
  }, [companyId, api, setCachedAssetsToLocalStorage]);

  return {
    importedAssets,
    loading,
    error,
    refreshImportedAssets,
    checkImportedNames,
    addImportedNames,
    isImported,
  };
}
