'use client';

import {
  getPaymentTokens,
  isSupportedPaymentChainId,
  type PaymentToken,
  PREMIUM_PAYMENT_CHAIN_IDS,
  usdCentsToTokenUnits,
} from '@revoke.cash/core/premium/payment-config';
import type { PaymentTokenSymbol, PremiumPlan } from '@revoke.cash/core/premium/types';
import { type PaymentTokenBalance, usePaymentTokenBalances } from 'lib/hooks/premium/usePaymentTokenBalances';
import { useState } from 'react';
import type { Address } from 'viem';
import { useConnection } from 'wagmi';

export type PaymentOptionSelection = ReturnType<typeof usePaymentOptionSelection>;

interface PaymentOption {
  chainId: number;
  tokenSymbol: PaymentTokenSymbol;
}

export const usePaymentOptionSelection = (
  open: boolean,
  selectedPlan: PremiumPlan | null,
  account: Address | undefined,
) => {
  const { chainId: walletChainId } = useConnection();
  const { balances, findBalance } = usePaymentTokenBalances(account, open);

  const [chosenOption, setChosenOption] = useState<PaymentOption | null>(null);

  const automaticOption = getAutomaticOption(walletChainId, balances, selectedPlan);
  const selectedPaymentChainId = chosenOption?.chainId ?? automaticOption.chainId;

  // A chosen token can be unavailable after a chain switch; fall back to the chain's default
  const paymentTokens = getPaymentTokens(selectedPaymentChainId);
  const preferredTokenSymbol = chosenOption?.tokenSymbol ?? automaticOption.tokenSymbol;
  const selectedPaymentTokenSymbol = paymentTokens.some((token) => token.symbol === preferredTokenSymbol)
    ? preferredTokenSymbol
    : paymentTokens[0].symbol;
  const selectedPaymentToken = paymentTokens.find((token) => token.symbol === selectedPaymentTokenSymbol) ?? null;
  const selectedBalance = findBalance(selectedPaymentChainId, selectedPaymentTokenSymbol);

  const hasSufficientBalance = getHasSufficientBalance(selectedBalance, selectedPaymentToken, selectedPlan);

  // Choosing either half locks in the other half as well, so the automatic default stops applying
  const choosePaymentChainId = (chainId: number) => {
    setChosenOption({ chainId, tokenSymbol: selectedPaymentTokenSymbol });
  };

  const choosePaymentTokenSymbol = (tokenSymbol: PaymentTokenSymbol) => {
    setChosenOption({ chainId: selectedPaymentChainId, tokenSymbol });
  };

  return {
    selectedPaymentChainId,
    selectedPaymentTokenSymbol,
    selectedPaymentToken,
    paymentTokens,
    selectedBalance,
    hasSufficientBalance,
    choosePaymentChainId,
    choosePaymentTokenSymbol,
  };
};

const getHasSufficientBalance = (
  balance: bigint | null,
  token: PaymentToken | null,
  plan: PremiumPlan | null,
): boolean => {
  if (balance === null || !token || !plan) return true;
  return balance >= usdCentsToTokenUnits(plan.priceUsdCents, token.decimals);
};

const getAutomaticOption = (
  walletChainId: number | undefined,
  balances: PaymentTokenBalance[],
  selectedPlan: PremiumPlan | null,
): PaymentOption => {
  const chainId =
    walletChainId && isSupportedPaymentChainId(walletChainId) ? walletChainId : PREMIUM_PAYMENT_CHAIN_IDS[0];
  const tokenSymbol = getPaymentTokens(chainId)[0].symbol;

  if (!selectedPlan) return { chainId, tokenSymbol };

  const canCoverPrice = (entry: PaymentTokenBalance) =>
    entry.balance !== null && entry.balance >= usdCentsToTokenUnits(selectedPlan.priceUsdCents, entry.token.decimals);

  // Keep the default while its balance is unknown or sufficient
  const defaultEntry = balances.find((entry) => entry.chainId === chainId && entry.token.symbol === tokenSymbol);
  if (!defaultEntry || defaultEntry.balance === null || canCoverPrice(defaultEntry)) return { chainId, tokenSymbol };

  // The default cannot cover the price; prefer another token on the same chain over switching chains
  const orderedBalances = [...balances].sort((a, b) => Number(b.chainId === chainId) - Number(a.chainId === chainId));
  const fundedEntry = orderedBalances.find(canCoverPrice);

  return fundedEntry
    ? { chainId: fundedEntry.chainId, tokenSymbol: fundedEntry.token.symbol }
    : { chainId, tokenSymbol };
};
