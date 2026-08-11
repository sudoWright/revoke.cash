import { isNullish } from '@revoke.cash/core/utils';
import { useMemo } from 'react';
import { useAccountCapabilities } from './useAccountCapabilities';

export const useWalletCapabilities = (chainId: number) => {
  const { capabilities, isLoading } = useAccountCapabilities();

  const supportsEip5792 = useMemo(() => {
    if (isLoading) return null;
    return !isNullish(capabilities?.[chainId]);
  }, [isLoading, capabilities, chainId]);

  return { isLoading, capabilities, supportsEip5792 };
};
