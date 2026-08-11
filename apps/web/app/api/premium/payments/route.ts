import { recordAuditEvent } from '@revoke.cash/core/audit/events';
import { getPaymentToken, isSupportedPaymentChainId } from '@revoke.cash/core/premium/payment-config';
import { createPayment } from '@revoke.cash/core/premium/payments';
import { chainIdSchema } from '@revoke.cash/core/schemas';
import { authorizeRequest, getClientCountryEdge, RateLimiters } from 'lib/api/auth';
import { handleApiRouteError } from 'lib/api/errors';
import { parseRequest } from 'lib/api/validation';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schemas = {
  params: z.undefined(),
  body: z
    .strictObject({
      planId: z.string().min(1),
      chainId: chainIdSchema.refine(isSupportedPaymentChainId, {
        error: 'Unsupported payment chain',
        params: { status: 404 },
      }),
      tokenSymbol: z.enum(['USDC', 'USDT']),
    })
    .refine((body) => Boolean(getPaymentToken(body.chainId, body.tokenSymbol)), {
      error: 'Unsupported payment token for this chain',
      params: { status: 404 },
    }),
};

export const runtime = 'edge';
export const preferredRegion = ['iad1'];

export async function POST(req: NextRequest) {
  try {
    const { siweAddress } = await authorizeRequest(req, {
      auth: 'siwe',
      rateLimiter: RateLimiters.PREMIUM_WRITE,
    });
    const { body } = await parseRequest(req, undefined, schemas);
    const { planId, chainId, tokenSymbol } = body;

    const payment = await createPayment({
      ownerAddress: siweAddress,
      planId,
      chainId,
      tokenSymbol,
      vatRegion: getClientCountryEdge(req),
    });

    await recordAuditEvent({
      action: 'payment_created',
      actorAddress: siweAddress,
      chainId,
      details: { paymentId: payment.paymentId, planId, tokenSymbol, amountUsdCents: payment.amountUsdCents },
    });

    return NextResponse.json(payment);
  } catch (error) {
    return handleApiRouteError(error, { errorMessage: 'Failed to create payment' });
  }
}
