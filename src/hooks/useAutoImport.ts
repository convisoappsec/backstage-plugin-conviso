import { useApi } from '@backstage/core-plugin-api';
import { useEffect, useState } from 'react';
import { convisoPlatformApiRef } from '../api/convisoPlatformApi';

export function useAutoImport(instanceId: string, companyId?: number) {
  const api = useApi(convisoPlatformApiRef);
  const [autoImportEnabled, setAutoImportEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('conviso_auto_import_enabled');
    return saved === 'true';
  });

  useEffect(() => {
    if (!instanceId) return;

    const loadFromIntegration = async () => {
      if (companyId) {
        try {
          const result = await api.getIntegration(instanceId);
          if (result?.integration?.autoImportEnabled !== undefined) {
            setAutoImportEnabled(result.integration.autoImportEnabled);
          }
        } catch {
          // Fallback to backend endpoint
        }
      }

      try {
        const setting = await api.getAutoImport(instanceId);
        setAutoImportEnabled(setting.enabled);
      } catch {
        // Could not load auto-import setting
      }
    };

    loadFromIntegration();
  }, [api, instanceId, companyId]);

  useEffect(() => {
    localStorage.setItem('conviso_auto_import_enabled', String(autoImportEnabled));
    
    if (instanceId) {
      api.setAutoImport(instanceId, autoImportEnabled, companyId).catch(() => {
        // Failed to update auto-import setting
      });
    }
  }, [autoImportEnabled, instanceId, companyId, api]);

  return {
    autoImportEnabled,
    setAutoImportEnabled,
  };
}

