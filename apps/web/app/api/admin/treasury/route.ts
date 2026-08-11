import { getTreasuryBalances } from '@revoke.cash/core/admin/treasury';
import { handleAdminRead } from 'lib/api/admin';
import type { NextRequest } from 'next/server';

// Finding leftover balances means one RPC call per supported chain, so this runs on the node runtime
// with a longer limit than the default. Prices are cached by the price helpers themselves.
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return handleAdminRead(req, getTreasuryBalances);
}
