import { getHistoryEventSpenderAddress } from '@revoke.cash/core/allowances/history';
import { getChainName } from '@revoke.cash/core/chains';
import {
  type EnrichedTokenEvent,
  isCancelPermitEvent,
  isRevokeEvent,
  isTransferTokenEvent,
  TokenEventType,
} from '@revoke.cash/core/events';
import { isNullish } from '@revoke.cash/core/utils';
import { createColumnHelper, filterFns, type Row, type RowData } from '@tanstack/react-table';
import HeaderCell from 'components/allowances/dashboard/cells/HeaderCell';
import TransactionDateCell from 'components/allowances/dashboard/cells/TransactionDateCell';
import EventTypeCell from './cells/EventTypeCell';
import HistoryAmountCell from './cells/HistoryAmountCell';
import HistoryAssetCell from './cells/HistoryAssetCell';
import HistoryChainCell from './cells/HistoryChainCell';
import HistorySpenderCell from './cells/HistorySpenderCell';

declare module '@tanstack/table-core' {
  interface TableMeta<TData extends RowData> {
    onFilter: (filterValue: string) => void;
  }
}

export enum ColumnId {
  CHAIN = 'Network',
  ASSET = 'Asset',
  EVENT_TYPE = 'Event Type',
  SPENDER = 'Approved Spender',
  AMOUNT = 'Amount',
  DATE = 'Date',
  COMBINED_SEARCH = 'Combined Search',
}

// Semantic event categories as displayed by EventTypeCell, used as `event:` search terms.
export type HistoryEventCategory = 'approval' | 'revocation' | 'cancellation' | 'transfer';

export const getHistoryEventCategory = (event: EnrichedTokenEvent): HistoryEventCategory => {
  if (isTransferTokenEvent(event)) return 'transfer';
  if (isCancelPermitEvent(event)) return 'cancellation';
  if (isRevokeEvent(event)) return 'revocation';
  return 'approval';
};

const accessors = {
  token: (event: EnrichedTokenEvent) => {
    if (isNullish(event.metadata?.symbol)) return event.token;
    return `${event.metadata?.symbol} ${event.token}`;
  },
  spender: (event: EnrichedTokenEvent) => {
    const spenderAddress = getHistoryEventSpenderAddress(event);
    if (isNullish(event.payload.spenderData?.name)) return spenderAddress;
    return `${event.payload.spenderData?.name} ${spenderAddress}`;
  },
  timestamp: (event: EnrichedTokenEvent) => {
    return event.time.timestamp;
  },
  chain: (event: EnrichedTokenEvent) => {
    const chainName = getChainName(event.chainId);
    return `${chainName} ${event.chainId}`;
  },
};

// Custom filter functions for history table
export const customFilterFns = {
  includesOneOfStrings: (row: Row<EnrichedTokenEvent>, columnId: string, filterValues: string[]) => {
    const results = filterValues.map((filterValue) => {
      return filterFns.includesString(row, columnId, filterValue, () => {});
    });

    return results.some((result) => result);
  },
  tokenOrSpender: (row: Row<EnrichedTokenEvent>, _columnId: string, filterValues: string[]) => {
    const spenderMatches = customFilterFns.includesOneOfStrings(row, ColumnId.SPENDER, filterValues);
    const tokenMatches = customFilterFns.includesOneOfStrings(row, ColumnId.ASSET, filterValues);
    return spenderMatches || tokenMatches;
  },
};

const columnHelper = createColumnHelper<EnrichedTokenEvent>();
export const columns = [
  // Virtual column for combined search (not displayed)
  columnHelper.display({
    id: ColumnId.COMBINED_SEARCH,
    enableColumnFilter: true,
    filterFn: customFilterFns.tokenOrSpender,
  }),
  columnHelper.accessor(accessors.chain, {
    id: ColumnId.CHAIN,
    header: () => <HeaderCell i18nKey="address.headers.chain" />,
    cell: ({ row }) => <HistoryChainCell chainId={row.original.chainId} />,
    size: 132,
    enableSorting: false,
    enableColumnFilter: true,
    filterFn: customFilterFns.includesOneOfStrings,
  }),
  columnHelper.accessor(accessors.token, {
    id: ColumnId.ASSET,
    header: () => <HeaderCell i18nKey="address.headers.asset" />,
    cell: (info) => <HistoryAssetCell event={info.row.original} onFilter={info.table.options.meta!.onFilter} />,
    size: 160,
    enableSorting: false,
    enableColumnFilter: true,
    filterFn: customFilterFns.includesOneOfStrings,
  }),
  columnHelper.accessor(getHistoryEventCategory, {
    id: ColumnId.EVENT_TYPE,
    header: () => <HeaderCell i18nKey="address.headers.event_type" />,
    cell: ({ row }) => <EventTypeCell event={row.original} />,
    size: 96,
    enableSorting: false,
    enableColumnFilter: true,
    filterFn: customFilterFns.includesOneOfStrings,
  }),
  columnHelper.accessor(accessors.spender, {
    id: ColumnId.SPENDER,
    header: () => <HeaderCell i18nKey="address.headers.spender" />,
    cell: (info) => {
      const event = info.row.original;
      const spenderAddress = getHistoryEventSpenderAddress(event);
      const permit2Address =
        isTransferTokenEvent(event) || event.type === TokenEventType.PERMIT2 ? event.payload.permit2Address : undefined;

      return (
        <HistorySpenderCell
          address={spenderAddress}
          spenderData={event.payload.spenderData}
          permit2Address={permit2Address}
          chainId={event.chainId}
          onFilter={info.table.options.meta!.onFilter}
        />
      );
    },
    size: 160,
    enableSorting: false,
    enableColumnFilter: true,
    filterFn: customFilterFns.includesOneOfStrings,
  }),
  columnHelper.accessor('payload.amount', {
    id: ColumnId.AMOUNT,
    header: () => <HeaderCell i18nKey="address.headers.amount" />,
    cell: ({ row }) => <HistoryAmountCell event={row.original} />,
    size: 128,
    enableSorting: false,
  }),
  columnHelper.accessor(accessors.timestamp, {
    id: ColumnId.DATE,
    header: () => <HeaderCell i18nKey="address.headers.date" />,
    cell: ({ row }) => <TransactionDateCell timeLog={row.original.time} chainId={row.original.chainId} />,
    size: 128,
    enableSorting: true,
    sortingFn: 'basic',
  }),
];
