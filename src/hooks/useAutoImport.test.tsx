import { useApi } from '@backstage/core-plugin-api';
import { act, renderHook, waitFor } from '@testing-library/react';
import { convisoPlatformApiRef } from '../api/convisoPlatformApi';
import { useAutoImport } from './useAutoImport';

jest.mock('@backstage/core-plugin-api');

describe('useAutoImport', () => {
  let mockApi: any;
  let mockGetIntegration: jest.Mock;
  let mockGetAutoImport: jest.Mock;
  let mockSetAutoImport: jest.Mock;

  beforeEach(() => {
    mockGetIntegration = jest.fn();
    mockGetAutoImport = jest.fn();
    mockSetAutoImport = jest.fn().mockResolvedValue(undefined);

    mockApi = {
      getIntegration: mockGetIntegration,
      getAutoImport: mockGetAutoImport,
      setAutoImport: mockSetAutoImport,
    };

    (useApi as jest.Mock).mockImplementation((ref: any) => {
      if (ref === convisoPlatformApiRef) {
        return mockApi;
      }
      return mockApi;
    });
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize from localStorage', () => {
    localStorage.setItem('conviso_auto_import_enabled', 'true');

    const { result } = renderHook(() => useAutoImport('instance-1', 123));

    expect(result.current.autoImportEnabled).toBe(true);
  });

  it('should default to false when localStorage is empty', () => {
    const { result } = renderHook(() => useAutoImport('instance-1', 123));

    expect(result.current.autoImportEnabled).toBe(false);
  });

  it('should load from integration API', async () => {
    mockGetIntegration.mockResolvedValue({
      integration: {
        autoImportEnabled: true,
      },
    });
    mockGetAutoImport.mockResolvedValue({ enabled: true });

    const { result } = renderHook(() => useAutoImport('instance-1', 123));

    await waitFor(() => {
      expect(mockGetIntegration).toHaveBeenCalledWith('instance-1');
    });

    await waitFor(() => {
      expect(result.current.autoImportEnabled).toBe(true);
    }, { timeout: 3000 });
  });

  it('should fallback to backend endpoint when integration API fails', async () => {
    mockGetIntegration.mockRejectedValue(new Error('Failed'));
    mockGetAutoImport.mockResolvedValue({ enabled: true });

    const { result } = renderHook(() => useAutoImport('instance-1', 123));

    await waitFor(() => {
      expect(mockGetAutoImport).toHaveBeenCalledWith('instance-1');
    });

    await waitFor(() => {
      expect(result.current.autoImportEnabled).toBe(true);
    });
  });

  it('should update localStorage when autoImportEnabled changes', async () => {
    const { result } = renderHook(() => useAutoImport('instance-1', 123));

    act(() => {
      result.current.setAutoImportEnabled(true);
    });

    await waitFor(() => {
      expect(localStorage.getItem('conviso_auto_import_enabled')).toBe('true');
    });
  });

  it('should call setAutoImport API when enabled changes', async () => {
    const { result } = renderHook(() => useAutoImport('instance-1', 123));

    act(() => {
      result.current.setAutoImportEnabled(true);
    });

    await waitFor(() => {
      expect(mockSetAutoImport).toHaveBeenCalledWith('instance-1', true, 123);
    });
  });

  it('should pass companyId when provided', async () => {
    const { result } = renderHook(() => useAutoImport('instance-1', 456));

    act(() => {
      result.current.setAutoImportEnabled(true);
    });

    await waitFor(() => {
      expect(mockSetAutoImport).toHaveBeenCalledWith('instance-1', true, 456);
    });
  });
});

