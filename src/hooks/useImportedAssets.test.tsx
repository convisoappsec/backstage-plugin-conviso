import { useApi } from '@backstage/core-plugin-api';
import { act, renderHook, waitFor } from '@testing-library/react';
import { convisoPlatformApiRef } from '../api/convisoPlatformApi';
import { useImportedAssets } from './useImportedAssets';

jest.mock('@backstage/core-plugin-api');

describe('useImportedAssets', () => {
  let mockApi: any;
  let mockGetImportedAssets: jest.Mock;

  beforeEach(() => {
    mockGetImportedAssets = jest.fn();
    mockApi = {
      getImportedAssets: mockGetImportedAssets,
    };

    (useApi as jest.Mock).mockImplementation((ref: any) => {
      if (ref === convisoPlatformApiRef) {
        return mockApi;
      }
      return mockApi;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch imported assets on mount when companyId is provided', async () => {
    mockGetImportedAssets.mockResolvedValue({
      assets: [
        { id: '1', name: 'Asset One' },
        { id: '2', name: 'Asset Two' },
      ],
    });

    const { result } = renderHook(() => useImportedAssets(123));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetImportedAssets).toHaveBeenCalledWith(123);
    expect(result.current.importedAssets.size).toBe(2);
    expect(result.current.isImported('Asset One')).toBe(true);
    expect(result.current.isImported('Asset Two')).toBe(true);
  });

  it('should not fetch when companyId is null', () => {
    renderHook(() => useImportedAssets(null));

    expect(mockGetImportedAssets).not.toHaveBeenCalled();
  });

  it('should normalize asset names for comparison', async () => {
    mockGetImportedAssets.mockResolvedValue({
      assets: [
        { id: '1', name: '  Asset One  ' },
        { id: '2', name: 'ASSET TWO' },
      ],
    });

    const { result } = renderHook(() => useImportedAssets(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isImported('asset one')).toBe(true);
    expect(result.current.isImported('  Asset One  ')).toBe(true);
    expect(result.current.isImported('ASSET TWO')).toBe(true);
    expect(result.current.isImported('asset two')).toBe(true);
  });

  it('should handle errors', async () => {
    mockGetImportedAssets.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useImportedAssets(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.importedAssets.size).toBe(0);
  });

  it('should allow manual refresh', async () => {
    mockGetImportedAssets
      .mockResolvedValueOnce({
        assets: [{ id: '1', name: 'Asset One' }],
      })
      .mockResolvedValueOnce({
        assets: [
          { id: '1', name: 'Asset One' },
          { id: '2', name: 'Asset Two' },
        ],
      });

    const { result } = renderHook(() => useImportedAssets(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.importedAssets.size).toBe(1);

    await act(async () => {
      await result.current.refreshImportedAssets(123);
    });

    await waitFor(() => {
      expect(result.current.importedAssets.size).toBe(2);
    });
  });

  it('should return false for non-imported assets', async () => {
    mockGetImportedAssets.mockResolvedValue({
      assets: [{ id: '1', name: 'Asset One' }],
    });

    const { result } = renderHook(() => useImportedAssets(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isImported('Asset One')).toBe(true);
    expect(result.current.isImported('Asset Two')).toBe(false);
  });
});

