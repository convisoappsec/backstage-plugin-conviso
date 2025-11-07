import { useApi } from '@backstage/core-plugin-api';
import { useCallback, useState } from 'react';
import { convisoPlatformApiRef } from '../api/convisoPlatformApi';
import { BackstageEntity } from '../types/entity.types';
import { getEntityId, mapEntityToProject } from '../utils/mappers';
import { normalizeName } from '../utils/nameNormalizer';

interface UseProjectImportOptions {
  entities: BackstageEntity[];
  selectedProjects: Set<string>;
  importedAssets: Set<string>;
  companyId: number | null;
  onImportSuccess?: (() => void) | undefined;
  onSelectionCleared?: () => void;
}

interface UseProjectImportReturn {
  importing: boolean;
  errorMessage: string | undefined;
  successMessage: string | undefined;
  handleImport: () => Promise<void>;
  clearMessages: () => void;
}

export function useProjectImport({
  entities,
  selectedProjects,
  importedAssets,
  companyId,
  onImportSuccess,
  onSelectionCleared,
}: UseProjectImportOptions): UseProjectImportReturn {
  const api = useApi(convisoPlatformApiRef);
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();

  const clearMessages = useCallback(() => {
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
  }, []);

  const handleImport = useCallback(async () => {
    if (selectedProjects.size === 0) {
      setErrorMessage('Please select at least one project to import');
      return;
    }

    if (!companyId) {
      setErrorMessage('Company ID not found. Please configure the integration first.');
      return;
    }

    setImporting(true);
    clearMessages();

    try {
      const projectsToImport = entities
        .filter(e => {
          const entityId = getEntityId(e);
          const entityName = normalizeName(e.metadata.name);
          const isAlreadyImported = importedAssets.has(entityName);
          return selectedProjects.has(entityId) && !isAlreadyImported;
        })
        .map(mapEntityToProject);

      if (projectsToImport.length === 0) {
        setErrorMessage('All selected projects have already been imported');
        setImporting(false);
        return;
      }

      const result = await api.importBackstageProjectsToAssets({
        companyId,
        projects: projectsToImport,
      });

      if (result.success) {
        setSuccessMessage(
          `Import job started successfully! Projects are being processed asynchronously.`
        );
        
        if (onSelectionCleared) {
          onSelectionCleared();
        }
        
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else {
        setErrorMessage(
          `Failed to start import job: ${result.errors?.join(', ') || 'Unknown errors'}`
        );
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to import projects');
    } finally {
      setImporting(false);
    }
  }, [selectedProjects, entities, importedAssets, companyId, api, onImportSuccess, clearMessages]);

  return {
    importing,
    errorMessage,
    successMessage,
    handleImport,
    clearMessages,
  };
}

