import { useApi } from '@backstage/core-plugin-api';
import { act, renderHook, waitFor } from '@testing-library/react';
import { convisoPlatformApiRef } from '../api/convisoPlatformApi';
import { BackstageEntity } from '../types/entity.types';
import { useProjectImport } from './useProjectImport';

jest.mock('@backstage/core-plugin-api');

describe('useProjectImport', () => {
  let mockApi: any;
  let mockImportProjects: jest.Mock;
  let mockOnImportSuccess: jest.Mock;
  let mockOnSelectionCleared: jest.Mock;
  let mockOnImportedNamesAdded: jest.Mock;

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
    mockImportProjects = jest.fn();
    mockOnImportSuccess = jest.fn();
    mockOnSelectionCleared = jest.fn();
    mockOnImportedNamesAdded = jest.fn();

    mockApi = {
      importBackstageProjectsToAssets: mockImportProjects,
    };

    (useApi as jest.Mock).mockImplementation((ref: any) => {
      if (ref === convisoPlatformApiRef) {
        return mockApi;
      }
      return mockApi;
    });
  });

  describe('handleImport', () => {
    it('should show error when no projects are selected', async () => {
      const { result } = renderHook(() =>
        useProjectImport({
          entities: [mockEntity1, mockEntity2],
          selectedProjects: new Set(),
          importedAssets: new Set(),
          companyId: 123,
        })
      );

      await act(async () => {
        await result.current.handleImport();
      });

      expect(result.current.errorMessage).toBe('Please select at least one project to import');
      expect(result.current.importing).toBe(false);
      expect(mockImportProjects).not.toHaveBeenCalled();
    });

    it('should show error when companyId is null', async () => {
      const { result } = renderHook(() =>
        useProjectImport({
          entities: [mockEntity1],
          selectedProjects: new Set(['Component:default/project-1']),
          importedAssets: new Set(),
          companyId: null,
        })
      );

      await act(async () => {
        await result.current.handleImport();
      });

      expect(result.current.errorMessage).toBe('Company ID not found. Please configure the integration first.');
      expect(result.current.importing).toBe(false);
      expect(mockImportProjects).not.toHaveBeenCalled();
    });

    it('should show error when all selected projects are already imported', async () => {
      const { result } = renderHook(() =>
        useProjectImport({
          entities: [mockEntity1],
          selectedProjects: new Set(['Component:default/project-1']),
          importedAssets: new Set(['project-1']),
          companyId: 123,
        })
      );

      await act(async () => {
        await result.current.handleImport();
      });

      expect(result.current.errorMessage).toBe('All selected projects have already been imported');
      expect(result.current.importing).toBe(false);
      expect(mockImportProjects).not.toHaveBeenCalled();
    });

    it('should import projects successfully', async () => {
      mockImportProjects.mockResolvedValue({
        success: true,
        importedCount: 1,
        errors: [],
      });

      const { result } = renderHook(() =>
        useProjectImport({
          entities: [mockEntity1],
          selectedProjects: new Set(['Component:default/project-1']),
          importedAssets: new Set(),
          companyId: 123,
        })
      );

      await act(async () => {
        await result.current.handleImport();
      });

      await waitFor(() => {
        expect(result.current.importing).toBe(false);
      });

      expect(result.current.successMessage).toContain('Import job started successfully');
      expect(result.current.errorMessage).toBeUndefined();
      expect(mockImportProjects).toHaveBeenCalledWith({
        companyId: 123,
        projects: expect.arrayContaining([
          expect.objectContaining({
            id: 'Component:default/project-1',
            name: 'project-1',
          }),
        ]),
      });
    });

    it('should call onImportSuccess callback on success', async () => {
      mockImportProjects.mockResolvedValue({
        success: true,
        importedCount: 1,
        errors: [],
      });

      const { result } = renderHook(() =>
        useProjectImport({
          entities: [mockEntity1],
          selectedProjects: new Set(['Component:default/project-1']),
          importedAssets: new Set(),
          companyId: 123,
          onImportSuccess: mockOnImportSuccess,
        })
      );

      await act(async () => {
        await result.current.handleImport();
      });

      await waitFor(() => {
        expect(result.current.importing).toBe(false);
      });

      expect(mockOnImportSuccess).toHaveBeenCalled();
    });

    it('should call onSelectionCleared callback on success', async () => {
      mockImportProjects.mockResolvedValue({
        success: true,
        importedCount: 1,
        errors: [],
      });

      const { result } = renderHook(() =>
        useProjectImport({
          entities: [mockEntity1],
          selectedProjects: new Set(['Component:default/project-1']),
          importedAssets: new Set(),
          companyId: 123,
          onSelectionCleared: mockOnSelectionCleared,
        })
      );

      await act(async () => {
        await result.current.handleImport();
      });

      await waitFor(() => {
        expect(result.current.importing).toBe(false);
      });

      expect(mockOnSelectionCleared).toHaveBeenCalled();
    });

    it('should call onImportedNamesAdded callback with imported names', async () => {
      mockImportProjects.mockResolvedValue({
        success: true,
        importedCount: 1,
        errors: [],
      });

      const { result } = renderHook(() =>
        useProjectImport({
          entities: [mockEntity1],
          selectedProjects: new Set(['Component:default/project-1']),
          importedAssets: new Set(),
          companyId: 123,
          onImportedNamesAdded: mockOnImportedNamesAdded,
        })
      );

      await act(async () => {
        await result.current.handleImport();
      });

      await waitFor(() => {
        expect(result.current.importing).toBe(false);
      });

      expect(mockOnImportedNamesAdded).toHaveBeenCalledWith(['project-1']);
    });

    it('should handle import failure', async () => {
      mockImportProjects.mockResolvedValue({
        success: false,
        importedCount: 0,
        errors: ['Error 1', 'Error 2'],
      });

      const { result } = renderHook(() =>
        useProjectImport({
          entities: [mockEntity1],
          selectedProjects: new Set(['Component:default/project-1']),
          importedAssets: new Set(),
          companyId: 123,
        })
      );

      await act(async () => {
        await result.current.handleImport();
      });

      await waitFor(() => {
        expect(result.current.importing).toBe(false);
      });

      expect(result.current.errorMessage).toContain('Failed to start import job');
      expect(result.current.errorMessage).toContain('Error 1');
      expect(result.current.successMessage).toBeUndefined();
    });

    it('should handle API errors', async () => {
      mockImportProjects.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useProjectImport({
          entities: [mockEntity1],
          selectedProjects: new Set(['Component:default/project-1']),
          importedAssets: new Set(),
          companyId: 123,
        })
      );

      await act(async () => {
        await result.current.handleImport();
      });

      await waitFor(() => {
        expect(result.current.importing).toBe(false);
      });

      expect(result.current.errorMessage).toBe('Network error');
      expect(result.current.successMessage).toBeUndefined();
    });

    it('should filter out already imported projects', async () => {
      mockImportProjects.mockResolvedValue({
        success: true,
        importedCount: 1,
        errors: [],
      });

      const { result } = renderHook(() =>
        useProjectImport({
          entities: [mockEntity1, mockEntity2],
          selectedProjects: new Set(['Component:default/project-1', 'Component:default/project-2']),
          importedAssets: new Set(['project-1']),
          companyId: 123,
        })
      );

      await act(async () => {
        await result.current.handleImport();
      });

      await waitFor(() => {
        expect(result.current.importing).toBe(false);
      });

      expect(mockImportProjects).toHaveBeenCalledWith({
        companyId: 123,
        projects: expect.arrayContaining([
          expect.objectContaining({
            name: 'project-2',
          }),
        ]),
      });

      expect(mockImportProjects.mock.calls[0][0].projects).not.toContainEqual(
        expect.objectContaining({ name: 'project-1' })
      );
    });

    it('should set importing state during import', async () => {
      let resolveImport: (value: any) => void;
      const importPromise = new Promise(resolve => {
        resolveImport = resolve;
      });

      mockImportProjects.mockReturnValue(importPromise);

      const { result } = renderHook(() =>
        useProjectImport({
          entities: [mockEntity1],
          selectedProjects: new Set(['Component:default/project-1']),
          importedAssets: new Set(),
          companyId: 123,
        })
      );

      act(() => {
        result.current.handleImport();
      });

      expect(result.current.importing).toBe(true);

      await act(async () => {
        resolveImport!({
          success: true,
          importedCount: 1,
          errors: [],
        });
        await importPromise;
      });

      await waitFor(() => {
        expect(result.current.importing).toBe(false);
      });
    });
  });

  describe('clearMessages', () => {
    it('should clear error and success messages', async () => {
      mockImportProjects.mockResolvedValue({
        success: true,
        importedCount: 1,
        errors: [],
      });

      const { result } = renderHook(() =>
        useProjectImport({
          entities: [mockEntity1],
          selectedProjects: new Set(['Component:default/project-1']),
          importedAssets: new Set(),
          companyId: 123,
        })
      );

      await act(async () => {
        await result.current.handleImport();
      });

      await waitFor(() => {
        expect(result.current.successMessage).toBeDefined();
      });

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.errorMessage).toBeUndefined();
      expect(result.current.successMessage).toBeUndefined();
    });
  });
});

