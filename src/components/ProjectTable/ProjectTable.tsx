import { Checkbox, Chip, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Typography } from '@material-ui/core';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import { memo, useMemo } from 'react';
import { SortableColumn, SortDirection } from '../../hooks/useTableSort';
import { BackstageEntity } from '../../types/entity.types';
import { getEntityId } from '../../utils/mappers';
import { normalizeName } from '../../utils/nameNormalizer';

interface ProjectTableProps {
  entities: BackstageEntity[];
  selectedProjects: Set<string>;
  importedAssets: Set<string>;
  autoImportEnabled: boolean;
  onToggleProject: (entityId: string) => void;
  onSelectAll: () => void;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isAllVisibleSelected?: boolean;
  isSomeVisibleSelected?: boolean;
  sortColumn?: SortableColumn | null;
  sortDirection?: SortDirection;
  onSort?: (column: SortableColumn) => void;
}

interface ProjectTableRowProps {
  entity: BackstageEntity;
  entityId: string;
  isSelected: boolean;
  isImported: boolean;
  autoImportEnabled: boolean;
  onToggleProject: (entityId: string) => void;
}

const ProjectTableRow = memo(({
  entity,
  entityId,
  isSelected,
  isImported,
  autoImportEnabled,
  onToggleProject,
}: ProjectTableRowProps) => {
  return (
    <TableRow 
      selected={isSelected && !autoImportEnabled}
      className={`conviso-table-row ${isImported ? 'conviso-table-row-imported' : ''} ${autoImportEnabled ? 'conviso-table-row-disabled' : ''} ${isSelected ? 'conviso-table-row-selected' : ''}`}
    >
      <TableCell padding="checkbox">
        <Checkbox
          checked={isImported || isSelected}
          onChange={() => {
            if (!isImported) {
              onToggleProject(entityId);
            }
          }}
          disabled={isImported || autoImportEnabled}
          title={
            isImported 
              ? "This project is already imported and cannot be unselected"
              : autoImportEnabled 
                ? "Disable Automatic Import to select projects manually" 
                : ""
          }
          className={isImported ? 'conviso-checkbox-imported' : isSelected ? 'conviso-checkbox-selected' : ''}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {entity.metadata.name}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {entity.metadata.description || '-'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {entity.spec?.owner || '-'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {entity.spec?.lifecycle || '-'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {entity.spec?.type || '-'}
        </Typography>
      </TableCell>
      <TableCell>
        {isImported ? (
          <Chip
            icon={<CheckCircleIcon />}
            label="Imported"
            size="small"
            className="conviso-badge-imported"
          />
        ) : (
          <Chip
            label="Not Imported"
            size="small"
            className="conviso-badge-not-imported"
          />
        )}
      </TableCell>
    </TableRow>
  );
});

ProjectTableRow.displayName = 'ProjectTableRow';

export function ProjectTable({
  entities,
  selectedProjects,
  importedAssets,
  autoImportEnabled,
  onToggleProject,
  onSelectAll,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  isAllVisibleSelected = false,
  isSomeVisibleSelected = false,
  sortColumn = null,
  sortDirection = null,
  onSort,
}: ProjectTableProps) {
  const entityData = useMemo(() => {
    return entities.map((entity) => {
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
  }, [entities, importedAssets]);

  const SortableHeader = memo(({ column, label }: { column: SortableColumn; label: string }) => {
    if (!onSort) {
      return <TableCell>{label}</TableCell>;
    }

    const isSorted = sortColumn === column;
    const isAsc = sortDirection === 'asc' && isSorted;
    const isDesc = sortDirection === 'desc' && isSorted;

    return (
      <TableCell
        onClick={() => onSort(column)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        title={`Click to sort by ${label}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{label}</span>
          {isAsc && <ArrowUpwardIcon style={{ fontSize: 16 }} />}
          {isDesc && <ArrowDownwardIcon style={{ fontSize: 16 }} />}
          {!isSorted && <span style={{ width: 16, display: 'inline-block' }} />}
        </div>
      </TableCell>
    );
  });

  SortableHeader.displayName = 'SortableHeader';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <Table className={`conviso-table ${autoImportEnabled ? 'conviso-table-disabled' : ''}`}>
          <TableHead>
            <TableRow className="conviso-table-header">
              <TableCell padding="checkbox">
                <Checkbox
                  checked={isAllVisibleSelected}
                  indeterminate={isSomeVisibleSelected}
                  onChange={onSelectAll}
                  disabled={autoImportEnabled}
                  title={autoImportEnabled ? "Disable Automatic Import to select projects manually" : ""}
                />
              </TableCell>
              <SortableHeader column="name" label="Name" />
              <SortableHeader column="description" label="Description" />
              <SortableHeader column="owner" label="Owner" />
              <SortableHeader column="lifecycle" label="Lifecycle" />
              <SortableHeader column="type" label="Type" />
              <SortableHeader column="status" label="Status" />
            </TableRow>
          </TableHead>
          <TableBody>
            {entityData.map(({ entity, entityId, isImported }) => {
              const isSelected = selectedProjects.has(entityId);
              
              return (
                <ProjectTableRow
                  key={entityId}
                  entity={entity}
                  entityId={entityId}
                  isSelected={isSelected}
                  isImported={isImported}
                  autoImportEnabled={autoImportEnabled}
                  onToggleProject={onToggleProject}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25, 50, 100]}
        labelRowsPerPage="Rows per page:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
        style={{ overflow: 'visible', flexShrink: 0 }}
      />
    </div>
  );
}

