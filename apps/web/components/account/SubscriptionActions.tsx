'use client';

import type { PremiumSubscription } from '@revoke.cash/core/premium/types';
import Button from 'components/common/Button';
import Href from 'components/common/Href';
import { useCheckoutModal } from 'components/premium/checkout/useCheckoutModal';
import { useTranslations } from 'next-intl';

interface Props {
  activeSubscription: PremiumSubscription | undefined;
  expiredSubscription: PremiumSubscription | undefined;
}

const SubscriptionActions = ({ activeSubscription, expiredSubscription }: Props) => {
  const t = useTranslations();
  const { openCheckout, checkoutModal } = useCheckoutModal('account_page');

  const currentTier = activeSubscription?.plan.tier;
  const subscribedTier = currentTier ?? expiredSubscription?.plan.tier;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      {subscribedTier ? (
        <>
          <Button style="primary" size="md" className="w-fit" onClick={() => openCheckout(subscribedTier)}>
            {t(`account.subscription.buttons.${currentTier ? 'extend' : 'renew'}`)}
          </Button>
          {subscribedTier === 'premium' && (
            <Button style="secondary" size="md" className="w-fit" onClick={() => openCheckout('ultimate')}>
              {t('common.buttons.upgrade_to_ultimate')}
            </Button>
          )}
        </>
      ) : (
        <>
          <Button style="primary" size="md" className="w-fit" onClick={() => openCheckout('ultimate')}>
            {t('common.buttons.get_ultimate')}
          </Button>
          <Button style="secondary" size="md" className="w-fit" onClick={() => openCheckout('premium')}>
            {t('common.buttons.get_premium')}
          </Button>
        </>
      )}

      <Href href="/premium" router underline="always" className="w-fit text-sm">
        {t('premium.pricing.compare_plans')} →
      </Href>

      {checkoutModal}
    </div>
  );
};

export default SubscriptionActions;
