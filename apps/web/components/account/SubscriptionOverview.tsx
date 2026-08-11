'use client';

import { isUltimatePlan } from '@revoke.cash/core/premium/plans';
import type { PremiumEntitlement, PremiumSubscription } from '@revoke.cash/core/premium/types';
import { shortenAddress } from '@revoke.cash/core/utils/formatting';
import { DAY } from '@revoke.cash/core/utils/time';
import Href from 'components/common/Href';
import StatusLabel from 'components/common/StatusLabel';
import { useNameLookup } from 'lib/hooks/ethereum/useNameLookup';
import { getCancellationRefund, hasPendingRefundRequest } from 'lib/utils/cancellation';
import { useTranslations } from 'next-intl';
import { twMerge } from 'tailwind-merge';
import type { Address } from 'viem';

interface Props {
  account: Address;
  activeSubscription: PremiumSubscription | undefined;
  expiredSubscription: PremiumSubscription | undefined;
  entitlements: PremiumEntitlement[];
}

const SubscriptionOverview = ({ account, activeSubscription, expiredSubscription, entitlements }: Props) => {
  const t = useTranslations();
  const { domainName } = useNameLookup(account);

  const grantedEntitlements = entitlements.filter(
    (entitlement) => entitlement.ownerAddress.toLowerCase() !== activeSubscription?.ownerAddress?.toLowerCase(),
  );

  const hasNothingToShow = !activeSubscription && !expiredSubscription && grantedEntitlements.length === 0;

  return (
    <div className="min-w-0 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('account.subscription.wallet')}</span>
        <span className="font-medium">{domainName ?? shortenAddress(account, 4)}</span>
        <Href
          href={`/address/${account}`}
          router
          underline="hover"
          className="w-fit text-sm font-mono break-all text-zinc-600 visited:text-zinc-600 dark:text-zinc-400 dark:visited:text-zinc-400"
        >
          {account}
        </Href>
      </div>

      {hasNothingToShow ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t.rich('account.subscription.no_subscription', {
            'premium-link': (chunks) => (
              <Href href="/premium" router underline="always">
                {chunks}
              </Href>
            ),
          })}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {activeSubscription && (
            <SubscriptionBanner
              planName={activeSubscription.plan.name}
              endsAt={activeSubscription.endsAt}
              slots={activeSubscription.slots}
              cancellationRequested={hasPendingRefundRequest(activeSubscription.payments)}
            />
          )}
          {!activeSubscription && expiredSubscription && (
            <ExpiredSubscriptionBanner subscription={expiredSubscription} />
          )}
          {grantedEntitlements.map((entitlement) => (
            <SubscriptionBanner
              key={entitlement.ownerAddress}
              planName={entitlement.planName}
              endsAt={entitlement.endsAt}
              grantedBy={entitlement.ownerAddress}
            />
          ))}
          {!activeSubscription && !expiredSubscription && grantedEntitlements.length > 0 && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('account.subscription.optional_own_subscription')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionOverview;

interface SubscriptionBannerProps {
  planName: string;
  endsAt: string;
  grantedBy?: Address;
  slots?: { used: number; max: number };
  cancellationRequested?: boolean;
}

const EXPIRY_WARNING_DAYS = 30;

const SubscriptionBanner = ({ planName, endsAt, grantedBy, slots, cancellationRequested }: SubscriptionBannerProps) => {
  const t = useTranslations();

  const daysUntilExpiry = Math.max(Math.ceil((new Date(endsAt).getTime() - Date.now()) / DAY), 0);
  const isExpiringSoon = daysUntilExpiry <= EXPIRY_WARNING_DAYS;

  const bannerStrings = [
    grantedBy && t('account.subscription.granted_by', { address: shortenAddress(grantedBy, 4) }),
    isExpiringSoon
      ? t('account.subscription.expires_in', { days: daysUntilExpiry, date: endsAt.slice(0, 10) })
      : t('account.subscription.valid_until', { date: endsAt.slice(0, 10) }),
    slots && t('account.subscription.slots_summary', { used: slots.used, max: slots.max }),
  ];

  const bannerClasses = isExpiringSoon
    ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
    : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900';

  return (
    <div className={twMerge('flex flex-col gap-2 rounded-md p-4 border', bannerClasses)}>
      <div className="flex items-center gap-2">
        <span className="font-medium">{planName}</span>
        <StatusLabel status={isExpiringSoon ? 'warning' : 'success'}>
          {isExpiringSoon ? t('account.subscription.expires_soon') : t('account.subscription.active')}
        </StatusLabel>
        {cancellationRequested && (
          <StatusLabel status="warning">{t('account.subscription.cancellation.requested')}</StatusLabel>
        )}
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{bannerStrings.filter(Boolean).join(' • ')}</p>
    </div>
  );
};

const ExpiredSubscriptionBanner = ({ subscription }: { subscription: PremiumSubscription }) => {
  const t = useTranslations();

  // A subscription whose latest payment was refunded ended by cancellation, not by running out
  const cancellationRefund = getCancellationRefund(subscription.payments);

  const bannerStrings = [
    cancellationRefund
      ? t('account.subscription.cancellation.cancelled_on', { date: cancellationRefund.processedAt.slice(0, 10) })
      : t('account.subscription.expired_on', { date: subscription.endsAt.slice(0, 10) }),
    isUltimatePlan(subscription.plan) && t('account.subscription.expired_ultimate_stopped'),
    t('account.subscription.expired_preserved'),
  ];

  return (
    <div className="flex flex-col gap-2 rounded-md bg-yellow-50 dark:bg-yellow-950/20 p-4 border border-yellow-200 dark:border-yellow-900">
      <div className="flex items-center gap-2">
        <span className="font-medium">{subscription.plan.name}</span>
        <StatusLabel status="warning">
          {cancellationRefund ? t('account.subscription.cancellation.cancelled') : t('account.subscription.expired')}
        </StatusLabel>
        {hasPendingRefundRequest(subscription.payments) && (
          <StatusLabel status="warning">{t('account.subscription.cancellation.requested')}</StatusLabel>
        )}
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{bannerStrings.filter(Boolean).join(' ')}</p>
    </div>
  );
};
