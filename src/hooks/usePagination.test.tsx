import { act, renderHook } from '@testing-library/react';
import { usePagination } from './usePagination';

describe('usePagination', () => {
  const mockItems = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

  describe('initial state', () => {
    it('should use default values', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems }));

      expect(result.current.page).toBe(0);
      expect(result.current.rowsPerPage).toBe(10);
      expect(result.current.totalCount).toBe(25);
      expect(result.current.paginatedItems).toHaveLength(10);
      expect(result.current.paginatedItems[0].id).toBe(1);
    });

    it('should use custom initial values', () => {
      const { result } = renderHook(() =>
        usePagination({
          items: mockItems,
          initialPage: 1,
          initialRowsPerPage: 5,
        })
      );

      expect(result.current.page).toBe(1);
      expect(result.current.rowsPerPage).toBe(5);
      expect(result.current.paginatedItems).toHaveLength(5);
      expect(result.current.paginatedItems[0].id).toBe(6);
    });
  });

  describe('handlePageChange', () => {
    it('should change page', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems }));

      act(() => {
        result.current.handlePageChange(null, 1);
      });

      expect(result.current.page).toBe(1);
      expect(result.current.paginatedItems[0].id).toBe(11);
    });

    it('should handle page 0', () => {
      const { result } = renderHook(() =>
        usePagination({
          items: mockItems,
          initialPage: 2,
        })
      );

      act(() => {
        result.current.handlePageChange(null, 0);
      });

      expect(result.current.page).toBe(0);
      expect(result.current.paginatedItems[0].id).toBe(1);
    });
  });

  describe('handleRowsPerPageChange', () => {
    it('should change rows per page', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems }));

      const mockEvent = {
        target: { value: '25' },
      } as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleRowsPerPageChange(mockEvent);
      });

      expect(result.current.rowsPerPage).toBe(25);
      expect(result.current.page).toBe(0);
      expect(result.current.paginatedItems).toHaveLength(25);
    });

    it('should reset to page 0 when changing rows per page', () => {
      const { result } = renderHook(() =>
        usePagination({
          items: mockItems,
          initialPage: 2,
        })
      );

      const mockEvent = {
        target: { value: '5' },
      } as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleRowsPerPageChange(mockEvent);
      });

      expect(result.current.page).toBe(0);
      expect(result.current.rowsPerPage).toBe(5);
    });
  });

  describe('resetPage', () => {
    it('should reset to page 0', () => {
      const { result } = renderHook(() =>
        usePagination({
          items: mockItems,
          initialPage: 2,
        })
      );

      act(() => {
        result.current.resetPage();
      });

      expect(result.current.page).toBe(0);
      expect(result.current.paginatedItems[0].id).toBe(1);
    });
  });

  describe('paginatedItems', () => {
    it('should return correct items for first page', () => {
      const { result } = renderHook(() => usePagination({ items: mockItems }));

      expect(result.current.paginatedItems).toHaveLength(10);
      expect(result.current.paginatedItems[0].id).toBe(1);
      expect(result.current.paginatedItems[9].id).toBe(10);
    });

    it('should return correct items for middle page', () => {
      const { result } = renderHook(() =>
        usePagination({
          items: mockItems,
          initialPage: 1,
          initialRowsPerPage: 10,
        })
      );

      expect(result.current.paginatedItems).toHaveLength(10);
      expect(result.current.paginatedItems[0].id).toBe(11);
      expect(result.current.paginatedItems[9].id).toBe(20);
    });

    it('should return correct items for last page', () => {
      const { result } = renderHook(() =>
        usePagination({
          items: mockItems,
          initialPage: 2,
          initialRowsPerPage: 10,
        })
      );

      expect(result.current.paginatedItems).toHaveLength(5);
      expect(result.current.paginatedItems[0].id).toBe(21);
      expect(result.current.paginatedItems[4].id).toBe(25);
    });

    it('should handle items fewer than rows per page', () => {
      const smallItems = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));

      const { result } = renderHook(() =>
        usePagination({
          items: smallItems,
          initialRowsPerPage: 10,
        })
      );

      expect(result.current.paginatedItems).toHaveLength(5);
      expect(result.current.totalCount).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle empty items array', () => {
      const { result } = renderHook(() => usePagination({ items: [] }));

      expect(result.current.paginatedItems).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.page).toBe(0);
    });

    it('should handle page beyond available items', () => {
      const { result } = renderHook(() =>
        usePagination({
          items: mockItems,
          initialRowsPerPage: 10,
        })
      );

      act(() => {
        result.current.handlePageChange(null, 10);
      });

      expect(result.current.page).toBe(10);
      expect(result.current.paginatedItems).toHaveLength(0);
    });

    it('should handle rowsPerPage larger than total items', () => {
      const { result } = renderHook(() =>
        usePagination({
          items: mockItems,
          initialRowsPerPage: 100,
        })
      );

      expect(result.current.paginatedItems).toHaveLength(25);
      expect(result.current.totalCount).toBe(25);
    });
  });
});

