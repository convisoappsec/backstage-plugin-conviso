import { ContentHeader, InfoCard, Progress, WarningPanel } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Button, CircularProgress, Grid, InputAdornment, TextField, Typography } from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { convisoPlatformApiRef } from '../../api/convisoPlatformApi';
import { useAutoImport } from '../../hooks/useAutoImport';
import { useDebounce } from '../../hooks/useDebounce';
import { useEntities } from '../../hooks/useEntities';
import { useEntityFilter } from '../../hooks/useEntityFilter';
import { useImportedAssets } from '../../hooks/useImportedAssets';
import { usePagination } from '../../hooks/usePagination';
import { useProjectImport } from '../../hooks/useProjectImport';
import { useProjectSelection } from '../../hooks/useProjectSelection';
import { SortableColumn, useTableSort } from '../../hooks/useTableSort';
import { BackstageEntity } from '../../types/entity.types';
import { getEntityId } from '../../utils/mappers';
import { normalizeName } from '../../utils/nameNormalizer';
import { AutoImportToggle } from '../AutoImportToggle';
import { ProjectTable } from '../ProjectTable';

interface ProjectSelectorProps {
  onImportSuccess?: () => void;
}

export const ProjectSelector = ({ onImportSuccess }: ProjectSelectorProps) => {
  const { entities, loading: entitiesLoading, error: entitiesError } = useEntities();
  const api = useApi(convisoPlatformApiRef);
  
  const [companyId, setCompanyId] = useState<number | null>(null);
  
  useEffect(() => {
    async function loadCompanyId() {
      try {
        const config = await api.getConfig();
        if (config.companyId) {
          setCompanyId(config.companyId);
        }
      } catch {
        // Error handled silently - will show error message if needed
      }
    }
    loadCompanyId();
  }, [api]);
  
  const {
    importedAssets,
    loading: assetsLoading,
    error: assetsError,
    refreshImportedAssets,
    addImportedNames,
  } = useImportedAssets(companyId);

  const [refreshSuccess, setRefreshSuccess] = useState<string | undefined>();
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const instanceId = useMemo(() => localStorage.getItem('conviso_backstage_instance_id') || '', []);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);
  const { autoImportEnabled, setAutoImportEnabled } = useAutoImport(instanceId, companyId || undefined);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { filteredEntities } = useEntityFilter({ entities, searchQuery: debouncedSearchQuery });

  const entityData = useMemo(() => {
    return filteredEntities.map((entity) => {
      const entityId = getEntityId(entity);
      const entityName = normalizeName(entity.metadata.name);
      const isImported = importedAssets.has(entityName);
      return {
        entity,
        entityId,
        entityName,
        isImported,
      };
    });
  }, [filteredEntities, importedAssets]);

  const getSortValue = useCallback((item: typeof entityData[0], column: SortableColumn): string | number | boolean => {
    switch (column) {
      case 'name':
        return item.entity.metadata.name?.toLowerCase() || '';
      case 'description':
        return item.entity.metadata.description?.toLowerCase() || '';
      case 'owner':
        return item.entity.spec?.owner?.toLowerCase() || '';
      case 'lifecycle':
        return item.entity.spec?.lifecycle?.toLowerCase() || '';
      case 'type':
        return item.entity.spec?.type?.toLowerCase() || '';
      case 'status':
        return item.isImported;
      default:
        return '';
    }
  }, []);

  const { sortedItems, sortColumn, sortDirection, handleSort } = useTableSort({
    items: entityData,
    getSortValue,
  });

  const sortedEntities = useMemo((): BackstageEntity[] => {
    return sortedItems.map((item) => item.entity);
  }, [sortedItems]);
  
  const {
    paginatedItems: paginatedEntities,
    page,
    rowsPerPage,
    totalCount,
    handlePageChange,
    handleRowsPerPageChange,
    resetPage,
  } = usePagination({ items: sortedEntities });

  const {
    selectedProjects,
    toggleProject,
    selectAll,
    selectAllVisible,
    clearSelection,
    isAllSelected,
    isAllVisibleSelected,
    isSomeVisibleSelected,
  } = useProjectSelection({ 
    entities, 
    importedAssets,
    visibleEntities: paginatedEntities,
  });

  const {
    importing,
    errorMessage: importError,
    successMessage: importSuccess,
    handleImport,
  } = useProjectImport({
    entities,
    selectedProjects,
    importedAssets,
    companyId,
    onImportSuccess,
    onSelectionCleared: clearSelection,
    onImportedNamesAdded: addImportedNames,
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    resetPage();
  }, [resetPage]);

  const loading = entitiesLoading;
  const error = importError || entitiesError || assetsError;
  const successMessage = importSuccess;

  return (
    <>
      <ContentHeader title="Select Projects">
        <div>
          <Button
            variant="outlined"
            onClick={selectAll}
            disabled={loading || importing || entities.length === 0 || autoImportEnabled}
            title={autoImportEnabled ? "Disable Automatic Import to enable manual import" : ""}
            className="conviso-button-secondary"
          >
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </Button>
          <Button
            variant="outlined"
            onClick={async () => {
              if (!companyId) return;
              
              try {
                if (successTimeoutRef.current) {
                  clearTimeout(successTimeoutRef.current);
                }
                setRefreshSuccess(undefined);
                
                setRefreshSuccess('Refreshing... This may take a few minutes.');
                
                const result = await refreshImportedAssets(companyId, true);
                setRefreshSuccess(`Successfully refreshed! Found ${result.size} imported asset${result.size !== 1 ? 's' : ''}.`);
                successTimeoutRef.current = setTimeout(() => {
                  setRefreshSuccess(undefined);
                  successTimeoutRef.current = null;
                }, 5000);
              } catch (e: unknown) {
                const errorMsg = e instanceof Error ? e.message : 'Failed to refresh assets';
                setRefreshSuccess(`Refresh failed: ${errorMsg}. Please try again or check the backend logs.`);
                setTimeout(() => {
                  setRefreshSuccess(undefined);
                }, 10000);
              }
            }}
            disabled={assetsLoading || importing || !companyId}
            title={assetsLoading ? "Refreshing the list of imported assets. This may take a few minutes..." : "Refresh the list of imported assets from Conviso Platform"}
            className="conviso-button-secondary"
            startIcon={assetsLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {assetsLoading ? 'Refreshing...' : 'Refresh Status'}
          </Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={loading || importing || selectedProjects.size === 0 || autoImportEnabled}
            title={autoImportEnabled ? "Disable Automatic Import to enable manual import" : ""}
            className="conviso-button-primary"
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
              <Typography variant="body2">
                {successMessage}
              </Typography>
            </div>
          </Grid>
        )}
        {refreshSuccess && (
          <Grid item>
            <div className="conviso-success-message">
              <Typography variant="body2" style={{ color: '#4caf50' }}>
                {refreshSuccess}
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
              <>
                <Grid item xs={12} style={{ marginBottom: '16px' }}>
                  <TextField
                    fullWidth
                    placeholder="Search by name, description, or owner..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <ProjectTable
                  entities={paginatedEntities}
                  selectedProjects={selectedProjects}
                  importedAssets={importedAssets}
                  autoImportEnabled={autoImportEnabled}
                  onToggleProject={toggleProject}
                  onSelectAll={selectAllVisible}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  totalCount={totalCount}
                  onPageChange={handlePageChange}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  isAllVisibleSelected={isAllVisibleSelected}
                  isSomeVisibleSelected={isSomeVisibleSelected}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </>
            )}
          </InfoCard>
        </Grid>
      </Grid>
    </>
  );
};
