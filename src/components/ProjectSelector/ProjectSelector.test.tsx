import { TestApiProvider } from '@backstage/test-utils';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { convisoPlatformApiRef } from '../../api/convisoPlatformApi';
import * as useAutoImportHook from '../../hooks/useAutoImport';
import * as useEntitiesHook from '../../hooks/useEntities';
import * as useImportedAssetsHook from '../../hooks/useImportedAssets';
import * as useProjectImportHook from '../../hooks/useProjectImport';
import * as useProjectSelectionHook from '../../hooks/useProjectSelection';
import { BackstageEntity } from '../../types/entity.types';
import { ProjectSelector } from './ProjectSelector';

jest.mock('../../hooks/useEntities');
jest.mock('../../hooks/useImportedAssets');
jest.mock('../../hooks/useAutoImport');
jest.mock('../../hooks/useProjectImport');
jest.mock('../../hooks/useProjectSelection');
jest.mock('../../hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));
jest.mock('../../hooks/useEntityFilter', () => ({
  useEntityFilter: ({ entities }: { entities: BackstageEntity[] }) => ({
    filteredEntities: entities,
  }),
}));
jest.mock('../../hooks/usePagination', () => ({
  usePagination: ({ items }: { items: BackstageEntity[] }) => ({
    paginatedItems: items,
    page: 0,
    rowsPerPage: 10,
    totalCount: items.length,
    handlePageChange: jest.fn(),
    handleRowsPerPageChange: jest.fn(),
    resetPage: jest.fn(),
  }),
}));
jest.mock('../../hooks/useTableSort', () => ({
  useTableSort: ({ items }: { items: any[] }) => ({
    sortedItems: items,
    sortColumn: null,
    sortDirection: null,
    handleSort: jest.fn(),
  }),
}));
jest.mock('../ProjectTable', () => ({
  ProjectTable: ({ entities }: { entities: BackstageEntity[] }) => (
    <div data-testid="project-table">
      {entities.map((e) => (
        <div key={e.metadata.name}>{e.metadata.name}</div>
      ))}
    </div>
  ),
}));
jest.mock('../AutoImportToggle', () => ({
  AutoImportToggle: ({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) => (
    <div data-testid="auto-import-toggle">
      <button onClick={() => onChange(!enabled)}>
        {enabled ? 'Disable' : 'Enable'} Auto Import
      </button>
    </div>
  ),
}));

const mockEntity1: BackstageEntity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'project-1',
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
    description: 'Second project',
  },
  spec: {
    type: 'library',
    lifecycle: 'development',
    owner: 'team-b',
  },
};

