import { fireEvent, render, screen } from '@testing-library/react';
import { BackstageEntity } from '../../types/entity.types';
import { ProjectTable } from './ProjectTable';

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

const mockEntity3: BackstageEntity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'project-3',
    description: 'Third project',
  },
  spec: {
    type: 'service',
    lifecycle: 'production',
    owner: 'team-c',
  },
};

describe('ProjectTable', () => {
  const defaultProps = {
    entities: [mockEntity1, mockEntity2, mockEntity3],
    selectedProjects: new Set<string>(),
    importedAssets: new Set<string>(),
    autoImportEnabled: false,
    onToggleProject: jest.fn(),
    onSelectAll: jest.fn(),
    page: 0,
    rowsPerPage: 10,
    totalCount: 3,
    onPageChange: jest.fn(),
    onRowsPerPageChange: jest.fn(),
    isAllVisibleSelected: false,
    isSomeVisibleSelected: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render table with entities', () => {
    render(<ProjectTable {...defaultProps} />);

    expect(screen.getByText('project-1')).toBeInTheDocument();
    expect(screen.getByText('project-2')).toBeInTheDocument();
    expect(screen.getByText('project-3')).toBeInTheDocument();
  });

  it('should render table headers', () => {
    render(<ProjectTable {...defaultProps} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Lifecycle')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('should display entity details correctly', () => {
    render(<ProjectTable {...defaultProps} />);

    expect(screen.getByText('First project')).toBeInTheDocument();
    expect(screen.getByText('team-a')).toBeInTheDocument();
    expect(screen.getAllByText('production').length).toBeGreaterThan(0);
    expect(screen.getAllByText('service').length).toBeGreaterThan(0);
  });

  it('should show "Not Imported" status for non-imported entities', () => {
    render(<ProjectTable {...defaultProps} />);

    const notImportedChips = screen.getAllByText('Not Imported');
    expect(notImportedChips.length).toBeGreaterThan(0);
  });

  it('should show "Imported" status for imported entities', () => {
    const importedAssets = new Set(['project-1']);
    render(<ProjectTable {...defaultProps} importedAssets={importedAssets} />);

    expect(screen.getByText('Imported')).toBeInTheDocument();
    expect(screen.getAllByText('Not Imported').length).toBe(2);
  });

  it('should call onToggleProject when checkbox is clicked', () => {
    const onToggleProject = jest.fn();
    render(<ProjectTable {...defaultProps} onToggleProject={onToggleProject} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const entityCheckbox = checkboxes[1];
    
    fireEvent.click(entityCheckbox);
    expect(onToggleProject).toHaveBeenCalledWith('Component:default/project-1');
  });

  it('should not call onToggleProject for imported entities', () => {
    const onToggleProject = jest.fn();
    const importedAssets = new Set(['project-1']);
    render(
      <ProjectTable
        {...defaultProps}
        importedAssets={importedAssets}
        onToggleProject={onToggleProject}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const importedEntityCheckbox = checkboxes[1];
    
    fireEvent.click(importedEntityCheckbox);
    expect(onToggleProject).not.toHaveBeenCalled();
  });

  it('should disable checkboxes when autoImportEnabled is true', () => {
    render(<ProjectTable {...defaultProps} autoImportEnabled />);

    const checkboxes = screen.getAllByRole('checkbox');
    const entityCheckboxes = checkboxes.slice(1);
    
    entityCheckboxes.forEach(checkbox => {
      expect(checkbox).toBeDisabled();
    });
  });

  it('should call onSelectAll when "select all" checkbox is clicked', () => {
    const onSelectAll = jest.fn();
    render(<ProjectTable {...defaultProps} onSelectAll={onSelectAll} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheckbox = checkboxes[0];
    
    fireEvent.click(selectAllCheckbox);
    expect(onSelectAll).toHaveBeenCalled();
  });

  it('should show selected state for selected projects', () => {
    const selectedProjects = new Set(['Component:default/project-1']);
    render(<ProjectTable {...defaultProps} selectedProjects={selectedProjects} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const selectedCheckbox = checkboxes[1];
    
    expect(selectedCheckbox).toBeChecked();
  });

  it('should handle pagination correctly', () => {
    const onPageChange = jest.fn();
    const onRowsPerPageChange = jest.fn();
    
    render(
      <ProjectTable
        {...defaultProps}
        page={0}
        rowsPerPage={10}
        totalCount={3}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    );

    expect(screen.getByText('Rows per page:')).toBeInTheDocument();
    
    const rowsPerPageSelect = screen.getByLabelText('Rows per page:');
    fireEvent.mouseDown(rowsPerPageSelect);
    
    const option25 = screen.getByText('25');
    fireEvent.click(option25);
    
    expect(onRowsPerPageChange).toHaveBeenCalled();
  });

  it('should handle sorting when onSort is provided', () => {
    const onSort = jest.fn();
    render(
      <ProjectTable
        {...defaultProps}
        onSort={onSort}
        sortColumn="name"
        sortDirection="asc"
      />
    );

    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toBeInTheDocument();
    fireEvent.click(nameHeader!);
    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('should not show sorting when onSort is not provided', () => {
    render(<ProjectTable {...defaultProps} onSort={undefined} />);

    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toBeInTheDocument();
  });

  it('should display "-" for missing optional fields', () => {
    const entityWithoutOptionalFields: BackstageEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'project-no-fields',
      },
      spec: {},
    };

    render(
      <ProjectTable
        {...defaultProps}
        entities={[entityWithoutOptionalFields]}
      />
    );

    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('should show indeterminate state for "select all" checkbox when some are selected', () => {
    render(
      <ProjectTable
        {...defaultProps}
        isSomeVisibleSelected
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheckbox = checkboxes[0];
    
    expect(selectAllCheckbox).toBeInTheDocument();
    expect(selectAllCheckbox).not.toBeChecked();
    
    const inputElement = selectAllCheckbox.querySelector('input[type="checkbox"]');
    expect(inputElement).toBeInTheDocument();
    expect((inputElement as HTMLInputElement).indeterminate).toBe(true);
  });

  it('should show checked state for "select all" checkbox when all are selected', () => {
    render(
      <ProjectTable
        {...defaultProps}
        isAllVisibleSelected
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheckbox = checkboxes[0];
    
    expect(selectAllCheckbox).toBeChecked();
  });
});

