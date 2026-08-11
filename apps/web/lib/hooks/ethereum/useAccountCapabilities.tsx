import { isNullish } from '@revoke.cash/core/utils';
import { useQuery } from '@tanstack/react-query';
import type { Capabilities } from 'viem';
import { useConnection, useWalletClient } from 'wagmi';

// EIP-5792 capabilities are scoped to a single account, so the query is keyed on the connected address
// and connector rather than on the wallet client, which is shared across every account in the wallet.
export const useAccountCapabilities = () => {
  const { address, connector } = useConnection();
  const { data: walletClient } = useWalletClient();

  const { data: capabilities, isLoading } = useQuery({
    queryKey: ['wallet-capabilities', address, connector?.id],
    queryFn: async () => {
      if (!walletClient) return null;

      try {
        const capabilities = (await walletClient.getCapabilities()) as Capabilities;
        console.log('Wallet supports EIP5792:', capabilities);
        return capabilities;
      } catch {
        console.log('Wallet does not support EIP5792');
        return null;
      }
    },
    enabled: !isNullish(walletClient),
  });

  return { capabilities, isLoading };
};
