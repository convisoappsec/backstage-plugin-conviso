import { useCallback, useMemo, useState } from 'react';

interface UsePaginationOptions<T> {
  items: T[];
  initialPage?: number;
  initialRowsPerPage?: number;
}

interface UsePaginationReturn<T> {
  paginatedItems: T[];
  page: number;
  rowsPerPage: number;
  totalCount: number;
  handlePageChange: (event: unknown, newPage: number) => void;
  handleRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  resetPage: () => void;
}

export function usePagination<T>({
  items,
  initialPage = 0,
  initialRowsPerPage = 10,
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, page, rowsPerPage]);

  const handlePageChange = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, []);

  const resetPage = useCallback(() => {
    setPage(0);
  }, []);

  return {
    paginatedItems,
    page,
    rowsPerPage,
    totalCount: items.length,
    handlePageChange,
    handleRowsPerPageChange,
    resetPage,
  };
}

