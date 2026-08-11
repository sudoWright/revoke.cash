'use client';

import NoticeBanner from 'components/common/NoticeBanner';
import { useAutoRevokeSupport } from 'lib/hooks/auto-revoke/useAutoRevokeSupport';
import { useTranslations } from 'next-intl';

const UltimateWalletNotice = () => {
  const t = useTranslations();
  const { supportsAutoRevoke, supportStatus } = useAutoRevokeSupport();

  if (supportsAutoRevoke) return null;

  return (
    <NoticeBanner style="warning">
      {supportStatus === 'unsupported_account'
        ? t('account.subscription.ultimate_requires_smart_account')
        : t('account.subscription.ultimate_requires_metamask')}
    </NoticeBanner>
  );
};

export default UltimateWalletNotice;
