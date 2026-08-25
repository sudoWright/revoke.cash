'use client';

import { summarizeEntitlements } from '@revoke.cash/core/premium/entitlements';
import type { PremiumPlanTier } from '@revoke.cash/core/premium/plans';
import type { PremiumPlan } from '@revoke.cash/core/premium/types';
import { useAccountSubscriptions } from 'lib/hooks/premium/useAccountSubscriptions';
import { usePremiumEntitlements } from 'lib/hooks/premium/usePremiumEntitlements';
import { usePremiumPlans } from 'lib/hooks/premium/usePremiumPlans';

type CheckoutAction = 'subscribe' | 'extend' | 'renew' | 'upgrade';

export const useCheckoutPlan = (tier: PremiumPlanTier, open: boolean) => {
  const {
    account,
    isAuthenticated,
    activeSubscription,
    latestExpiredSubscription,
    entitlements,
    isLoading: isLoadingSubscriptions,
  } = useAccountSubscriptions();

  const { plans, isLoading: isLoadingPlans, isError: isPlansError } = usePremiumPlans('');
  const selectedPlan = plans.find((plan) => plan.tier === tier) ?? null;

  const { ownTier: publicOwnTier, grantedTier: publicGrantedTier } = usePremiumEntitlements(account, open);

  const ownActivePlan: Pick<PremiumPlan, 'name' | 'priceUsdCents' | 'tier'> | null = isAuthenticated
    ? (activeSubscription?.plan ?? null)
    : (plans.find((plan) => plan.tier === publicOwnTier) ?? null);

  const grantedTier =
    isAuthenticated && account ? summarizeEntitlements(account, entitlements).grantedTier : publicGrantedTier;

  const isDowngradeOfActivePlan = Boolean(
    ownActivePlan && selectedPlan && selectedPlan.priceUsdCents < ownActivePlan.priceUsdCents,
  );

  const hasCoveringGrantedEntitlement = Boolean(
    !ownActivePlan && grantedTier && (grantedTier === 'ultimate' || grantedTier === tier),
  );

  const getAction = (): CheckoutAction => {
    if (ownActivePlan) {
      if (ownActivePlan.tier === tier) return 'extend';
      if (tier === 'ultimate') return 'upgrade';
      return 'subscribe'; // a lower tier than the active plan; the server rejects the payment
    }
    if (latestExpiredSubscription?.plan.tier === tier) return 'renew';
    return 'subscribe';
  };

  return {
    account,
    isAuthenticated,
    selectedPlan,
    ownActivePlan,
    action: getAction(),
    isDowngradeOfActivePlan,
    hasCoveringGrantedEntitlement,
    // Nothing should render until the subscription data is in, so the checkout opens directly in the right state
    isLoading: isLoadingPlans || isLoadingSubscriptions,
    isPlansError,
  };
};
