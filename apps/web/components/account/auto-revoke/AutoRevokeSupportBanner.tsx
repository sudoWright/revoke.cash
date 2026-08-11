'use client';

import NoticeBanner from 'components/common/NoticeBanner';
import { useAutoRevokeSupport } from 'lib/hooks/auto-revoke/useAutoRevokeSupport';
import { useTranslations } from 'next-intl';

// Warns when the connected wallet cannot grant auto-revoke permissions, either because the wallet
// itself does not support ERC-7715 or because the connected account cannot become a smart account.
const AutoRevokeSupportBanner = () => {
  const t = useTranslations();
  const { supportsAutoRevoke, supportStatus } = useAutoRevokeSupport();

  if (supportsAutoRevoke) return null;

  return (
    <NoticeBanner style="warning">
      {supportStatus === 'unsupported_account'
        ? t('account.auto_revoke.smart_account_required')
        : t('account.auto_revoke.metamask_required')}
    </NoticeBanner>
  );
};

export default AutoRevokeSupportBanner;