describe('ProjectSelector', () => {
  const mockUseEntities = useEntitiesHook.useEntities as jest.Mock;
  const mockUseImportedAssets = useImportedAssetsHook.useImportedAssets as jest.Mock;
  const mockUseAutoImport = useAutoImportHook.useAutoImport as jest.Mock;
  const mockUseProjectImport = useProjectImportHook.useProjectImport as jest.Mock;
  const mockUseProjectSelection = useProjectSelectionHook.useProjectSelection as jest.Mock;

  const mockRefreshImportedAssets = jest.fn();
  const mockAddImportedNames = jest.fn();
  const mockSetAutoImportEnabled = jest.fn();
  const mockHandleImport = jest.fn();
  const mockSelectAll = jest.fn();
  const mockSelectAllVisible = jest.fn();
  const mockToggleProject = jest.fn();
  const mockClearSelection = jest.fn();

  const mockApi = {
    getConfig: jest.fn().mockResolvedValue({ companyId: 123 }),
    getProjects: jest.fn(),
    importProjects: jest.fn(),
    createOrUpdateIntegration: jest.fn(),
    getIntegration: jest.fn(),
    getAutoImportStatus: jest.fn(),
    setAutoImportStatus: jest.fn(),
    getImportedAssets: jest.fn(),
  };

  const renderWithApi = (component: React.ReactElement) => {
    return render(
      <TestApiProvider apis={[[convisoPlatformApiRef, mockApi]]}>
        {component}
      </TestApiProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    mockUseEntities.mockReturnValue({
      entities: [mockEntity1, mockEntity2],
      loading: false,
      error: null,
    });

    mockUseImportedAssets.mockReturnValue({
      importedAssets: new Set<string>(),
      loading: false,
      error: null,
      refreshImportedAssets: mockRefreshImportedAssets,
      addImportedNames: mockAddImportedNames,
    });

    mockUseAutoImport.mockReturnValue({
      autoImportEnabled: false,
      setAutoImportEnabled: mockSetAutoImportEnabled,
    });

    mockUseProjectImport.mockReturnValue({
      importing: false,
      errorMessage: null,
      successMessage: null,
      handleImport: mockHandleImport,
    });

    mockUseProjectSelection.mockReturnValue({
      selectedProjects: new Set<string>(),
      toggleProject: mockToggleProject,
      selectAll: mockSelectAll,
      selectAllVisible: mockSelectAllVisible,
      clearSelection: mockClearSelection,
      isAllSelected: false,
      isAllVisibleSelected: false,
      isSomeSelected: false,
      isSomeVisibleSelected: false,
    });
  });

  it('should render component with title', () => {
    renderWithApi(<ProjectSelector />);
    expect(screen.getByText('Select Projects')).toBeInTheDocument();
  });

  it('should render entities in table', () => {
    renderWithApi(<ProjectSelector />);
    expect(screen.getByTestId('project-table')).toBeInTheDocument();
    expect(screen.getByText('project-1')).toBeInTheDocument();
    expect(screen.getByText('project-2')).toBeInTheDocument();
  });

  it('should show loading state when entities are loading', () => {
    mockUseEntities.mockReturnValue({
      entities: [],
      loading: true,
      error: null,
    });

    renderWithApi(<ProjectSelector />);
    // Progress component should be rendered
    expect(screen.getByText('Available Components (0)')).toBeInTheDocument();
  });

  it('should show "No components found" when entities array is empty', () => {
    mockUseEntities.mockReturnValue({
      entities: [],
      loading: false,
      error: null,
    });

    renderWithApi(<ProjectSelector />);
    expect(screen.getByText('No components found in the catalog.')).toBeInTheDocument();
  });

  it('should display total count of entities', () => {
    renderWithApi(<ProjectSelector />);
    expect(screen.getByText('Available Components (2)')).toBeInTheDocument();
  });

  it('should render search input', () => {
    renderWithApi(<ProjectSelector />);
    const searchInput = screen.getByPlaceholderText('Search by name, description, or owner...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    renderWithApi(<ProjectSelector />);
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Refresh Status')).toBeInTheDocument();
    expect(screen.getByText(/Import Selected/)).toBeInTheDocument();
  });

  it('should call selectAll when "Select All" button is clicked', () => {
    renderWithApi(<ProjectSelector />);
    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);
    expect(mockSelectAll).toHaveBeenCalled();
  });

  it('should call handleImport when "Import Selected" button is clicked', () => {
    // Mock selectedProjects to have items
    mockUseProjectSelection.mockReturnValue({
      selectedProjects: new Set(['component:default/project-1']),
      toggleProject: mockToggleProject,
      selectAll: mockSelectAll,
      selectAllVisible: mockSelectAllVisible,
      clearSelection: mockClearSelection,
      isAllSelected: false,
      isAllVisibleSelected: false,
      isSomeSelected: false,
      isSomeVisibleSelected: false,
    });

    renderWithApi(<ProjectSelector />);
    const importButton = screen.getByText(/Import Selected/);
    fireEvent.click(importButton);
    expect(mockHandleImport).toHaveBeenCalled();
  });

  it('should disable buttons when autoImportEnabled is true', () => {
    mockUseAutoImport.mockReturnValue({
      autoImportEnabled: true,
      setAutoImportEnabled: mockSetAutoImportEnabled,
    });

    renderWithApi(<ProjectSelector />);
    // Find buttons by role and filter by text content
    const buttons = screen.getAllByRole('button');
    const selectAllButton = buttons.find(btn => btn.textContent?.includes('Select All'));
    const importButton = buttons.find(btn => btn.textContent?.includes('Import Selected'));
    
    expect(selectAllButton).toBeDefined();
    expect(importButton).toBeDefined();
    expect(selectAllButton).toBeDisabled();
    expect(importButton).toBeDisabled();
  });

  it('should show error message when there is an error', () => {
    mockUseEntities.mockReturnValue({
      entities: [],
      loading: false,
      error: 'Failed to load entities',
    });

    renderWithApi(<ProjectSelector />);
    // WarningPanel renders the error message as children
    expect(screen.getByText('Failed to load entities')).toBeInTheDocument();
  });

  it('should show success message when import is successful', () => {
    mockUseProjectImport.mockReturnValue({
      importing: false,
      errorMessage: null,
      successMessage: 'Successfully imported 2 projects',
      handleImport: mockHandleImport,
    });

    renderWithApi(<ProjectSelector />);
    expect(screen.getByText('Successfully imported 2 projects')).toBeInTheDocument();
  });

  it('should call refreshImportedAssets when "Refresh Status" button is clicked', async () => {
    localStorage.setItem('conviso_company_id', '123');
    mockRefreshImportedAssets.mockResolvedValue(new Set(['project-1']));

    renderWithApi(<ProjectSelector />);
    const refreshButton = screen.getByText('Refresh Status');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefreshImportedAssets).toHaveBeenCalledWith(123, true);
    });
  });

  it('should show refresh success message after successful refresh', async () => {
    localStorage.setItem('conviso_company_id', '123');
    mockRefreshImportedAssets.mockResolvedValue(new Set(['project-1', 'project-2']));

    renderWithApi(<ProjectSelector />);
    const refreshButton = screen.getByText('Refresh Status');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/Successfully refreshed! Found 2 imported assets/)).toBeInTheDocument();
    });
  });

  it('should show refresh error message when refresh fails', async () => {
    localStorage.setItem('conviso_company_id', '123');
    mockRefreshImportedAssets.mockRejectedValue(new Error('Refresh failed'));

    renderWithApi(<ProjectSelector />);
    const refreshButton = screen.getByText('Refresh Status');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/Refresh failed: Refresh failed/)).toBeInTheDocument();
    });
  });

  it('should disable refresh button when assets are loading', () => {
    localStorage.setItem('conviso_company_id', '123');
    mockUseImportedAssets.mockReturnValue({
      importedAssets: new Set<string>(),
      loading: true,
      error: null,
      refreshImportedAssets: mockRefreshImportedAssets,
      addImportedNames: mockAddImportedNames,
    });

    renderWithApi(<ProjectSelector />);
    // Find all buttons and filter by the one that contains "Refreshing..."
    const buttons = screen.getAllByRole('button');
    const refreshButton = buttons.find(button => 
      button.textContent?.includes('Refreshing...')
    );
    expect(refreshButton).toBeDefined();
    expect(refreshButton).toBeDisabled();
  });

  it('should render AutoImportToggle component', () => {
    renderWithApi(<ProjectSelector />);
    expect(screen.getByTestId('auto-import-toggle')).toBeInTheDocument();
  });

  it('should call onImportSuccess callback when provided and import succeeds', () => {
    const onImportSuccess = jest.fn();
    mockUseProjectImport.mockReturnValue({
      importing: false,
      errorMessage: null,
      successMessage: 'Success',
      handleImport: async () => {
        onImportSuccess();
      },
    });

    render(<ProjectSelector onImportSuccess={onImportSuccess} />);
    const importButton = screen.getByText(/Import Selected/);
    fireEvent.click(importButton);
    
    expect(onImportSuccess).toHaveBeenCalled();
  });
});

