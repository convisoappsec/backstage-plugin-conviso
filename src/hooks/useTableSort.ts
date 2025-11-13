import { useCallback, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc' | null;
export type SortableColumn = 'name' | 'description' | 'owner' | 'lifecycle' | 'type' | 'status';

interface UseTableSortReturn<T> {
  sortedItems: T[];
  sortColumn: SortableColumn | null;
  sortDirection: SortDirection;
  handleSort: (column: SortableColumn) => void;
}

interface UseTableSortOptions<T> {
  items: T[];
  getSortValue: (item: T, column: SortableColumn) => string | number | boolean;
}

export function useTableSort<T>({
  items,
  getSortValue,
}: UseTableSortOptions<T>): UseTableSortReturn<T> {
  const [sortColumn, setSortColumn] = useState<SortableColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = useCallback((column: SortableColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  const sortedItems = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return items;
    }

    return [...items].sort((a, b) => {
      const aValue = getSortValue(a, sortColumn);
      const bValue = getSortValue(b, sortColumn);

      if (aValue === bValue) {
        return 0;
      }

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        if (aValue === bValue) {
          comparison = 0;
        } else {
          comparison = aValue ? 1 : -1;
        }
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [items, sortColumn, sortDirection, getSortValue]);

  return {
    sortedItems,
    sortColumn,
    sortDirection,
    handleSort,
  };
}

