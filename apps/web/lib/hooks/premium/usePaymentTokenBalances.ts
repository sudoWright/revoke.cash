import { ERC20_ABI } from '@revoke.cash/core/abis';
import { createViemPublicClientForChain } from '@revoke.cash/core/chains';
import {
  getPaymentTokens,
  type PaymentToken,
  type PaymentTokenSymbol,
  PREMIUM_PAYMENT_CHAIN_IDS,
} from '@revoke.cash/core/premium/payment-config';
import { isNullish } from '@revoke.cash/core/utils';
import { SECOND } from '@revoke.cash/core/utils/time';
import { useQueries } from '@tanstack/react-query';
import type { Address } from 'viem';

export interface PaymentTokenBalance {
  chainId: number;
  token: PaymentToken;
  balance: bigint | null;
}

const PAYMENT_OPTIONS = PREMIUM_PAYMENT_CHAIN_IDS.flatMap((chainId) =>
  getPaymentTokens(chainId).map((token) => ({ chainId, token })),
);

// Reads the wallet's balance for every payment option, so the checkout can warn about
// insufficient funds before the payment starts and default to a network that can pay
export const usePaymentTokenBalances = (address: Address | undefined, enabled: boolean) => {
  const balanceQueries = useQueries({
    queries: PAYMENT_OPTIONS.map(({ chainId, token }) => ({
      queryKey: ['premium', 'payment-token-balance', chainId, token.symbol, address],
      queryFn: () =>
        createViemPublicClientForChain(chainId).readContract({
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address!],
        }),
      enabled: enabled && !isNullish(address),
      staleTime: 30 * SECOND,
    })),
  });

  const balances: PaymentTokenBalance[] = PAYMENT_OPTIONS.map((option, index) => ({
    ...option,
    balance: balanceQueries[index].data ?? null,
  }));

  const findBalance = (chainId: number, tokenSymbol: PaymentTokenSymbol) => {
    return balances.find((entry) => entry.chainId === chainId && entry.token.symbol === tokenSymbol)?.balance ?? null;
  };

  return { balances, findBalance };
};
