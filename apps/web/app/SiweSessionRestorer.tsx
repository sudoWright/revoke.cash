'use client';

import { restoreSiweSession } from 'lib/auth/session';
import { useAuthSession } from 'lib/hooks/auth/useAuthSession';
import { useEffect, useRef } from 'react';
import type { Address } from 'viem';
import { useConnection } from 'wagmi';

// Silently restores the SIWE session when a previously authenticated wallet (re)connects, so
// switching between wallets does not prompt for a new signature every time
const SiweSessionRestorer = () => {
  const { address: account } = useConnection();
  const { siweAddress, isLoading } = useAuthSession();
  const attemptedAccount = useRef<Address | null>(null);

  useEffect(() => {
    if (!account) {
      // Allow a new restore attempt when the same wallet reconnects after a disconnect
      attemptedAccount.current = null;
      return;
    }

    if (isLoading || siweAddress === account || attemptedAccount.current === account) return;

    attemptedAccount.current = account;
    restoreSiweSession(account);
  }, [account, siweAddress, isLoading]);

  return null;
};

export default SiweSessionRestorer;
