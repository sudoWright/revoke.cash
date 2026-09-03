import type { TokenAllowanceData } from '@revoke.cash/core/allowances';
import { deduplicateArray } from '@revoke.cash/core/utils';
import {
  type ColumnFiltersState,
  columnFilteringFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  type ReactTable,
  type RowData,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
} from '@tanstack/react-table';

// Meta type for tables whose columns read nothing from options.meta
export type NoTableMeta = Record<string, never>;

// Every table in the app registers the same features and row models
export const createTableFeatures = <TMeta extends object>() =>
  tableFeatures({
    tableMeta: {} as TMeta,
    sortFns,
    filterFns,
    columnFilteringFeature,
    columnVisibilityFeature,
    rowExpandingFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    filteredRowModel: createFilteredRowModel(),
    sortedRowModel: createSortedRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    expandedRowModel: createExpandedRowModel(),
  });

export const appTableFeatures = createTableFeatures<NoTableMeta>();
export type AppTableFeatures<TMeta extends object = NoTableMeta> = ReturnType<typeof createTableFeatures<TMeta>>;

export const updateTableFilters = <TMeta extends object, T extends RowData = TokenAllowanceData>(
  table: ReactTable<AppTableFeatures<TMeta>, T>,
  newFilters: ColumnFiltersState,
  ignoreIds: string[] = [],
) => {
  // Read from the underlying store rather than table.state: callers may hold a stale React-facing
  // table object (its state is a render snapshot), while the store always has the current state.
  const oldFilters = table.store.state.columnFilters;
  const keepOldFilters = oldFilters.filter((filter) => ignoreIds.includes(filter.id));
  const allFilters = [...keepOldFilters, ...newFilters];
  const uniqueFilters = deduplicateArray(allFilters, (filter) => filter.id);

  const filtersChanged = JSON.stringify(uniqueFilters) !== JSON.stringify(oldFilters);
  if (!filtersChanged) return;

  table.setColumnFilters(uniqueFilters);
  table.resetPageIndex();
};
