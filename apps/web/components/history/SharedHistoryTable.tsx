'use client';

import type { EnrichedTokenEvent } from '@revoke.cash/core/events';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import Card, { CardTitle } from 'components/common/Card';
import InformationIconTooltip from 'components/common/InformationIconTooltip';
import Table from 'components/common/table/Table';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useMemo, useRef } from 'react';
import { ColumnId, columns, customFilterFns } from './columns';
import HistorySearchBox, { type HistorySearchBoxRef } from './HistorySearchBox';

interface Props {
  approvalHistory?: EnrichedTokenEvent[];
  isLoading: boolean;
  error?: Error;
  isPremium?: boolean;
  titleTooltip?: ReactNode;
}

const SharedHistoryTable = ({ approvalHistory, isLoading, error, isPremium = false, titleTooltip }: Props) => {
  const t = useTranslations();
  const searchBoxRef = useRef<HistorySearchBoxRef>(null);

  const data = useMemo(() => {
    return approvalHistory ?? [];
  }, [approvalHistory]);

  const onFilter = useCallback((filterValue: string) => {
    if (searchBoxRef.current) {
      searchBoxRef.current.setInputValue(filterValue);
    }
  }, []);

  const table = useReactTable({
    data,
    columns,
    autoResetPageIndex: !isPremium,
    getCoreRowModel: getCoreRowModel<EnrichedTokenEvent>(),
    getSortedRowModel: getSortedRowModel<EnrichedTokenEvent>(),
    getFilteredRowModel: getFilteredRowModel<EnrichedTokenEvent>(),
    getPaginationRowModel: getPaginationRowModel<EnrichedTokenEvent>(),
    filterFns: customFilterFns,
    initialState: {
      pagination: {
        pageSize: 25,
      },
      columnVisibility: {
        [ColumnId.CHAIN]: isPremium,
        [ColumnId.COMBINED_SEARCH]: false,
      },
    },
    getRowId(row) {
      return `${row.chainId}-${row.time.transactionHash}-${row.time.logIndex}`;
    },
    meta: { onFilter } as any,
  });

  const title = titleTooltip ? (
    <>
      {t('address.history.title')}
      <InformationIconTooltip tooltip={titleTooltip} />
    </>
  ) : (
    t('address.history.title')
  );

  return (
    <Card header={<CardTitle title={title} />} className="p-0">
      <HistorySearchBox ref={searchBoxRef} table={table} isPremium={isPremium} />
      <Table
        table={table}
        loading={isLoading}
        error={error}
        emptyChildren={t('address.history.none_found')}
        partialLoadingRows={isPremium ? 3 : 0}
        className="border-none rounded-none"
      />
    </Card>
  );
};

export default SharedHistoryTable;
