import { renderInTestApp } from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutoImportToggle } from '../AutoImportToggle';

describe('AutoImportToggle', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render with toggle off', async () => {
    await renderInTestApp(
      <AutoImportToggle enabled={false} onChange={mockOnChange} />
    );

    expect(screen.getByText('Automatic Import')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('should render with toggle on', async () => {
    await renderInTestApp(
      <AutoImportToggle enabled onChange={mockOnChange} />
    );

    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(
      screen.getByText(/Manual import is disabled/)
    ).toBeInTheDocument();
  });

  it('should call onChange when toggle is clicked', async () => {
    const user = userEvent.setup();
    
    await renderInTestApp(
      <AutoImportToggle enabled={false} onChange={mockOnChange} />
    );

    const switchElement = screen.getByRole('checkbox');
    await user.click(switchElement);

    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it('should display description text', async () => {
    await renderInTestApp(
      <AutoImportToggle enabled={false} onChange={mockOnChange} />
    );

    expect(
      screen.getByText(/When enabled, new components created in Backstage/)
    ).toBeInTheDocument();
  });
});

