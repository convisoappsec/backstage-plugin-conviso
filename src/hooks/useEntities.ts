import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { useEffect, useState } from 'react';
import { BackstageEntity } from '../types/entity.types';

export function useEntities() {
  const catalogApi = useApi(catalogApiRef);
  const [entities, setEntities] = useState<BackstageEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    async function fetchEntities() {
      try {
        setLoading(true);
        setError(undefined);
        
        const response = await catalogApi.getEntities({
          filter: { kind: 'Component' },
          fields: [
            'metadata.name',
            'metadata.namespace',
            'metadata.description',
            'metadata.annotations',
            'metadata.tags',
            'metadata.links',
            'spec.type',
            'spec.lifecycle',
            'spec.owner',
            'kind',
            'apiVersion',
          ],
        });
        
        const validEntities = response.items.filter((item: any) => {
          return item.kind === 'Component' && item.metadata?.name;
        }) as BackstageEntity[];
        
        setEntities(validEntities);
        
        if (validEntities.length === 0) {
          setError('No components found in the catalog. Make sure you have components registered in Backstage.');
        }
      } catch (e: any) {
        setError(`Failed to load entities: ${e?.message || 'Unknown error'}.`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchEntities();
  }, [catalogApi]);

  return {
    entities,
    loading,
    error,
  };
}

