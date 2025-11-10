import { useApi } from '@backstage/core-plugin-api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { convisoPlatformApiRef } from '../api/convisoPlatformApi';
import { normalizeName } from '../utils/nameNormalizer';

const CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheEntry {
  assets: Set<string>;
  timestamp: number;
}

export function useImportedAssets(companyId: number | null) {
  const api = useApi(convisoPlatformApiRef);
  const [importedAssets, setImportedAssets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const cacheRef = useRef<Map<number, CacheEntry>>(new Map());

  const getCachedAssets = useCallback((id: number): Set<string> | null => {
    const cached = cacheRef.current.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.assets;
    }
    return null;
  }, []);

  const setCachedAssets = useCallback((id: number, assets: Set<string>): void => {
    cacheRef.current.set(id, {
      assets: new Set(assets),
      timestamp: Date.now(),
    });
  }, []);

  const refreshImportedAssets = useCallback(async (companyId: number, forceRefresh = false): Promise<Set<string>> => {
    const cached = getCachedAssets(companyId);
    
    if (!forceRefresh && cached) {
      setImportedAssets(cached);
      return cached;
    }

    try {
      setLoading(true);
      setError(undefined);
      
      const result = await api.getImportedAssets(companyId);
      
      const importedNames = new Set(
        result.assets.map((asset) => normalizeName(asset.name))
      );
      
      setImportedAssets(importedNames);
      setCachedAssets(companyId, importedNames);
      return importedNames;
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to load imported assets';
      console.error('[useImportedAssets] Error fetching imported assets:', errorMsg, e);
      setError(errorMsg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [api, getCachedAssets, setCachedAssets]);

  const checkImportedNames = useCallback(async (companyId: number, names: string[]): Promise<Set<string>> => {
    if (names.length === 0) {
      return new Set<string>();
    }

    try {
      const result = await api.checkImportedAssetNames(companyId, names);

      const foundNames = new Set(result.importedNames || []);
      
      setImportedAssets(prev => {
        const updated = new Set(prev);
        foundNames.forEach(name => updated.add(name));
        return updated;
      });
      
      return foundNames;
    } catch (e: any) {
      return new Set<string>();
    }
  }, [api]);

  useEffect(() => {
    if (companyId) {
      const cached = getCachedAssets(companyId);
      if (cached) {
        setImportedAssets(cached);
      } else {
        refreshImportedAssets(companyId).catch(() => {
        });
      }
    }
  }, [companyId, refreshImportedAssets, getCachedAssets]);

  const isImported = useCallback((entityName: string): boolean => {
    return importedAssets.has(normalizeName(entityName));
  }, [importedAssets]);

  return {
    importedAssets,
    loading,
    error,
    refreshImportedAssets,
    checkImportedNames,
    isImported,
  };
}

