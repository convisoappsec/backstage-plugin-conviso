import { Checkbox, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import { BackstageEntity } from '../../types/entity.types';
import { getEntityId } from '../../utils/mappers';
import { normalizeName } from '../../utils/name-normalizer';

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
  return (
    <Table className="conviso-table">
      <TableHead>
        <TableRow className="conviso-table-header">
          <TableCell padding="checkbox">
            <Checkbox
              checked={selectedProjects.size === entities.length && entities.length > 0}
              indeterminate={selectedProjects.size > 0 && selectedProjects.size < entities.length}
              onChange={onSelectAll}
              disabled={autoImportEnabled}
              title={autoImportEnabled ? "Desative a Importação Automática para selecionar projetos manualmente" : ""}
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
              selected={isSelected}
              className={`conviso-table-row ${isImported ? 'conviso-table-row-imported' : ''}`}
              style={{ 
                borderLeft: isImported ? '4px solid #FFB800' : 'none',
              }}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={isSelected}
                  onChange={() => onToggleProject(entityId)}
                  disabled={isImported || autoImportEnabled}
                  title={autoImportEnabled ? "Desative a Importação Automática para selecionar projetos manualmente" : ""}
                />
              </TableCell>
              <TableCell>
                <Typography 
                  variant="body2" 
                  style={{ 
                    fontWeight: isImported ? 'normal' : 'medium',
                  }}
                >
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
                    label="✔ Imported"
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

