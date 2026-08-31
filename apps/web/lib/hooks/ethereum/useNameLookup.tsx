import { isNullish } from '@revoke.cash/core/utils';
import { HOUR } from '@revoke.cash/core/utils/time';
import { lookupAvvyName, lookupEnsName, lookupGweiName, lookupUnsName, lookupWeiName } from '@revoke.cash/core/whois';
import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';

export const useNameLookup = (address?: Address) => {
  const { data: ensName } = useQuery({
    queryKey: ['ensName', address, { persist: true }],
    queryFn: () => lookupEnsName(address),
    enabled: !isNullish(address),
    staleTime: 12 * HOUR,
  });

  const { data: unsName } = useQuery({
    queryKey: ['unsName', address, { persist: true }],
    queryFn: () => lookupUnsName(address),
    enabled: !isNullish(address),
    staleTime: 12 * HOUR,
  });

  const { data: avvyName } = useQuery({
    queryKey: ['avvyName', address, { persist: true }],
    queryFn: () => lookupAvvyName(address),
    enabled: !isNullish(address),
    staleTime: 12 * HOUR,
  });

  const { data: weiName } = useQuery({
    queryKey: ['weiName', address, { persist: true }],
    queryFn: () => lookupWeiName(address),
    enabled: !isNullish(address),
    staleTime: 12 * HOUR,
  });

  const { data: gweiName } = useQuery({
    queryKey: ['gweiName', address, { persist: true }],
    queryFn: () => lookupGweiName(address),
    enabled: !isNullish(address),
    staleTime: 12 * HOUR,
  });

  const domainName = ensName || unsName || avvyName || weiName || gweiName;

  return { ensName, unsName, avvyName, weiName, gweiName, domainName };
};
