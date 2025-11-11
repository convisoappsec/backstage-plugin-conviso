import { act, renderHook } from '@testing-library/react';
import { useTableSort } from './useTableSort';

describe('useTableSort', () => {
  interface TestItem {
    name: string;
    value: number;
    active: boolean;
  }

  const mockItems: TestItem[] = [
    { name: 'Charlie', value: 30, active: true },
    { name: 'Alice', value: 10, active: false },
    { name: 'Bob', value: 20, active: true },
  ];

  const getSortValue = (item: TestItem, column: string) => {
    switch (column) {
      case 'name':
        return item.name;
      case 'value':
        return item.value;
      case 'active':
        return item.active;
      default:
        return '';
    }
  };

  describe('initial state', () => {
    it('should return unsorted items initially', () => {
      const { result } = renderHook(() =>
        useTableSort({
          items: mockItems,
          getSortValue,
        })
      );

      expect(result.current.sortedItems).toEqual(mockItems);
      expect(result.current.sortColumn).toBeNull();
      expect(result.current.sortDirection).toBeNull();
    });
  });

  describe('handleSort', () => {
    it('should sort ascending on first click', () => {
      const { result } = renderHook(() =>
        useTableSort({
          items: mockItems,
          getSortValue,
        })
      );

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortColumn).toBe('name');
      expect(result.current.sortDirection).toBe('asc');
      expect(result.current.sortedItems[0].name).toBe('Alice');
      expect(result.current.sortedItems[1].name).toBe('Bob');
      expect(result.current.sortedItems[2].name).toBe('Charlie');
    });

    it('should sort descending on second click', () => {
      const { result } = renderHook(() =>
        useTableSort({
          items: mockItems,
          getSortValue,
        })
      );

      act(() => {
        result.current.handleSort('name');
      });

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortColumn).toBe('name');
      expect(result.current.sortDirection).toBe('desc');
      expect(result.current.sortedItems[0].name).toBe('Charlie');
      expect(result.current.sortedItems[1].name).toBe('Bob');
      expect(result.current.sortedItems[2].name).toBe('Alice');
    });

    it('should clear sort on third click', () => {
      const { result } = renderHook(() =>
        useTableSort({
          items: mockItems,
          getSortValue,
        })
      );

      act(() => {
        result.current.handleSort('name');
      });

      act(() => {
        result.current.handleSort('name');
      });

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortColumn).toBeNull();
      expect(result.current.sortDirection).toBeNull();
      expect(result.current.sortedItems).toEqual(mockItems);
    });

    it('should switch to new column when clicking different column', () => {
      const { result } = renderHook(() =>
        useTableSort({
          items: mockItems,
          getSortValue,
        })
      );

      act(() => {
        result.current.handleSort('name');
      });

      act(() => {
        result.current.handleSort('value');
      });

      expect(result.current.sortColumn).toBe('value');
      expect(result.current.sortDirection).toBe('asc');
      expect(result.current.sortedItems[0].value).toBe(10);
      expect(result.current.sortedItems[1].value).toBe(20);
      expect(result.current.sortedItems[2].value).toBe(30);
    });
  });

  describe('sorting by type', () => {
    it('should sort strings correctly', () => {
      const { result } = renderHook(() =>
        useTableSort({
          items: mockItems,
          getSortValue,
        })
      );

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortedItems[0].name).toBe('Alice');
      expect(result.current.sortedItems[2].name).toBe('Charlie');
    });

    it('should sort numbers correctly', () => {
      const { result } = renderHook(() =>
        useTableSort({
          items: mockItems,
          getSortValue,
        })
      );

      act(() => {
        result.current.handleSort('value');
      });

      expect(result.current.sortedItems[0].value).toBe(10);
      expect(result.current.sortedItems[1].value).toBe(20);
      expect(result.current.sortedItems[2].value).toBe(30);
    });

    it('should sort booleans correctly', () => {
      const { result } = renderHook(() =>
        useTableSort({
          items: mockItems,
          getSortValue,
        })
      );

      act(() => {
        result.current.handleSort('active');
      });

      expect(result.current.sortedItems[0].active).toBe(false);
      expect(result.current.sortedItems[1].active).toBe(true);
      expect(result.current.sortedItems[2].active).toBe(true);
    });

    it('should handle mixed types by converting to string', () => {
      const mixedItems = [
        { name: 'Item1', value: 10, active: true },
        { name: 'Item2', value: 20, active: false },
      ];

      const getMixedSortValue = (item: TestItem, column: string) => {
        if (column === 'mixed') {
          return item.active ? 'true' : 0;
        }
        return getSortValue(item, column);
      };

      const { result } = renderHook(() =>
        useTableSort({
          items: mixedItems,
          getSortValue: getMixedSortValue,
        })
      );

      act(() => {
        result.current.handleSort('mixed' as any);
      });

      expect(result.current.sortedItems).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty items array', () => {
      const { result } = renderHook(() =>
        useTableSort({
          items: [],
          getSortValue,
        })
      );

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortedItems).toEqual([]);
    });

    it('should handle items with equal values', () => {
      const equalItems: TestItem[] = [
        { name: 'Alice', value: 10, active: true },
        { name: 'Bob', value: 10, active: true },
      ];

      const { result } = renderHook(() =>
        useTableSort({
          items: equalItems,
          getSortValue,
        })
      );

      act(() => {
        result.current.handleSort('value');
      });

      expect(result.current.sortedItems).toHaveLength(2);
    });

    it('should maintain original order when values are equal', () => {
      const equalItems: TestItem[] = [
        { name: 'Alice', value: 10, active: true },
        { name: 'Bob', value: 10, active: true },
      ];

      const { result } = renderHook(() =>
        useTableSort({
          items: equalItems,
          getSortValue,
        })
      );

      act(() => {
        result.current.handleSort('value');
      });

      expect(result.current.sortedItems[0].name).toBe('Alice');
      expect(result.current.sortedItems[1].name).toBe('Bob');
    });
  });
});

