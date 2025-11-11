import { renderHook } from '@testing-library/react';
import { BackstageEntity } from '../types/entity.types';
import { useEntityFilter } from './useEntityFilter';

describe('useEntityFilter', () => {
  const mockEntity1: BackstageEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'project-alpha',
      description: 'Alpha project description',
    },
    spec: {
      owner: 'team-alpha',
      type: 'service',
      lifecycle: 'production',
    },
  };

  const mockEntity2: BackstageEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'project-beta',
      description: 'Beta project description',
    },
    spec: {
      owner: 'team-beta',
      type: 'library',
      lifecycle: 'development',
    },
  };

  const mockEntity3: BackstageEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'project-gamma',
      description: 'Gamma project description',
    },
    spec: {
      owner: 'team-gamma',
    },
  };

  describe('filtering by name', () => {
    it('should filter entities by name', () => {
      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          searchQuery: 'alpha',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(1);
      expect(result.current.filteredEntities[0].metadata.name).toBe('project-alpha');
    });

    it('should be case insensitive', () => {
      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          searchQuery: 'ALPHA',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(1);
      expect(result.current.filteredEntities[0].metadata.name).toBe('project-alpha');
    });
  });

  describe('filtering by description', () => {
    it('should filter entities by description', () => {
      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          searchQuery: 'Beta project',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(1);
      expect(result.current.filteredEntities[0].metadata.name).toBe('project-beta');
    });

    it('should be case insensitive for description', () => {
      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          searchQuery: 'GAMMA',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(1);
      expect(result.current.filteredEntities[0].metadata.name).toBe('project-gamma');
    });
  });

  describe('filtering by owner', () => {
    it('should filter entities by owner', () => {
      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          searchQuery: 'team-beta',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(1);
      expect(result.current.filteredEntities[0].metadata.name).toBe('project-beta');
    });

    it('should be case insensitive for owner', () => {
      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          searchQuery: 'TEAM-GAMMA',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(1);
      expect(result.current.filteredEntities[0].metadata.name).toBe('project-gamma');
    });
  });

  describe('multiple matches', () => {
    it('should return all entities matching any field', () => {
      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          searchQuery: 'project',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(3);
    });

    it('should return entities matching name or description or owner', () => {
      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          searchQuery: 'alpha',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(1);
    });
  });

  describe('empty search query', () => {
    it('should return all entities when search query is empty', () => {
      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          searchQuery: '',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(3);
    });

    it('should return all entities when search query is only whitespace', () => {
      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          searchQuery: '   ',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(3);
    });
  });

  describe('no matches', () => {
    it('should return empty array when no entities match', () => {
      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          searchQuery: 'xyz',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle entities with missing optional fields', () => {
      const entityWithoutDescription: BackstageEntity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'project-delta',
        },
        spec: {
          owner: 'team-delta',
        },
      };

      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [entityWithoutDescription],
          searchQuery: 'delta',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(1);
    });

    it('should handle entities with missing owner', () => {
      const entityWithoutOwner: BackstageEntity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'project-epsilon',
          description: 'Epsilon project',
        },
        spec: {},
      };

      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [entityWithoutOwner],
          searchQuery: 'epsilon',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(1);
    });

    it('should handle empty entities array', () => {
      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [],
          searchQuery: 'test',
        })
      );

      expect(result.current.filteredEntities).toEqual([]);
    });

    it('should handle partial matches', () => {
      const { result } = renderHook(() =>
        useEntityFilter({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          searchQuery: 'proj',
        })
      );

      expect(result.current.filteredEntities).toHaveLength(3);
    });
  });
});

