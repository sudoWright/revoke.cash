import { AUTO_REVOKE_SUPPORTED_CHAINS } from '@revoke.cash/core/auto-revoke/config';
import ContentPageHero from 'components/common/ContentPageHero';
import Href from 'components/common/Href';
import { Feature } from 'components/landing/FeaturesShowcase';
import LandingPageFaqItem from 'components/landing/LandingPageFaqItem';
import PricingTierGrid from 'components/premium/checkout/PricingTierGrid';
import { useTranslations } from 'next-intl';
import ActiveSubscriptionBanner from './ActiveSubscriptionBanner';
import ComparisonTable from './ComparisonTable';
import { DEMO_ADDRESS_URL, TIER_MAX_ADDRESSES } from './pricing-data';

const TRANSLATION_PREFIX = 'premium.pricing.feature_sections';

const PremiumPricingPageContent = () => {
  const t = useTranslations();

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-12">
      <ContentPageHero title={t('premium.pricing.title')} subtitle={t('premium.pricing.description')} />
      <ActiveSubscriptionBanner />

      <PricingTierGrid />

      <p className="-mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">{t('premium.pricing.payment_note')}</p>

      <ComparisonTable walletSlots={{ premium: 10, ultimate: 10 }} />

      <div className="flex flex-col gap-8">
        <h2 className="text-3xl font-bold text-center">{t('premium.pricing.feature_sections.title')}</h2>
        <div className="flex flex-col gap-8">
          <Feature
            featureKey="multichain_dashboard"
            image="/assets/images/premium/multichain-dashboard.jpg"
            video="/assets/videos/premium/multichain-dashboard.mp4"
            imagePosition="left"
            translationPrefix={TRANSLATION_PREFIX}
            link={{
              href: DEMO_ADDRESS_URL,
              label: t('premium.pricing.feature_sections.multichain_dashboard.link_label'),
            }}
          />
          <Feature
            featureKey="multichain_exploit_checker"
            image="/assets/images/premium/multichain-exploit-checker.jpg"
            video="/assets/videos/premium/multichain-exploit-checker.mp4"
            imagePosition="right"
            translationPrefix={TRANSLATION_PREFIX}
          />
          <Feature
            featureKey="approved_transfers"
            image="/assets/images/premium/approved-transfers.jpg"
            video="/assets/videos/premium/approved-transfers.mp4"
            imagePosition="left"
            translationPrefix={TRANSLATION_PREFIX}
            link={{
              href: `${DEMO_ADDRESS_URL}/history`,
              label: t('premium.pricing.feature_sections.approved_transfers.link_label'),
            }}
          />
          <Feature
            featureKey="fee_free_batch_revokes"
            image="/assets/images/premium/batch-revoke.jpg"
            video="/assets/videos/premium/batch-revoke.mp4"
            imagePosition="right"
            translationPrefix={TRANSLATION_PREFIX}
          />
          {/* Time machine is hidden until its standalone launch (re-enabling flips automated_revoking back to "right") */}
          {/* <Feature
            featureKey="time_machine"
            image="/assets/images/premium/time-machine.jpg"
            video="/assets/videos/premium/time-machine.mp4"
            imagePosition="left"
            translationPrefix={TRANSLATION_PREFIX}
          /> */}
          <Feature
            featureKey="automated_revoking"
            image="/assets/images/premium/auto-revoke.jpg"
            video="/assets/videos/premium/auto-revoke.mp4"
            imagePosition="left"
            translationPrefix={TRANSLATION_PREFIX}
            badge={t('premium.pricing.tiers.ultimate.name')}
            link={{
              href: '/premium/automated-revoking',
              label: t('premium.pricing.feature_sections.automated_revoking.link_label'),
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <h2 className="text-3xl font-bold text-center">{t('premium.pricing.faq.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-8">
          <LandingPageFaqItem question={t(`premium.pricing.faq.multiple_wallets.question`)}>
            {t(`premium.pricing.faq.multiple_wallets.answer`, { count: TIER_MAX_ADDRESSES.premium })}
          </LandingPageFaqItem>
          <LandingPageFaqItem question={t(`premium.pricing.faq.subscription_expiry.question`)}>
            {t(`premium.pricing.faq.subscription_expiry.answer`)}
          </LandingPageFaqItem>
          <LandingPageFaqItem question={t(`premium.pricing.faq.supported_wallets.question`)}>
            {t.rich(`premium.pricing.faq.supported_wallets.answer`, {
              count: AUTO_REVOKE_SUPPORTED_CHAINS.length,
              link: (children) => (
                <Href href="/premium/automated-revoking" router underline="always">
                  {children}
                </Href>
              ),
            })}
          </LandingPageFaqItem>
          <LandingPageFaqItem question={t(`premium.pricing.faq.best_effort.question`)}>
            {t(`premium.pricing.faq.best_effort.answer`)}
          </LandingPageFaqItem>
        </div>
      </div>
    </div>
  );
};

export default PremiumPricingPageContent;
