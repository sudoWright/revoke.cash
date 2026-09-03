import { range } from '@revoke.cash/core/utils';
import type { Column, RowData } from '@tanstack/react-table';
import { ColumnId } from 'components/allowances/dashboard/columns';
import type { AppTableFeatures } from 'lib/utils/table';
import { twMerge } from 'tailwind-merge';
import Loader from './Loader';

interface Props<TMeta extends object, T extends RowData> extends React.HTMLAttributes<HTMLTableSectionElement> {
  columns: Column<AppTableFeatures<TMeta>, T>[];
  rowCount: number;
}

const TableBodyLoader = <TMeta extends object, T extends RowData>({ columns, rowCount, ...props }: Props<TMeta, T>) => {
  return (
    <tbody {...props}>
      {range(rowCount).map((i) => (
        <tr key={i} className="border-t first:border-0 border-zinc-200 dark:border-zinc-800">
          {columns.map((column) => (
            <td key={column.id} className={twMerge(column.id === ColumnId.SELECT && 'w-0')}>
              {column.id === ColumnId.SELECT ? null : (
                <div className="py-2.5 px-2">
                  <Loader isLoading>
                    <div className="h-7" />
                  </Loader>
                </div>
              )}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
};

export default TableBodyLoader;
