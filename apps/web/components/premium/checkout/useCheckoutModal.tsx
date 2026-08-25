'use client';

import type { PremiumPlanTier } from '@revoke.cash/core/premium/plans';
import CheckoutModal, { type CheckoutSource } from 'components/premium/checkout/CheckoutModal';
import analytics from 'lib/utils/analytics';
import { useState } from 'react';

export const useCheckoutModal = (source: CheckoutSource) => {
  const [tier, setTier] = useState<PremiumPlanTier | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openCheckout = (selectedTier: PremiumPlanTier, trackingSource: string = source) => {
    analytics.track('Checkout Opened', { tier: selectedTier, source: trackingSource });
    setTier(selectedTier);
    setIsOpen(true);
  };

  const checkoutModal = tier && (
    <CheckoutModal tier={tier} open={isOpen} setOpen={setIsOpen} onTierChange={setTier} source={source} />
  );

  return { openCheckout, checkoutModal };
};
