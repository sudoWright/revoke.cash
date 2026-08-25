'use client';

import { SparklesIcon } from '@heroicons/react/24/solid';
import Button from 'components/common/Button';
import NoticeBanner from 'components/common/NoticeBanner';
import { useCheckoutModal } from 'components/premium/checkout/useCheckoutModal';
import { useTranslations } from 'next-intl';

const AutoRevokeUpsellBanner = () => {
  const t = useTranslations();
  const { openCheckout, checkoutModal } = useCheckoutModal('auto_revoke_upsell');

  return (
    <>
      <NoticeBanner
        style="info"
        icon={SparklesIcon}
        action={
          <Button style="primary" size="sm" onClick={() => openCheckout('ultimate')}>
            {t('common.buttons.upgrade_to_ultimate')}
          </Button>
        }
      >
        {t('account.auto_revoke.upsell')}
      </NoticeBanner>

      {checkoutModal}
    </>
  );
};

export default AutoRevokeUpsellBanner;
