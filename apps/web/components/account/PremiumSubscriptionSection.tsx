'use client';

import type { PremiumEntitlement, PremiumSubscription } from '@revoke.cash/core/premium/types';
import { isNullish } from '@revoke.cash/core/utils';
import SubscriptionOverview from 'components/account/SubscriptionOverview';
import SubscriptionPaymentSection from 'components/account/SubscriptionPaymentSection';
import Card, { CardTitle } from 'components/common/Card';
import { usePremiumPlans } from 'lib/hooks/premium/usePremiumPlans';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import type { Address } from 'viem';

interface Props {
  account: Address;
  activeSubscription: PremiumSubscription | undefined;
  expiredSubscription: PremiumSubscription | undefined;
  entitlements: PremiumEntitlement[];
}

// The selected plan lives here rather than in the payment section, because it is seeded from the
// subscription data and the URL, and it decides when the whole card is still loading
const PremiumSubscriptionSection = ({ account, activeSubscription, expiredSubscription, entitlements }: Props) => {
  const t = useTranslations();

  const { selectedPlanId, setSelectedPlanId, isLoadingPlans } = usePlanSelection(
    activeSubscription,
    expiredSubscription,
  );

  return (
    <Card
      header={<CardTitle title={t('account.subscription.title')} />}
      isLoading={isLoadingPlans}
      className={twMerge('flex flex-col gap-4', isLoadingPlans && 'h-80')}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <SubscriptionOverview
          account={account}
          activeSubscription={activeSubscription}
          expiredSubscription={expiredSubscription}
          entitlements={entitlements}
        />

        <SubscriptionPaymentSection
          account={account}
          activeSubscription={activeSubscription}
          expiredSubscription={expiredSubscription}
          selectedPlanId={selectedPlanId}
          onSelectPlanId={setSelectedPlanId}
        />
      </div>
    </Card>
  );
};

export default PremiumSubscriptionSection;

// Owns the selected plan and the three places it gets chosen from: the subscription itself, the
// tier passed by the pricing page, and the loaded plan list. The plans query lives here too, since
// two of those rules read it and nothing else in this component does.
const usePlanSelection = (
  activeSubscription: PremiumSubscription | undefined,
  expiredSubscription: PremiumSubscription | undefined,
) => {
  const preselectedTier = useSearchParams()?.get('plan');

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    activeSubscription?.plan.id ?? expiredSubscription?.plan.id ?? 'premium_annual',
  );

  // The rules below only seed the selection. Once the user picks a plan themselves they own it, so
  // late-arriving data can never pull the choice back out from under them.
  const hasUserChosenPlan = useRef(false);

  const choosePlanId = useCallback((planId: string) => {
    hasUserChosenPlan.current = true;
    setSelectedPlanId(planId);
  }, []);

  const { plans, isLoading: isLoadingPlans } = usePremiumPlans(selectedPlanId);

  const activePlanId = activeSubscription?.plan.id;
  const activePlanPriceUsdCents = activeSubscription?.plan.priceUsdCents;
  const expiredPlanId = expiredSubscription?.plan.id;

  // The tier from the pricing page wins, except when it would downgrade an active subscription:
  // someone on Ultimate who follows a Premium link belongs on the plan they already have, not on a
  // plan the selector disables and the server would reject
  useEffect(() => {
    if (hasUserChosenPlan.current) return;

    const preselectedPlan = plans.find((plan) => plan.tier === preselectedTier);
    const wouldDowngrade =
      !isNullish(activePlanPriceUsdCents) &&
      !isNullish(preselectedPlan) &&
      preselectedPlan.priceUsdCents < activePlanPriceUsdCents;

    if (preselectedPlan && !wouldDowngrade) {
      setSelectedPlanId(preselectedPlan.id);
      return;
    }

    const subscribedPlanId = activePlanId ?? expiredPlanId;
    if (subscribedPlanId) {
      setSelectedPlanId(subscribedPlanId);
    }
  }, [preselectedTier, plans, activePlanId, activePlanPriceUsdCents, expiredPlanId]);

  // Reset selected plan if loaded plans don't include it
  useEffect(() => {
    const firstPlanId = plans[0]?.id;
    if (!firstPlanId) return;

    if (selectedPlanId !== 'free' && !plans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(firstPlanId);
    }
  }, [plans, selectedPlanId]);

  return { selectedPlanId, setSelectedPlanId: choosePlanId, isLoadingPlans };
};
