'use client';

import {
  type ColumnDef,
  type ColumnVisibilityState,
  type Row,
  type RowData,
  useTable as useTanStackTable,
} from '@tanstack/react-table';
import { type AppTableFeatures, appTableFeatures, type NoTableMeta } from 'lib/utils/table';

interface TableOptions<T extends RowData, TMeta extends object> {
  data: T[];
  // ReadonlyArray like the underlying hook
  columns: ReadonlyArray<ColumnDef<AppTableFeatures<TMeta>, T, unknown>>;
  // Tables whose columns read options.meta pass their family's features together with the matching meta; everything else uses the default
  features?: AppTableFeatures<TMeta>;
  // TMeta is inferred from `features` and `columns`, not by the meta literal (using NoInfer)
  meta?: NoInfer<TMeta>;
  getRowId?: (row: T) => string;
  getRowCanExpand?: (row: Row<AppTableFeatures<NoInfer<TMeta>>, T>) => boolean;
  pageSize?: number;
  columnVisibility?: ColumnVisibilityState;
  autoResetPageIndex?: boolean;
}

export const useTable = <T extends RowData, TMeta extends object = NoTableMeta>({
  data,
  columns,
  features = appTableFeatures as AppTableFeatures<TMeta>,
  meta,
  getRowId,
  getRowCanExpand,
  pageSize = 25,
  columnVisibility,
  autoResetPageIndex,
}: TableOptions<T, TMeta>) => {
  return useTanStackTable({
    features,
    data,
    columns,
    autoResetExpanded: false, // Expanded rows must survive background refetches
    ...(getRowCanExpand ? { getRowCanExpand } : {}),
    getRowId,
    meta,
    autoResetPageIndex,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
    ...(columnVisibility ? { state: { columnVisibility } } : {}),
  });
};
