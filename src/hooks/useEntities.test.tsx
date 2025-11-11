import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { BackstageEntity } from '../types/entity.types';
import { useEntities } from './useEntities';

jest.mock('@backstage/core-plugin-api');

describe('useEntities', () => {
  let mockCatalogApi: any;
  let mockGetEntities: jest.Mock;

  const mockEntity1: BackstageEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'project-1',
      namespace: 'default',
      description: 'First project',
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'team-a',
    },
  };

  const mockEntity2: BackstageEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'project-2',
      namespace: 'default',
      description: 'Second project',
    },
    spec: {
      type: 'library',
      lifecycle: 'development',
      owner: 'team-b',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEntities = jest.fn();
    mockCatalogApi = {
      getEntities: mockGetEntities,
    };

    (useApi as jest.Mock).mockImplementation((ref: any) => {
      if (ref === catalogApiRef) {
        return mockCatalogApi;
      }
      return mockCatalogApi;
    });
  });

  it('should fetch entities on mount', async () => {
    mockGetEntities.mockResolvedValue({
      items: [mockEntity1, mockEntity2],
    });

    const { result } = renderHook(() => useEntities());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.entities).toHaveLength(2);
    expect(result.current.entities[0].metadata.name).toBe('project-1');
    expect(result.current.entities[1].metadata.name).toBe('project-2');
    expect(result.current.error).toBeUndefined();
    expect(mockGetEntities).toHaveBeenCalledWith({
      filter: { kind: 'Component' },
      fields: expect.arrayContaining([
        'metadata.name',
        'metadata.namespace',
        'metadata.description',
        'spec.type',
        'spec.lifecycle',
        'spec.owner',
      ]),
    });
  });

  it('should filter out invalid entities', async () => {
    const invalidEntity1 = {
      kind: 'Component',
      metadata: {},
    };

    const invalidEntity2 = {
      kind: 'Component',
      metadata: {
        name: '',
      },
    };

    const invalidEntity3 = {
      kind: 'API',
      metadata: {
        name: 'api-1',
      },
    };

    mockGetEntities.mockResolvedValue({
      items: [mockEntity1, invalidEntity1, invalidEntity2, invalidEntity3, mockEntity2],
    });

    const { result } = renderHook(() => useEntities());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.entities).toHaveLength(2);
    expect(result.current.entities[0].metadata.name).toBe('project-1');
    expect(result.current.entities[1].metadata.name).toBe('project-2');
  });

  it('should show error when no components are found', async () => {
    mockGetEntities.mockResolvedValue({
      items: [],
    });

    const { result } = renderHook(() => useEntities());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.entities).toHaveLength(0);
    expect(result.current.error).toContain('No components found in the catalog');
  });

  it('should handle network errors', async () => {
    mockGetEntities.mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useEntities());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Network error');
    expect(result.current.error).toContain('Backstage backend is running');
    expect(result.current.entities).toHaveLength(0);
  });

  it('should handle unauthorized errors', async () => {
    mockGetEntities.mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useEntities());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Authentication error');
    expect(result.current.error).toContain('refresh the page');
  });

  it('should handle forbidden errors', async () => {
    mockGetEntities.mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useEntities());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Access denied');
    expect(result.current.error).toContain('check your permissions');
  });

  it('should handle generic errors', async () => {
    mockGetEntities.mockRejectedValue(new Error('Generic error message'));

    const { result } = renderHook(() => useEntities());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to load entities');
    expect(result.current.error).toContain('Generic error message');
  });

  it('should handle string errors', async () => {
    mockGetEntities.mockRejectedValue('String error');

    const { result } = renderHook(() => useEntities());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to load entities');
    expect(result.current.error).toContain('String error');
  });

  it('should handle unknown errors', async () => {
    mockGetEntities.mockRejectedValue({ message: 'Unknown error' });

    const { result } = renderHook(() => useEntities());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to load entities');
  });

  it('should cancel fetch on unmount', async () => {
    let resolveEntities: (value: any) => void;
    const entitiesPromise = new Promise(resolve => {
      resolveEntities = resolve;
    });

    mockGetEntities.mockReturnValue(entitiesPromise);

    const { result, unmount } = renderHook(() => useEntities());

    expect(result.current.loading).toBe(true);

    unmount();

    await act(async () => {
      resolveEntities!({ items: [mockEntity1] });
      await entitiesPromise;
    });

    expect(result.current.loading).toBe(true);
  });

  it('should handle entities with missing optional fields', async () => {
    const entityWithMinimalFields: BackstageEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'minimal-project',
        namespace: 'default',
      },
      spec: {},
    };

    mockGetEntities.mockResolvedValue({
      items: [entityWithMinimalFields],
    });

    const { result } = renderHook(() => useEntities());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.entities).toHaveLength(1);
    expect(result.current.entities[0].metadata.name).toBe('minimal-project');
  });
});

