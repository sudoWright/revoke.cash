import {
  AllowanceType,
  calculateValueAtRisk,
  formatErc20Allowance,
  isErc20Allowance,
  type OnUpdate,
  type TokenAllowanceData,
} from '@revoke.cash/core/allowances';
import { isErc721 } from '@revoke.cash/core/tokens';
import { isNullish } from '@revoke.cash/core/utils';
import { formatFixedPointBigInt } from '@revoke.cash/core/utils/formatting';
import { createColumnHelper, filterFns, type Row, sortFns, type Table } from '@tanstack/react-table';
import { createTableFeatures } from 'lib/utils/table';
import RevokeSelectedButton from '../controls/batch-revoke/RevokeSelectedButton';
import AllowanceCell from './cells/AllowanceCell';
import AssetCell from './cells/AssetCell';
import AssetTypeCell from './cells/AssetTypeCell';
import ControlsCell from './cells/ControlsCell';
import GlobalSelectCell from './cells/GlobalSelectCell';
import HeaderCell from './cells/HeaderCell';
import SelectCell from './cells/SelectCell';
import SpenderCell from './cells/SpenderCell';
import TransactionDateCell from './cells/TransactionDateCell';
import ValueAtRiskCell from './cells/ValueAtRiskCell';

export interface AllowancesTableMeta {
  onUpdate: OnUpdate;
  timeMachineTimestamp?: number;
}

export const allowancesTableFeatures = createTableFeatures<AllowancesTableMeta>();
export type AllowancesTableFeatures = typeof allowancesTableFeatures;
export type AllowancesRow = Row<AllowancesTableFeatures, TokenAllowanceData>;
export type AllowancesTable = Table<AllowancesTableFeatures, TokenAllowanceData>;

export enum ColumnId {
  SELECT = 'Select',
  SYMBOL = 'Asset Name',
  ASSET_TYPE = 'Asset Type',
  BALANCE = 'Balance',
  ALLOWANCE = 'Allowance',
  VALUE_AT_RISK = 'Value at Risk',
  SPENDER = 'Approved Spender',
  LAST_UPDATED = 'Last Updated',
  ACTIONS = 'Actions',
}

export const accessors = {
  allowance: (allowance: TokenAllowanceData) => {
    if (isErc20Allowance(allowance.payload)) {
      return formatErc20Allowance(
        allowance.payload.amount,
        allowance.metadata.decimals,
        allowance.metadata.totalSupply,
      );
    }

    if (allowance.payload.type === AllowanceType.ERC721_SINGLE) {
      return allowance.payload.tokenId;
    }

    return 'Unlimited';
  },
  balance: (allowance: TokenAllowanceData) => {
    if (isNullish(allowance.balance)) return '';
    return allowance.balance === 'Unknown'
      ? 'Unknown'
      : formatFixedPointBigInt(allowance.balance, allowance.metadata.decimals);
  },
  assetType: (allowance: TokenAllowanceData) => {
    if (isErc721(allowance.token)) return 'NFT';
    return 'Token';
  },
  valueAtRisk: (allowance: TokenAllowanceData) => {
    // Balance not yet loaded — sort with the "unknown" group (same bucket as missing price).
    if (isNullish(allowance.balance)) return 0.01;

    // No balance means no risk (even if we don't know the price)
    if (allowance.balance === 0n) return 0;

    // If we don't know the price, we can't calculate the value at risk, but we want to it to be sorted
    // before "no approvals" and before the < $0.01 threshold
    if (allowance.balance === 'Unknown') return 0.01;
    if (isNullish(allowance.metadata.price)) return 0.01;
    return calculateValueAtRisk(allowance);
  },
  spender: (allowance: TokenAllowanceData) => {
    if (isNullish(allowance.payload.spenderData?.name)) return allowance.payload.spender;
    return `${allowance.payload.spenderData?.name} (${allowance.payload.spender})`;
  },
  timestamp: (allowance: TokenAllowanceData) => {
    return allowance.payload.lastUpdated.timestamp;
  },
};

export const customSortingFns = {
  timestamp: (rowA: AllowancesRow, rowB: AllowancesRow, columnId: string) => {
    return sortFns.basic(rowA, rowB, columnId);
  },
  allowance: (rowA: AllowancesRow, rowB: AllowancesRow, columnId: string) => {
    if (rowA.getValue(columnId) === rowB.getValue(columnId)) return 0;
    if (rowA.getValue(columnId) === 'Unlimited') return 1;
    if (rowB.getValue(columnId) === 'Unlimited') return -1;
    return sortFns.alphanumeric(rowA, rowB, columnId);
  },
  spender: (rowA: AllowancesRow, rowB: AllowancesRow, columnId: string) => {
    if (!rowA.original.payload.spenderData?.name) return 1;
    if (!rowB.original.payload.spenderData?.name) return -1;
    return sortFns.text(rowA, rowB, columnId);
  },
};

