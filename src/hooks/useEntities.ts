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
    let cancelled = false;
    
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
        
        if (cancelled) {
          return;
        }
        
        const validEntities = response.items?.filter((item: any) => {
          return item.kind === 'Component' && item.metadata?.name;
        }) as BackstageEntity[] || [];
        
        setEntities(validEntities);
        
        if (validEntities.length === 0) {
          const errorMsg = 'No components found in the catalog. ' +
            'The catalog may still be processing entities. ' +
            'Please wait a few minutes and refresh the page, or check the Backstage catalog configuration.';
          setError(errorMsg);
          console.warn('[useEntities]', errorMsg);
        }
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        
        let errorMessage = 'Failed to load entities';
        
        if (e instanceof Error) {
          const message = e.message.toLowerCase();
          
          if (message.includes('failed to fetch') || message.includes('network error')) {
            errorMessage = 'Failed to load entities: Network error. Please check if the Backstage backend is running and accessible.';
          } else if (message.includes('unauthorized') || message.includes('401')) {
            errorMessage = 'Failed to load entities: Authentication error. Please refresh the page and try again.';
          } else if (message.includes('forbidden') || message.includes('403')) {
            errorMessage = 'Failed to load entities: Access denied. Please check your permissions.';
          } else {
            errorMessage = `Failed to load entities: ${e.message}`;
          }
        } else if (typeof e === 'string') {
          errorMessage = `Failed to load entities: ${e}`;
        } else if (e && typeof e === 'object' && 'message' in e) {
          errorMessage = `Failed to load entities: ${String(e.message)}`;
        } else {
          errorMessage = 'Failed to load entities: Unknown error. Please check your Backstage catalog configuration and network connection.';
        }
        
        console.error('[useEntities] Error fetching entities:', e);
        setError(errorMessage);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    fetchEntities();
    
    return () => {
      cancelled = true;
    };
  }, [catalogApi]);

  return {
    entities,
    loading,
    error,
  };
}

