'use client';

import AddressHeader from 'components/address/AddressHeader';
import AddressNavigation from 'components/address/navigation/AddressNavigation';
import PremiumAddressHeader from 'components/address/PremiumAddressHeader';
import PremiumAllowancePageProvider from 'components/address/PremiumAllowancePageProvider';
import { useAddress } from 'lib/hooks/page-context/AddressIdentityContext';
import { AddressPageContextProvider } from 'lib/hooks/page-context/AddressPageContext';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

// Renders the premium or free address page experience. This branches on the client-side context
// rather than the server-side entitlement lookup so that `?free=true` can force the free experience.
const AddressPageExperience = ({ children }: Props) => {
  const { address, isPremium } = useAddress();

  if (isPremium) {
    return (
      <PremiumAllowancePageProvider>
        <PremiumAddressHeader />
        <AddressNavigation />
        {children}
      </PremiumAllowancePageProvider>
    );
  }

  return (
    <AddressPageContextProvider address={address}>
      <AddressHeader />
      <AddressNavigation />
      {children}
    </AddressPageContextProvider>
  );
};

export default AddressPageExperience;
