import { useApi } from '@backstage/core-plugin-api';
import { useCallback, useEffect, useState } from 'react';
import { convisoPlatformApiRef } from '../api/convisoPlatformApi';
import { normalizeName } from '../utils/nameNormalizer';

export function useImportedAssets(companyId: number | null) {
  const api = useApi(convisoPlatformApiRef);
  const [importedAssets, setImportedAssets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const refreshImportedAssets = useCallback(async (companyId: number): Promise<Set<string>> => {
    try {
      setLoading(true);
      setError(undefined);
      const result = await api.getImportedAssets(companyId);
      
      const importedNames = new Set(
        result.assets.map((asset) => normalizeName(asset.name))
      );
      
      setImportedAssets(importedNames);
      return importedNames;
    } catch (e: any) {
      setError(e?.message || 'Failed to load imported assets');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (companyId) {
      refreshImportedAssets(companyId).catch(() => {
        // Error handled by state
      });
    }
  }, [companyId, refreshImportedAssets]);

  const isImported = useCallback((entityName: string): boolean => {
    return importedAssets.has(normalizeName(entityName));
  }, [importedAssets]);

  return {
    importedAssets,
    loading,
    error,
    refreshImportedAssets,
    isImported,
  };
}

