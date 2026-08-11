'use client';

import { CRISP_WEBSITE_ID, DISCORD_URL } from '@revoke.cash/core/constants';
import { getPaymentTokens, PREMIUM_PAYMENT_CHAIN_IDS } from '@revoke.cash/core/premium/payment-config';
import { isUltimatePlan } from '@revoke.cash/core/premium/plans';
import type { PaymentTokenSymbol, PremiumPlan, PremiumSubscription } from '@revoke.cash/core/premium/types';
import { isNullish } from '@revoke.cash/core/utils';
import PaymentTokenSelect from 'components/account/PaymentTokenSelect';
import UltimateWalletNotice from 'components/account/UltimateWalletNotice';
import Button from 'components/common/Button';
import CardSelect, { type CardSelectOption } from 'components/common/CardSelect';
import Href from 'components/common/Href';
import NoticeBanner from 'components/common/NoticeBanner';
import ChainSelect from 'components/common/select/ChainSelect';
import { Crisp } from 'crisp-sdk-web';
import { usePremiumPlans } from 'lib/hooks/premium/usePremiumPlans';
import { useSubscribe } from 'lib/hooks/premium/useSubscribe';
import analytics from 'lib/utils/analytics';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { Address } from 'viem';
import { useConnection } from 'wagmi';

interface Props {
  account: Address;
  activeSubscription: PremiumSubscription | undefined;
  expiredSubscription: PremiumSubscription | undefined;
  selectedPlanId: string;
  onSelectPlanId: (planId: string) => void;
}

const SubscriptionPaymentSection = ({
  account,
  activeSubscription,
  expiredSubscription,
  selectedPlanId,
  onSelectPlanId,
}: Props) => {
  const t = useTranslations();
  const { chainId } = useConnection();

  const [selectedPaymentChainId, setSelectedPaymentChainId] = useState<number>(PREMIUM_PAYMENT_CHAIN_IDS[0]);
  const [selectedPaymentTokenSymbol, setSelectedPaymentTokenSymbol] = useState<PaymentTokenSymbol>('USDC');

  const paymentTokens = getPaymentTokens(selectedPaymentChainId);
  const selectedPaymentToken = paymentTokens.find((token) => token.symbol === selectedPaymentTokenSymbol) ?? null;

  // Shares the plans query with the parent section, so this does not fetch a second time
  const { plans, selectedPlan, isLoading: isLoadingPlans, isError: isPlansError } = usePremiumPlans(selectedPlanId);

  const planCardOptions = usePlanCardOptions(plans, activeSubscription);

  const { subscribe, isSubscribing, status, error, reset } = useSubscribe({
    ownerAddress: account,
    selectedPlan,
    selectedPaymentChainId,
    selectedPaymentToken,
  });

  // Auto-select wallet chain as payment chain if it's supported
  useEffect(() => {
    if (chainId && PREMIUM_PAYMENT_CHAIN_IDS.includes(chainId as (typeof PREMIUM_PAYMENT_CHAIN_IDS)[number])) {
      setSelectedPaymentChainId(chainId);
    }
  }, [chainId]);

  // Not every chain accepts every token, so fall back to the chain's default when switching
  useEffect(() => {
    const availableTokens = getPaymentTokens(selectedPaymentChainId);
    if (availableTokens.length === 0) return;
    if (availableTokens.some((token) => token.symbol === selectedPaymentTokenSymbol)) return;

    setSelectedPaymentTokenSymbol(availableTokens[0].symbol);
  }, [selectedPaymentChainId, selectedPaymentTokenSymbol]);

  const isFreeSelected = selectedPlanId === 'free';

  const getActionLabel = (): 'subscribe' | 'renew' | 'extend' | 'upgrade' => {
    if (activeSubscription) {
      if (activeSubscription.plan.id === selectedPlanId) return 'extend';
      return 'upgrade';
    }

    if (expiredSubscription?.plan.id === selectedPlanId) return 'renew';
    return 'subscribe';
  };

  const action = getActionLabel();

  if (isPlansError) {
    return (
      <PaymentColumn>
        <NoticeBanner style="warning">{t('account.subscription.plans_unavailable')}</NoticeBanner>
      </PaymentColumn>
    );
  }

  return (
    <PaymentColumn>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('account.subscription.plan')}</span>
        <CardSelect
          options={planCardOptions}
          value={selectedPlanId}
          onChange={(value) => {
            onSelectPlanId(value);
            if (status === 'failed' || status === 'confirmed') reset();
          }}
          disabled={isLoadingPlans || isSubscribing}
        />
      </div>

      {selectedPlan && !isFreeSelected && (
        <>
          {/* Both selects are narrow, so they sit side by side and only wrap when the column gets tight */}
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {t('account.subscription.payment_network')}
              </span>
              <div className={isSubscribing ? 'pointer-events-none opacity-60' : undefined}>
                <ChainSelect
                  instanceId="premium-payment-chain-select"
                  chainIds={[...PREMIUM_PAYMENT_CHAIN_IDS]}
                  selected={selectedPaymentChainId}
                  onSelect={setSelectedPaymentChainId}
                  showNames
                />
              </div>
            </div>

            {paymentTokens.length > 1 && selectedPaymentToken && (
              <div className="flex flex-col gap-2 w-32">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t('account.subscription.payment_token')}
                </span>
                <div className={isSubscribing ? 'opacity-60' : undefined}>
                  <PaymentTokenSelect
                    instanceId="premium-payment-token-select"
                    tokens={paymentTokens}
                    selected={selectedPaymentToken.symbol}
                    onSelect={setSelectedPaymentTokenSymbol}
                    isDisabled={isSubscribing}
                  />
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t('account.subscription.payment_summary', {
              amount: selectedPlan.priceUsdCents / 100,
              token: selectedPaymentToken?.symbol ?? 'USDC',
              days: selectedPlan.durationDays,
              maxAddresses: selectedPlan.maxAddresses,
            })}
          </p>

          {isUltimatePlan(selectedPlan) && <UltimateWalletNotice />}

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.rich('account.subscription.legal_notice', {
              'terms-link': (children) => (
                <Href href="/terms" router underline="always">
                  {children}
                </Href>
              ),
            })}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {status === 'confirmed' ? (
              <>
                <span className="text-sm text-green-700 dark:text-green-300">
                  {t('account.subscription.payment_confirmed')}
                </span>
                {isUltimatePlan(selectedPlan) && (
                  <Href href="/account/auto-revoke" router underline="always" className="text-sm">
                    {t('account.subscription.next_setup_auto_revoke')} →
                  </Href>
                )}
              </>
            ) : (
              <Button
                style="primary"
                size="md"
                className="w-fit"
                onClick={() => {
                  analytics.track('Subscribe Clicked', {
                    planId: selectedPlan.id,
                    chainId: selectedPaymentChainId,
                    tokenSymbol: selectedPaymentToken?.symbol,
                    action,
                  });
                  if (status === 'failed') reset();
                  subscribe();
                }}
                loading={isSubscribing}
              >
                {t(
                  `account.subscription.buttons.${status === 'failed' ? 'try_again' : isSubscribing ? status : action}`,
                )}
              </Button>
            )}

            {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
          </div>

          {status === 'failed' && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t.rich('account.subscription.payment_help', {
                'support-link': (children) =>
                  isNullish(CRISP_WEBSITE_ID) ? (
                    <Href href={DISCORD_URL} external underline="always">
                      {children}
                    </Href>
                  ) : (
                    <button
                      type="button"
                      onClick={() => Crisp.chat.open()}
                      className="cursor-pointer underline hover:underline decoration-brand"
                    >
                      {children}
                    </button>
                  ),
              })}
            </p>
          )}
        </>
      )}
    </PaymentColumn>
  );
};

