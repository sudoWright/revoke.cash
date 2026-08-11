'use client';

import { ArrowPathIcon } from '@heroicons/react/24/outline';
import NoticeBanner from 'components/common/NoticeBanner';
import PremiumChainStatusSection from 'components/common/PremiumChainStatusSection';
import { usePremiumApprovalHistory } from 'lib/hooks/ethereum/usePremiumApprovalHistory';
import { usePremiumAddressPageContext } from 'lib/hooks/page-context/PremiumAddressPageContext';
import { useTranslations } from 'next-intl';
import SharedHistoryTable from './SharedHistoryTable';

const PremiumHistoryTable = () => {
  const t = useTranslations();
  const { chainData } = usePremiumAddressPageContext();
  const { approvalHistory, chainStatuses, isLoading, error } = usePremiumApprovalHistory();
  const hasChainsStillLoading = chainStatuses.some((chain) => chain.status === 'loading');
  const tableLoading = hasChainsStillLoading || isLoading;

  const pendingTransferClassifications = chainData.reduce(
    (sum, chain) => sum + chain.pendingTransferClassifications,
    0,
  );

  return (
    <div className="flex flex-col gap-2">
      <PremiumChainStatusSection chainStatuses={chainStatuses} />
      {pendingTransferClassifications > 0 && (
        <NoticeBanner style="info" icon={ArrowPathIcon}>
          {t('address.history.checking_transfers', { count: pendingTransferClassifications })}
        </NoticeBanner>
      )}
      <SharedHistoryTable
        approvalHistory={approvalHistory}
        isLoading={tableLoading}
        error={error}
        isPremium
        titleTooltip={t('address.history.transfer_support_tooltip')}
      />
    </div>
  );
};

export default PremiumHistoryTable;