export const customFilterFns = {
  assetType: (row: AllowancesRow, columnId: string, filterValues: string[]) => {
    const results = filterValues.map((filterValue) => {
      return row.getValue(columnId) === filterValue;
    });

    return results.some((result) => result);
  },
  balance: (row: AllowancesRow, columnId: string, filterValues: string[]) => {
    const results = filterValues.map((filterValue) => {
      if (filterValue === 'Zero') return row.getValue(columnId) === '0';
      if (filterValue === 'Non-Zero') return row.getValue(columnId) !== '0';
      return true;
    });

    return results.some((result) => result);
  },
  allowance: (row: AllowancesRow, columnId: string, filterValues: string[]) => {
    const results = filterValues.map((filterValue) => {
      if (filterValue === 'Unlimited') return row.getValue(columnId) === 'Unlimited';
      if (filterValue === 'None') return row.getValue(columnId) === undefined;
      if (filterValue === 'Limited')
        return row.getValue(columnId) !== 'Unlimited' && row.getValue(columnId) !== undefined;
      return true;
    });

    return results.some((result) => result);
  },
  spender: (row: AllowancesRow, columnId: string, filterValues: string[]) => {
    const results = filterValues.map((filterValue) => {
      return filterFns.includesString(row, columnId, filterValue.toLowerCase(), () => {});
    });

    return results.some((result) => result);
  },
};

const columnHelper = createColumnHelper<AllowancesTableFeatures, TokenAllowanceData>();
export const columns = columnHelper.columns([
  columnHelper.display({
    id: ColumnId.SELECT,
    footer: ({ table }) => <GlobalSelectCell table={table} />,
    cell: ({ row }) => <SelectCell row={row} />,
  }),
  columnHelper.accessor('metadata.symbol', {
    id: ColumnId.SYMBOL,
    header: () => <HeaderCell i18nKey="address.headers.asset" />,
    footer: ({ table }) => <RevokeSelectedButton table={table} />,
    cell: (info) => <AssetCell asset={info.row.original} />,
    enableSorting: true,
    sortFn: sortFns.text,
  }),
  columnHelper.accessor(accessors.assetType, {
    id: ColumnId.ASSET_TYPE,
    header: () => <HeaderCell i18nKey="address.headers.asset_type" />,
    cell: (info) => <AssetTypeCell assetType={info.getValue()} />,
    enableSorting: false,
    enableColumnFilter: true,
    filterFn: customFilterFns.assetType,
  }),
  columnHelper.accessor(accessors.balance, {
    id: ColumnId.BALANCE,
    enableHiding: true,
    enableSorting: false,
    enableColumnFilter: true,
    filterFn: customFilterFns.balance,
  }),
  columnHelper.accessor(accessors.allowance, {
    id: ColumnId.ALLOWANCE,
    header: () => <HeaderCell i18nKey="address.headers.allowance" />,
    cell: (info) => (
      <AllowanceCell
        allowance={info.row.original}
        onUpdate={info.table.options.meta!.onUpdate}
        timeMachineTimestamp={info.table.options.meta!.timeMachineTimestamp}
      />
    ),
    enableSorting: true,
    sortFn: customSortingFns.allowance,
    sortUndefined: 'last',
    enableColumnFilter: true,
    filterFn: customFilterFns.allowance,
  }),
  columnHelper.accessor(accessors.valueAtRisk, {
    id: ColumnId.VALUE_AT_RISK,
    header: () => <HeaderCell i18nKey="address.headers.value_at_risk" align="right" />,
    cell: (info) => <ValueAtRiskCell allowance={info.row.original} />,
    enableSorting: true,
    sortFn: sortFns.basic,
    sortUndefined: 'last',
  }),
  columnHelper.accessor(accessors.spender, {
    id: ColumnId.SPENDER,
    header: () => <HeaderCell i18nKey="address.headers.spender" />,
    cell: (info) => <SpenderCell allowance={info.row.original} />,
    enableSorting: true,
    sortFn: customSortingFns.spender,
    sortUndefined: 'last',
    enableColumnFilter: true,
    filterFn: customFilterFns.spender,
  }),
  columnHelper.accessor(accessors.timestamp, {
    id: ColumnId.LAST_UPDATED,
    header: () => <HeaderCell i18nKey="address.headers.last_updated" />,
    cell: (info) => (
      <TransactionDateCell chainId={info.row.original.chainId} timeLog={info.row.original.payload.lastUpdated} />
    ),
    enableSorting: true,
    sortFn: customSortingFns.timestamp,
    sortUndefined: 'last',
  }),
  columnHelper.display({
    id: ColumnId.ACTIONS,
    header: () => <HeaderCell i18nKey="address.headers.actions" align="right" />,
    cell: (info) => (
      <ControlsCell
        allowance={info.row.original}
        onUpdate={info.table.options.meta!.onUpdate}
        timeMachineTimestamp={info.table.options.meta!.timeMachineTimestamp}
      />
    ),
  }),
]);