export default SubscriptionPaymentSection;

// The divider only becomes a vertical rule once the two sections sit side by side
const PaymentColumn = ({ children }: { children: ReactNode }) => (
  <div className="min-w-0 flex flex-col gap-4 border-t border-zinc-200 dark:border-zinc-800 pt-4 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-6">
    {children}
  </div>
);

const usePlanCardOptions = (
  plans: PremiumPlan[],
  activeSubscription: PremiumSubscription | undefined,
): CardSelectOption<string>[] => {
  const t = useTranslations();

  const currentPlanId = activeSubscription?.plan.id;
  const currentPlanPriceUsdCents = activeSubscription?.plan.priceUsdCents ?? 0;

  return useMemo<CardSelectOption<string>[]>(() => {
    const isDowngrade = (priceUsdCents: number) =>
      Boolean(activeSubscription && priceUsdCents < currentPlanPriceUsdCents);
    const downgradeTooltip = t('account.subscription.downgrade_not_supported');

    const freeOption: CardSelectOption<string> = {
      value: 'free',
      label: t('account.subscription.plan_options.free'),
      description: t('account.subscription.plan_options.basic_access'),
      tag: !currentPlanId ? t('account.subscription.plan_options.current') : undefined,
      disabled: Boolean(activeSubscription),
      tooltip: activeSubscription ? downgradeTooltip : undefined,
    };

    const premiumOptions = plans.map((plan) => ({
      value: plan.id,
      label: plan.name,
      description: t('account.subscription.plan_description', {
        price: plan.priceUsdCents / 100,
        maxAddresses: plan.maxAddresses,
      }),
      tag: plan.id === currentPlanId ? t('account.subscription.plan_options.current') : undefined,
      disabled: isDowngrade(plan.priceUsdCents),
      tooltip: isDowngrade(plan.priceUsdCents) ? downgradeTooltip : undefined,
    }));

    return [freeOption, ...premiumOptions];
  }, [plans, currentPlanId, activeSubscription, currentPlanPriceUsdCents, t]);
};
