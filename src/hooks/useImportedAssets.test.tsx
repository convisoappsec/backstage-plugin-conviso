import { useApi } from '@backstage/core-plugin-api';
import { act, renderHook, waitFor } from '@testing-library/react';
import { convisoPlatformApiRef } from '../api/convisoPlatformApi';
import { useImportedAssets } from './useImportedAssets';

jest.mock('@backstage/core-plugin-api');

describe('useImportedAssets', () => {
  let mockApi: any;
  let mockGetImportedAssets: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    mockGetImportedAssets = jest.fn();
    mockApi = {
      getImportedAssets: mockGetImportedAssets,
      getImportedAssetsCache: jest.fn(),
      syncImportedAssets: jest.fn(),
      addImportedNames: jest.fn(),
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
    localStorage.clear();
  });

  it('should fetch imported assets on mount when companyId is provided', async () => {
    mockApi.getImportedAssetsCache = jest.fn().mockResolvedValue({
      assets: ['Asset One', 'Asset Two'],
      lastSync: new Date().toISOString(),
    });

    const { result } = renderHook(() => useImportedAssets(123));

    expect(result.current.loading).toBe(false);

    await waitFor(() => {
      expect(result.current.importedAssets.size).toBe(2);
    });

    expect(mockApi.getImportedAssetsCache).toHaveBeenCalledWith(123);
    expect(result.current.isImported('Asset One')).toBe(true);
    expect(result.current.isImported('Asset Two')).toBe(true);
  });

  it('should not fetch when companyId is null', () => {
    renderHook(() => useImportedAssets(null));

    expect(mockGetImportedAssets).not.toHaveBeenCalled();
  });

  it('should normalize asset names for comparison', async () => {
    mockApi.getImportedAssetsCache = jest.fn().mockResolvedValue({
      assets: ['  Asset One  ', 'ASSET TWO'],
      lastSync: new Date().toISOString(),
    });

    const { result } = renderHook(() => useImportedAssets(123));

    await waitFor(() => {
      expect(result.current.importedAssets.size).toBe(2);
    });

    expect(result.current.isImported('asset one')).toBe(true);
    expect(result.current.isImported('  Asset One  ')).toBe(true);
    expect(result.current.isImported('ASSET TWO')).toBe(true);
    expect(result.current.isImported('asset two')).toBe(true);
  });

  it('should handle errors', async () => {
    localStorage.clear();
    
    mockApi.getImportedAssetsCache = jest.fn().mockRejectedValue(new Error('API Error'));
    mockApi.syncImportedAssets = jest.fn().mockRejectedValue(new Error('Sync failed'));

    const { result } = renderHook(() => useImportedAssets(123));

    await waitFor(() => {
      expect(result.current.importedAssets.size).toBe(0);
    }, { timeout: 3000 });

    expect(result.current.error).toBeUndefined();
    
    await act(async () => {
      try {
        await result.current.refreshImportedAssets(123, true);
      } catch {
        // Expected error in test
      }
    });
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.loading).toBe(false);
    });
  });

  it('should allow manual refresh', async () => {
    mockApi.getImportedAssetsCache = jest.fn()
      .mockResolvedValueOnce({
        assets: ['Asset One'],
        lastSync: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        assets: ['Asset One', 'Asset Two'],
        lastSync: new Date().toISOString(),
      });
    mockApi.syncImportedAssets = jest.fn().mockResolvedValue({ synced: 0 });

    const { result } = renderHook(() => useImportedAssets(123));

    await waitFor(() => {
      expect(result.current.importedAssets.size).toBe(1);
    });

    await act(async () => {
      await result.current.refreshImportedAssets(123, true);
    });

    await waitFor(() => {
      expect(result.current.importedAssets.size).toBe(2);
    });
  });

  it('should return false for non-imported assets', async () => {
    mockApi.getImportedAssetsCache = jest.fn().mockResolvedValue({
      assets: ['Asset One'],
      lastSync: new Date().toISOString(),
    });

    const { result } = renderHook(() => useImportedAssets(123));

    await waitFor(() => {
      expect(result.current.importedAssets.size).toBe(1);
    });

    expect(result.current.isImported('Asset One')).toBe(true);
    expect(result.current.isImported('Asset Two')).toBe(false);
  });
});

