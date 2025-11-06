import { Checkbox, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
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
}

export function ProjectTable({
  entities,
  selectedProjects,
  importedAssets,
  autoImportEnabled,
  onToggleProject,
  onSelectAll,
}: ProjectTableProps) {
  // Calcula apenas itens não importados uma vez
  const nonImportedEntities = entities.filter(e => {
    const name = normalizeName(e.metadata.name);
    return !importedAssets.has(name);
  });
  const nonImportedCount = nonImportedEntities.length;
  const allNonImportedSelected = nonImportedCount > 0 && selectedProjects.size === nonImportedCount;
  const someNonImportedSelected = selectedProjects.size > 0 && selectedProjects.size < nonImportedCount;

  return (
    <Table className={`conviso-table ${autoImportEnabled ? 'conviso-table-disabled' : ''}`}>
      <TableHead>
        <TableRow className="conviso-table-header">
          <TableCell padding="checkbox">
            <Checkbox
              checked={allNonImportedSelected}
              indeterminate={someNonImportedSelected}
              onChange={onSelectAll}
              disabled={autoImportEnabled}
              title={autoImportEnabled ? "Disable Automatic Import to select projects manually" : ""}
            />
          </TableCell>
          <TableCell>Name</TableCell>
          <TableCell>Description</TableCell>
          <TableCell>Owner</TableCell>
          <TableCell>Lifecycle</TableCell>
          <TableCell>Type</TableCell>
          <TableCell>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {entities.map((entity) => {
          const entityId = getEntityId(entity);
          const isSelected = selectedProjects.has(entityId);
          const entityName = normalizeName(entity.metadata.name);
          const isImported = importedAssets.has(entityName);
          
          return (
            <TableRow 
              key={entityId} 
              selected={isSelected && !autoImportEnabled}
              className={`conviso-table-row ${isImported ? 'conviso-table-row-imported' : ''} ${autoImportEnabled ? 'conviso-table-row-disabled' : ''} ${isSelected ? 'conviso-table-row-selected' : ''}`}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={isImported || isSelected}
                  onChange={() => {
                    // Não permite desmarcar se estiver importado
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
        })}
      </TableBody>
    </Table>
  );
}

