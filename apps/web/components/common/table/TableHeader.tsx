import { flexRender, type ReactTable, type RowData } from '@tanstack/react-table';
import type { AppTableFeatures } from 'lib/utils/table';

interface Props<TMeta extends object, T extends RowData> {
  table: ReactTable<AppTableFeatures<TMeta>, T>;
}

const TableHeader = <TMeta extends object, T extends RowData>({ table }: Props<TMeta, T>) => {
  return (
    <thead>
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id} className="border-b border-zinc-200 dark:border-zinc-800 h-10">
          {headerGroup.headers.map((header) => (
            <th key={header.id} className="text-left px-2 first:pl-4 last:pr-4 whitespace-nowrap">
              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
            </th>
          ))}
        </tr>
      ))}
    </thead>
  );
};

export default TableHeader;
