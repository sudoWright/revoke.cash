'use client';

import { DialogTitle } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { isUltimatePlan } from '@revoke.cash/core/premium/plans';
import type { PremiumPlan } from '@revoke.cash/core/premium/types';
import Button from 'components/common/Button';
import { useTranslations } from 'next-intl';

interface Props {
  plan: PremiumPlan;
}

const CheckoutSuccess = ({ plan }: Props) => {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <CheckCircleIcon className="w-16 h-16 text-green-600 dark:text-green-400" />
      <DialogTitle as="h2" className="text-2xl font-semibold">
        {t('premium.checkout.success.title')}
      </DialogTitle>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {t('premium.checkout.success.description', { planName: plan.name, maxAddresses: plan.maxAddresses })}
      </p>
      {isUltimatePlan(plan) && (
        <Button style="primary" size="md" href="/account/auto-revoke" router className="w-full justify-center">
          {t('premium.checkout.next_setup_auto_revoke')}
        </Button>
      )}
      <Button
        style={isUltimatePlan(plan) ? 'secondary' : 'primary'}
        size="md"
        href="/account"
        router
        className="w-full justify-center"
      >
        {t('premium.checkout.success.add_wallets')}
      </Button>
    </div>
  );
};

export default CheckoutSuccess;
