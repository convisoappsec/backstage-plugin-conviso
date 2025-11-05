import { ContentHeader, InfoCard, Progress, WarningPanel } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Button, Grid, Typography } from '@material-ui/core';
import { useCallback, useMemo, useState } from 'react';
import { convisoPlatformApiRef } from '../../api/convisoPlatformApi';
import { useAutoImport } from '../../hooks/useAutoImport';
import { useEntities } from '../../hooks/useEntities';
import { useImportedAssets } from '../../hooks/useImportedAssets';
import '../../styles/conviso-theme.css';
import { getEntityId, mapEntityToProject } from '../../utils/mappers';
import { normalizeName } from '../../utils/nameNormalizer';
import { AutoImportToggle } from '../AutoImportToggle';
import { ProjectTable } from '../ProjectTable';

interface ProjectSelectorProps {
  onImportSuccess?: () => void;
}

export const ProjectSelector = ({ onImportSuccess }: ProjectSelectorProps) => {
  const api = useApi(convisoPlatformApiRef);
  const { entities, loading: entitiesLoading, error: entitiesError } = useEntities();
  
  const companyIdStr = useMemo(() => localStorage.getItem('conviso_company_id'), []);
  const companyId = companyIdStr ? parseInt(companyIdStr, 10) : null;
  
  const {
    importedAssets,
    loading: assetsLoading,
    error: assetsError,
    refreshImportedAssets,
  } = useImportedAssets(companyId);

  const instanceId = useMemo(() => localStorage.getItem('conviso_backstage_instance_id') || '', []);
  const { autoImportEnabled, setAutoImportEnabled } = useAutoImport(instanceId, companyId || undefined);

  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();

  const loading = entitiesLoading || assetsLoading;

  const handleToggleProject = useCallback((entityId: string) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      } else {
        newSet.add(entityId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedProjects.size === entities.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(entities.map(e => getEntityId(e))));
    }
  }, [selectedProjects.size, entities]);

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
    setErrorMessage(undefined);
    setSuccessMessage(undefined);

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
        setSuccessMessage(`Successfully imported ${result.importedCount} project(s)!`);
        setSelectedProjects(new Set());
        
        const expectedImportedNames = projectsToImport.map(p => normalizeName(p.name));
        const currentImported = new Set(importedAssets);
        expectedImportedNames.forEach(name => {
          if (name) {
            currentImported.add(name);
          }
        });
        
        const pollForImportedAssets = async (attempt: number = 1, maxAttempts: number = 5) => {
          if (attempt > maxAttempts) return;

          try {
            const refreshedNames = await refreshImportedAssets(companyId);
            const allFound = expectedImportedNames.every(name => refreshedNames.has(name));
            
            if (!allFound) {
              setTimeout(() => pollForImportedAssets(attempt + 1, maxAttempts), 2000);
            }
          } catch {
            // On error, keep the local state we already updated
          }
        };
        
        setTimeout(() => pollForImportedAssets(1, 5), 2000);
        
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else {
        setErrorMessage(
          `Imported ${result.importedCount} project(s), but encountered errors: ${result.errors?.join(', ') || 'Unknown errors'}`
        );
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to import projects');
    } finally {
      setImporting(false);
    }
  }, [selectedProjects, entities, importedAssets, companyId, api, refreshImportedAssets, onImportSuccess]);

  const handleRefreshImportedAssets = useCallback(async () => {
    if (!companyId) {
      setErrorMessage('Company ID not found. Please configure the integration first.');
      return;
    }

    try {
      await refreshImportedAssets(companyId);
      setSuccessMessage('Imported assets list refreshed!');
    } catch (e: any) {
      setErrorMessage('Failed to refresh imported assets: ' + (e?.message || 'Unknown error'));
    }
  }, [companyId, refreshImportedAssets]);

  const error = errorMessage || entitiesError || assetsError;

  return (
    <>
      <ContentHeader title="Select Projects">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={handleSelectAll}
            disabled={loading || importing || entities.length === 0 || autoImportEnabled}
            title={autoImportEnabled ? "Disable Automatic Import to enable manual import" : ""}
            className="conviso-button-secondary"
          >
            {selectedProjects.size === entities.length ? 'Deselect All' : 'Select All'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleRefreshImportedAssets}
            disabled={loading || importing}
            title="Refresh the list of imported assets from Conviso Platform"
            className="conviso-button-secondary"
          >
            Refresh Status
          </Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={loading || importing || selectedProjects.size === 0 || autoImportEnabled}
            title={autoImportEnabled ? "Disable Automatic Import to enable manual import" : ""}
            className="conviso-button-primary"
            style={{
              backgroundColor: '#2c3e50',
              color: '#ffffff',
              fontWeight: 600,
              padding: '10px 24px',
              borderRadius: '6px',
              boxShadow: '0 2px 4px rgba(44, 62, 80, 0.2)',
            }}
          >
            Import Selected ({selectedProjects.size})
          </Button>
        </div>
      </ContentHeader>
      <Grid container spacing={3} direction="column">
        {error && (
          <Grid item>
            <WarningPanel title="Import failed">{error}</WarningPanel>
          </Grid>
        )}
        {successMessage && (
          <Grid item>
            <div className="conviso-success-message">
              <Typography variant="body2" style={{ color: '#0a2540', fontWeight: 600 }}>
                {successMessage}
              </Typography>
            </div>
          </Grid>
        )}
        <Grid item>
          <AutoImportToggle
            enabled={autoImportEnabled}
            onChange={setAutoImportEnabled}
          />
        </Grid>
        <Grid item>
          <InfoCard 
            title={`Available Components (${entities.length})`}
            className="conviso-info-card"
          >
            {loading ? (
              <Progress />
            ) : entities.length === 0 ? (
              <Typography variant="body1">No components found in the catalog.</Typography>
            ) : (
              <ProjectTable
                entities={entities}
                selectedProjects={selectedProjects}
                importedAssets={importedAssets}
                autoImportEnabled={autoImportEnabled}
                onToggleProject={handleToggleProject}
                onSelectAll={handleSelectAll}
              />
            )}
          </InfoCard>
        </Grid>
      </Grid>
    </>
  );
};
