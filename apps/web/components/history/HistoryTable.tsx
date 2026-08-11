import { SparklesIcon } from '@heroicons/react/24/solid';
import { isApprovedTransfersSupportedChain } from '@revoke.cash/core/transfers/config';
import Button from 'components/common/Button';
import NoticeBanner from 'components/common/NoticeBanner';
import { useApprovalHistory } from 'lib/hooks/ethereum/useApprovalHistory';
import { useAddressPageContext } from 'lib/hooks/page-context/AddressPageContext';
import { useTranslations } from 'next-intl';
import SharedHistoryTable from './SharedHistoryTable';

const HistoryTable = () => {
  const t = useTranslations();
  const { selectedChainId } = useAddressPageContext();
  const { approvalHistory, isLoading, error } = useApprovalHistory();

  return (
    <div className="flex flex-col gap-2">
      {isApprovedTransfersSupportedChain(selectedChainId) && (
        <NoticeBanner
          style="info"
          icon={SparklesIcon}
          action={
            <Button style="primary" size="sm" href="/premium" router>
              {t('address.history.upsell.cta')}
            </Button>
          }
        >
          <span className="block font-medium mb-0.5">{t('address.history.upsell.title')}</span>
          {t('address.history.upsell.description')}
        </NoticeBanner>
      )}
      <SharedHistoryTable approvalHistory={approvalHistory} isLoading={isLoading} error={error ?? undefined} />
    </div>
  );
};

export default HistoryTable;
