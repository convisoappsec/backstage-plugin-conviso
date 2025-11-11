import { act, renderHook } from '@testing-library/react';
import { BackstageEntity } from '../types/entity.types';
import { useProjectSelection } from './useProjectSelection';

describe('useProjectSelection', () => {
  const mockEntity1: BackstageEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'project-1',
      namespace: 'default',
    },
    spec: {},
  };

  const mockEntity2: BackstageEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'project-2',
      namespace: 'default',
    },
    spec: {},
  };

  const mockEntity3: BackstageEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'project-3',
      namespace: 'default',
    },
    spec: {},
  };

  describe('toggleProject', () => {
    it('should add project to selection', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2],
          importedAssets: new Set(),
        })
      );

      act(() => {
        result.current.toggleProject('Component:default/project-1');
      });

      expect(result.current.selectedProjects.has('Component:default/project-1')).toBe(true);
      expect(result.current.selectedProjects.size).toBe(1);
    });

    it('should remove project from selection', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2],
          importedAssets: new Set(),
        })
      );

      act(() => {
        result.current.toggleProject('Component:default/project-1');
      });

      act(() => {
        result.current.toggleProject('Component:default/project-1');
      });

      expect(result.current.selectedProjects.has('Component:default/project-1')).toBe(false);
      expect(result.current.selectedProjects.size).toBe(0);
    });
  });

  describe('selectAll', () => {
    it('should select all non-imported projects', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          importedAssets: new Set(),
        })
      );

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedProjects.size).toBe(3);
      expect(result.current.selectedProjects.has('Component:default/project-1')).toBe(true);
      expect(result.current.selectedProjects.has('Component:default/project-2')).toBe(true);
      expect(result.current.selectedProjects.has('Component:default/project-3')).toBe(true);
    });

    it('should deselect all when all are selected', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2],
          importedAssets: new Set(),
        })
      );

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.isAllSelected).toBe(true);

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedProjects.size).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });

    it('should exclude imported projects from selection', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          importedAssets: new Set(['project-2']),
        })
      );

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedProjects.size).toBe(2);
      expect(result.current.selectedProjects.has('Component:default/project-1')).toBe(true);
      expect(result.current.selectedProjects.has('Component:default/project-2')).toBe(false);
      expect(result.current.selectedProjects.has('Component:default/project-3')).toBe(true);
    });
  });

  describe('selectAllVisible', () => {
    it('should select all visible non-imported projects', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          importedAssets: new Set(),
          visibleEntities: [mockEntity1, mockEntity2],
        })
      );

      act(() => {
        result.current.selectAllVisible();
      });

      expect(result.current.selectedProjects.size).toBe(2);
      expect(result.current.selectedProjects.has('Component:default/project-1')).toBe(true);
      expect(result.current.selectedProjects.has('Component:default/project-2')).toBe(true);
      expect(result.current.selectedProjects.has('Component:default/project-3')).toBe(false);
    });

    it('should deselect visible projects when all visible are selected', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          importedAssets: new Set(),
          visibleEntities: [mockEntity1, mockEntity2],
        })
      );

      act(() => {
        result.current.selectAllVisible();
      });

      expect(result.current.isAllVisibleSelected).toBe(true);

      act(() => {
        result.current.selectAllVisible();
      });

      expect(result.current.selectedProjects.size).toBe(0);
      expect(result.current.isAllVisibleSelected).toBe(false);
    });

    it('should exclude imported projects from visible selection', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          importedAssets: new Set(['project-1']),
          visibleEntities: [mockEntity1, mockEntity2],
        })
      );

      act(() => {
        result.current.selectAllVisible();
      });

      expect(result.current.selectedProjects.size).toBe(1);
      expect(result.current.selectedProjects.has('Component:default/project-1')).toBe(false);
      expect(result.current.selectedProjects.has('Component:default/project-2')).toBe(true);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2],
          importedAssets: new Set(),
        })
      );

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedProjects.size).toBe(2);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedProjects.size).toBe(0);
    });
  });

  describe('isAllSelected', () => {
    it('should return true when all non-imported projects are selected', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2],
          importedAssets: new Set(),
        })
      );

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.isAllSelected).toBe(true);
    });

    it('should return false when not all projects are selected', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2],
          importedAssets: new Set(),
        })
      );

      act(() => {
        result.current.toggleProject('Component:default/project-1');
      });

      expect(result.current.isAllSelected).toBe(false);
    });

    it('should return false when no projects are selected', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2],
          importedAssets: new Set(),
        })
      );

      expect(result.current.isAllSelected).toBe(false);
    });
  });

  describe('isAllVisibleSelected', () => {
    it('should return true when all visible non-imported projects are selected', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          importedAssets: new Set(),
          visibleEntities: [mockEntity1, mockEntity2],
        })
      );

      act(() => {
        result.current.selectAllVisible();
      });

      expect(result.current.isAllVisibleSelected).toBe(true);
    });

    it('should return false when not all visible projects are selected', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2],
          importedAssets: new Set(),
          visibleEntities: [mockEntity1, mockEntity2],
        })
      );

      act(() => {
        result.current.toggleProject('Component:default/project-1');
      });

      expect(result.current.isAllVisibleSelected).toBe(false);
    });
  });

  describe('isSomeSelected', () => {
    it('should return true when some but not all projects are selected', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          importedAssets: new Set(),
        })
      );

      act(() => {
        result.current.toggleProject('Component:default/project-1');
      });

      expect(result.current.isSomeSelected).toBe(true);
    });

    it('should return false when all projects are selected', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2],
          importedAssets: new Set(),
        })
      );

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.isSomeSelected).toBe(false);
    });

    it('should return false when no projects are selected', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2],
          importedAssets: new Set(),
        })
      );

      expect(result.current.isSomeSelected).toBe(false);
    });
  });

  describe('isSomeVisibleSelected', () => {
    it('should return true when some but not all visible projects are selected', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2, mockEntity3],
          importedAssets: new Set(),
          visibleEntities: [mockEntity1, mockEntity2],
        })
      );

      act(() => {
        result.current.toggleProject('Component:default/project-1');
      });

      expect(result.current.isSomeVisibleSelected).toBe(true);
    });

    it('should return false when all visible projects are selected', () => {
      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [mockEntity1, mockEntity2],
          importedAssets: new Set(),
          visibleEntities: [mockEntity1, mockEntity2],
        })
      );

      act(() => {
        result.current.selectAllVisible();
      });

      expect(result.current.isSomeVisibleSelected).toBe(false);
    });
  });

  describe('normalized name handling', () => {
    it('should handle entities with different name casing', () => {
      const entityWithUpperCase: BackstageEntity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'PROJECT-1',
          namespace: 'default',
        },
        spec: {},
      };

      const { result } = renderHook(() =>
        useProjectSelection({
          entities: [entityWithUpperCase, mockEntity2],
          importedAssets: new Set(['project-1']),
        })
      );

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedProjects.size).toBe(1);
      expect(result.current.selectedProjects.has('Component:default/PROJECT-1')).toBe(false);
      expect(result.current.selectedProjects.has('Component:default/project-2')).toBe(true);
    });
  });
});

