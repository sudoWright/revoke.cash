import { addressSchema } from '@revoke.cash/core/schemas';
import {
  getStoredSiweWalletEdge,
  RateLimiters,
  requireRateLimit,
  requireSameOrigin,
  storeSessionEdge,
} from 'lib/api/auth';
import { handleApiRouteError } from 'lib/api/errors';
import { parseRequest } from 'lib/api/validation';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'edge';

const schemas = {
  params: z.undefined(),
  body: z.strictObject({
    address: addressSchema,
  }),
};

// Restores a SIWE session for a wallet that previously signed in from this browser, without requiring a new signature
export async function POST(req: NextRequest) {
  try {
    await requireRateLimit(req, RateLimiters.AUTH);
    requireSameOrigin(req);
    const { body } = await parseRequest(req, undefined, schemas);

    const siwe = await getStoredSiweWalletEdge(req, body.address);
    if (!siwe) {
      return NextResponse.json({ ok: false });
    }

    const res = NextResponse.json({ ok: true });
    await storeSessionEdge(req, res, { siwe });
    return res;
  } catch (error) {
    return handleApiRouteError(error);
  }
}
