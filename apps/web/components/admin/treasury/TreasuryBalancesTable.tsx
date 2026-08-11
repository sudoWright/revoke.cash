'use client';

import type { Nullable } from '@revoke.cash/core/types';
import { formatFiatAmount, formatFixedPointBigInt } from '@revoke.cash/core/utils/formatting';
import { createColumnHelper } from '@tanstack/react-table';
import ChainDisplay from 'components/common/ChainDisplay';
import Table from 'components/common/table/Table';
import WithHoverTooltip from 'components/common/WithHoverTooltip';
import { useTable } from 'lib/hooks/useTable';
import { type ReactNode, useMemo } from 'react';

export interface TreasuryBalanceRow {
  id: string;
  chainId: number;
  tokenSymbol: string;
  decimals: number;
  // Raw balance in the smallest unit; null when the balance could not be read
  balance: string | null;
  priceUsd: number | null;
  balanceUsd: number | null;
}

interface Props {
  rows: TreasuryBalanceRow[];
  isLoading: boolean;
  error?: Nullable<Error>;
  emptyChildren?: ReactNode;
}

const columnHelper = createColumnHelper<TreasuryBalanceRow>();

// Every balance fits on a single page, since the point of these tables is to see all chains at once
const PAGE_SIZE = 100;

// Balances worth less than this are not worth reconciling, so they are summarized below the table instead
const MINIMUM_DISPLAYED_VALUE_USD = 10;

// Balances whose value could not be determined are always shown: leaving an unread or unpriced chain out
// would make it look like it holds nothing
const isWorthDisplaying = (row: TreasuryBalanceRow) =>
  row.balanceUsd === null || row.balanceUsd >= MINIMUM_DISPLAYED_VALUE_USD;

// Shared table for the treasury balance sections, which all show a balance and its dollar value per chain
const TreasuryBalancesTable = ({ rows, isLoading, error, emptyChildren }: Props) => {
  const displayedRows = useMemo(() => rows.filter(isWorthDisplaying), [rows]);
  const hiddenRows = useMemo(() => rows.filter((row) => !isWorthDisplaying(row)), [rows]);

  const columns = useMemo(() => {
    // The total covers the hidden balances too, so that it stays the full amount held
    const totalUsd = rows.reduce((total, row) => total + (row.balanceUsd ?? 0), 0);

    // A total of zero before the balances have loaded would read as a real number, so the total row
    // only appears once there is something to add up
    const totalFooter = (content: ReactNode) => (rows.length > 0 ? () => content : undefined);

    return [
      columnHelper.accessor('chainId', {
        id: 'chain',
        header: 'Chain',
        footer: totalFooter(<span className="font-medium">Total</span>),
        cell: (info) => (
          <div className="py-1.5 pr-4 text-sm">
            <ChainDisplay chainId={info.getValue()} />
          </div>
        ),
      }),
      columnHelper.display({
        id: 'balance',
        header: 'Balance',
        cell: (info) => (
          <div className="py-1.5 pr-4 text-sm">
            <BalanceDisplay row={info.row.original} />
          </div>
        ),
      }),
      columnHelper.accessor('balanceUsd', {
        id: 'value',
        header: () => <div className="text-right">Value</div>,
        footer: totalFooter(<div className="text-right font-medium">{formatFiatAmount(totalUsd)}</div>),
        cell: (info) => (
          <div className="py-1.5 text-right text-sm">
            <ValueDisplay row={info.row.original} />
          </div>
        ),
      }),
    ];
  }, [rows]);

  const table = useTable({ data: displayedRows, columns, getRowId: (row) => row.id, pageSize: PAGE_SIZE });

  const hiddenUsd = hiddenRows.reduce((total, row) => total + (row.balanceUsd ?? 0), 0);

  return (
    <>
      <Table
        table={table}
        loading={isLoading}
        error={error}
        // Balances that exist but are all too small to list would make the caller's empty state a lie
        emptyChildren={
          hiddenRows.length > 0
            ? `Every balance is under ${formatFiatAmount(MINIMUM_DISPLAYED_VALUE_USD)}`
            : emptyChildren
        }
        className="border-none"
      />
      {hiddenRows.length > 0 && (
        <div className="px-4 py-2 text-xs text-zinc-500">
          {hiddenRows.length} {hiddenRows.length === 1 ? 'balance' : 'balances'} under{' '}
          {formatFiatAmount(MINIMUM_DISPLAYED_VALUE_USD)} hidden, worth {formatFiatAmount(hiddenUsd)} in total
        </div>
      )}
    </>
  );
};

interface DisplayProps {
  row: TreasuryBalanceRow;
}

const BalanceDisplay = ({ row }: DisplayProps) => {
  if (row.balance === null) return <span className="text-zinc-500">RPC error</span>;

  return (
    <span>
      {formatFixedPointBigInt(BigInt(row.balance), row.decimals, 0, 6)} {row.tokenSymbol}
    </span>
  );
};

const ValueDisplay = ({ row }: DisplayProps) => {
  if (row.balanceUsd === null) return <span className="text-zinc-500">no price</span>;

  // Balances of zero are valued without ever looking up a price, so there is nothing to show on hover
  if (row.priceUsd === null) return <span>{formatFiatAmount(row.balanceUsd)}</span>;

  return (
    <WithHoverTooltip tooltip={`1 ${row.tokenSymbol} = ${formatFiatAmount(row.priceUsd, row.priceUsd >= 1 ? 2 : 6)}`}>
      <span>{formatFiatAmount(row.balanceUsd)}</span>
    </WithHoverTooltip>
  );
};

export default TreasuryBalancesTable;
