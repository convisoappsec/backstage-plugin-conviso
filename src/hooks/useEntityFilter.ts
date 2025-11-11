import { useMemo } from 'react';
import { BackstageEntity } from '../types/entity.types';

interface UseEntityFilterOptions {
  entities: BackstageEntity[];
  searchQuery: string;
}

export function useEntityFilter({ entities, searchQuery }: UseEntityFilterOptions) {
  const filteredEntities = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      return entities;
    }

    const query = trimmedQuery.toLowerCase();
    
    return entities.filter(entity => {
      const name = entity.metadata.name?.toLowerCase() || '';
      const description = entity.metadata.description?.toLowerCase() || '';
      const owner = entity.spec?.owner?.toLowerCase() || '';
      
      return (
        name.includes(query) || 
        description.includes(query) || 
        owner.includes(query)
      );
    });
  }, [entities, searchQuery]);

  return { filteredEntities };
}

