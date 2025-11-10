import { ContentHeader, InfoCard, Progress, WarningPanel } from '@backstage/core-components';
import { Button, CircularProgress, Grid, InputAdornment, TextField, Typography } from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import { useCallback, useMemo, useState } from 'react';
import { useAutoImport } from '../../hooks/useAutoImport';
import { useEntities } from '../../hooks/useEntities';
import { useEntityFilter } from '../../hooks/useEntityFilter';
import { useImportedAssets } from '../../hooks/useImportedAssets';
import { usePagination } from '../../hooks/usePagination';
import { useProjectImport } from '../../hooks/useProjectImport';
import { useProjectSelection } from '../../hooks/useProjectSelection';
import { AutoImportToggle } from '../AutoImportToggle';
import { ProjectTable } from '../ProjectTable';

interface ProjectSelectorProps {
  onImportSuccess?: () => void;
}

export const ProjectSelector = ({ onImportSuccess }: ProjectSelectorProps) => {
  const { entities, loading: entitiesLoading, error: entitiesError } = useEntities();
  
  const companyIdStr = useMemo(() => localStorage.getItem('conviso_company_id'), []);
  const companyId = companyIdStr ? parseInt(companyIdStr, 10) : null;
  
  const {
    importedAssets,
    loading: assetsLoading,
    error: assetsError,
    refreshImportedAssets,
  } = useImportedAssets(companyId);

  const [refreshSuccess, setRefreshSuccess] = useState<string | undefined>();

  const instanceId = useMemo(() => localStorage.getItem('conviso_backstage_instance_id') || '', []);
  const { autoImportEnabled, setAutoImportEnabled } = useAutoImport(instanceId, companyId || undefined);

  const [searchQuery, setSearchQuery] = useState<string>('');

  const { filteredEntities } = useEntityFilter({ entities, searchQuery });
  const {
    paginatedItems: paginatedEntities,
    page,
    rowsPerPage,
    totalCount,
    handlePageChange,
    handleRowsPerPageChange,
    resetPage,
  } = usePagination({ items: filteredEntities });

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
                setRefreshSuccess(undefined);
                const result = await refreshImportedAssets(companyId, true);
                setRefreshSuccess(`Successfully refreshed! Found ${result.size} imported asset${result.size !== 1 ? 's' : ''}.`);
                setTimeout(() => setRefreshSuccess(undefined), 5000);
              } catch (e: any) {
                console.error('[ProjectSelector] Refresh failed:', e);
                setRefreshSuccess(undefined);
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
            title={`Available Components (${filteredEntities.length})`}
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
                />
              </>
            )}
          </InfoCard>
        </Grid>
      </Grid>
    </>
  );
};
