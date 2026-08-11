'use client';

import type { TreasuryBalances } from '@revoke.cash/core/admin/treasury';
import { useAdminQuery } from 'lib/hooks/admin/useAdminQuery';

export const useAdminTreasury = () => {
  return useAdminQuery<TreasuryBalances>(['admin', 'treasury'], '/api/admin/treasury');
};
