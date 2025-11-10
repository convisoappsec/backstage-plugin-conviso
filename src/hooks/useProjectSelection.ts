import { useCallback, useMemo, useState } from 'react';
import { BackstageEntity } from '../types/entity.types';
import { getEntityId } from '../utils/mappers';
import { normalizeName } from '../utils/nameNormalizer';

interface UseProjectSelectionOptions {
  entities: BackstageEntity[];
  importedAssets: Set<string>;
  visibleEntities?: BackstageEntity[];
}

interface UseProjectSelectionReturn {
  selectedProjects: Set<string>;
  toggleProject: (entityId: string) => void;
  selectAll: () => void;
  selectAllVisible: () => void;
  clearSelection: () => void;
  isAllSelected: boolean;
  isAllVisibleSelected: boolean;
  isSomeSelected: boolean;
  isSomeVisibleSelected: boolean;
}

export function useProjectSelection({
  entities,
  importedAssets,
  visibleEntities,
}: UseProjectSelectionOptions): UseProjectSelectionReturn {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  const nonImportedEntities = useMemo(() => {
    if (importedAssets.size === 0) {
      return entities;
    }
    return entities.filter(e => {
      const name = normalizeName(e.metadata.name);
      return !importedAssets.has(name);
    });
  }, [entities, importedAssets]);

  const nonImportedIds = useMemo(() => {
    return new Set(nonImportedEntities.map(e => getEntityId(e)));
  }, [nonImportedEntities]);

  const visibleNonImportedEntities = useMemo(() => {
    if (!visibleEntities) return [];
    return visibleEntities.filter(e => {
      const name = normalizeName(e.metadata.name);
      return !importedAssets.has(name);
    });
  }, [visibleEntities, importedAssets]);

  const visibleNonImportedIds = useMemo(() => {
    return new Set(visibleNonImportedEntities.map(e => getEntityId(e)));
  }, [visibleNonImportedEntities]);

  const isAllSelected = useMemo(() => {
    if (nonImportedIds.size === 0) return false;
    if (selectedProjects.size === 0) return false;
    if (selectedProjects.size < nonImportedIds.size) return false;
    
    for (const id of nonImportedIds) {
      if (!selectedProjects.has(id)) {
        return false;
      }
    }
    return true;
  }, [nonImportedIds, selectedProjects]);

  const isAllVisibleSelected = useMemo(() => {
    return visibleNonImportedIds.size > 0 && 
      Array.from(visibleNonImportedIds).every(id => selectedProjects.has(id));
  }, [visibleNonImportedIds, selectedProjects]);

  const isSomeSelected = useMemo(() => {
    return selectedProjects.size > 0 && !isAllSelected;
  }, [selectedProjects.size, isAllSelected]);

  const isSomeVisibleSelected = useMemo(() => {
    return visibleNonImportedIds.size > 0 &&
      Array.from(visibleNonImportedIds).some(id => selectedProjects.has(id)) &&
      !isAllVisibleSelected;
  }, [visibleNonImportedIds, selectedProjects, isAllVisibleSelected]);

  const toggleProject = useCallback((entityId: string) => {
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

  const selectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(nonImportedIds));
    }
  }, [isAllSelected, nonImportedIds]);

  const selectAllVisible = useCallback(() => {
    if (isAllVisibleSelected) {
      setSelectedProjects(prev => {
        const newSet = new Set(prev);
        Array.from(visibleNonImportedIds).forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedProjects(prev => {
        const newSet = new Set(prev);
        Array.from(visibleNonImportedIds).forEach(id => newSet.add(id));
        return newSet;
      });
    }
  }, [isAllVisibleSelected, visibleNonImportedIds]);

  const clearSelection = useCallback(() => {
    setSelectedProjects(new Set());
  }, []);

  return {
    selectedProjects,
    toggleProject,
    selectAll,
    selectAllVisible,
    clearSelection,
    isAllSelected,
    isAllVisibleSelected,
    isSomeVisibleSelected,
    isSomeSelected,
  };
}

