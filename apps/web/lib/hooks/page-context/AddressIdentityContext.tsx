'use client';

import { useSearchParams } from 'next/navigation';
import { createContext, type ReactNode, useContext } from 'react';
import type { Address } from 'viem';
import { useNameLookup } from '../ethereum/useNameLookup';

interface AddressIdentityContextValue {
  address: Address;
  domainName?: string;
  isPremium: boolean;
  isUltimate: boolean;
  premiumEndsAt?: string;
}

interface Props {
  children: ReactNode;
  address: Address;
  domainName?: string | null;
  isPremium?: boolean;
  isUltimate?: boolean;
  premiumEndsAt?: string;
}

export const AddressIdentityContext = createContext<AddressIdentityContextValue>(undefined as any);

export const AddressIdentityContextProvider = ({
  children,
  address,
  domainName: initialDomainName,
  isPremium = false,
  isUltimate = false,
  premiumEndsAt,
}: Props) => {
  const { domainName: resolvedDomainName } = useNameLookup(initialDomainName ? undefined : address);

  const domainName = initialDomainName ?? resolvedDomainName ?? undefined;
  const isForcedFree = useSearchParams().get('free') === 'true';

  return (
    <AddressIdentityContext
      value={{
        address,
        domainName,
        isPremium: isPremium && !isForcedFree,
        isUltimate: isUltimate && !isForcedFree,
        premiumEndsAt,
      }}
    >
      {children}
    </AddressIdentityContext>
  );
};

export const useAddress = () => {
  const context = useContext(AddressIdentityContext);
  if (!context) {
    throw new Error('useAddressIdentityContext must be used within an AddressIdentityContextProvider');
  }
  return context;
};
