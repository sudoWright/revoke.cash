'use client';

import type { Delegation } from '@revoke.cash/core/delegations/DelegatePlatform';
import Card, { CardTitle } from 'components/common/Card';
import Table from 'components/common/table/Table';
import { useTable } from 'lib/hooks/useTable';
import { useTranslations } from 'next-intl';
import { delegationsTableFeatures, eip7702Columns } from './columns';

interface Props {
  delegations: Delegation[];
  isLoading: boolean;
  error: Error | null;
}

const Eip7702DelegationsTable = ({ delegations, isLoading, error }: Props) => {
  const t = useTranslations();

  const table = useTable({
    features: delegationsTableFeatures,
    data: delegations || [],
    columns: eip7702Columns,
  });

  return (
    <Card
      header={<CardTitle title={t('address.delegations.eip7702_delegations')} />}
      className="p-0 overflow-x-scroll whitespace-nowrap scrollbar-hide"
    >
      <Table
        table={table}
        loading={isLoading}
        emptyChildren={t('address.delegations.no_eip7702_delegations')}
        error={error}
        className="border-none"
      />
    </Card>
  );
};

export default Eip7702DelegationsTable;
