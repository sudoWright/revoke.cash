'use client';

import { useCheckoutModal } from 'components/premium/checkout/useCheckoutModal';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { DEMO_ADDRESS_URL } from '../pricing/pricing-data';
import TierCard from '../pricing/TierCard';

const PricingTierGrid = () => {
  const t = useTranslations();
  const { openCheckout, checkoutModal } = useCheckoutModal('pricing_page');

  // Marketing links can open the checkout directly via /premium?checkout=premium|ultimate. The
  // parameter is read from the window so the page itself stays statically rendered.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the initial URL matters
  useEffect(() => {
    const checkoutParam = new URLSearchParams(window.location.search).get('checkout');
    if (checkoutParam === 'premium' || checkoutParam === 'ultimate') {
      openCheckout(checkoutParam, 'url');
    }
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TierCard tierKey="free" price="$0" href="/token-approval-checker/ethereum" />
        <TierCard
          tierKey="premium"
          price="$99"
          perWalletPerMonthPrice="$0.83"
          walletSlots={10}
          onSelect={() => openCheckout('premium')}
          link={{
            href: DEMO_ADDRESS_URL,
            label: t('premium.pricing.feature_sections.multichain_dashboard.link_label'),
          }}
          className="border-2 border-brand/70"
          badgeLabel={t('premium.pricing.most_popular_label')}
          badgeClassName="bg-brand text-zinc-900"
          referencesTier="free"
        />
        <TierCard
          tierKey="ultimate"
          price="$199"
          perWalletPerMonthPrice="$1.66"
          walletSlots={10}
          onSelect={() => openCheckout('ultimate')}
          link={{
            href: '/premium/automated-revoking',
            label: t('premium.pricing.feature_sections.automated_revoking.link_label'),
          }}
          className="border-2 border-zinc-900 dark:border-zinc-200"
          badgeLabel={t('premium.pricing.best_protection')}
          badgeClassName="bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900"
          buttonStyle="primary"
          referencesTier="premium"
        />
      </div>

      {checkoutModal}
    </>
  );
};

export default PricingTierGrid;
