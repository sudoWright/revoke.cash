import { getAuthSessionByHeaders, IRON_OPTIONS } from 'lib/api/auth';
import { handleApiRouteError } from 'lib/api/errors';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get(IRON_OPTIONS.cookieName)?.value;
    const session = await getAuthSessionByHeaders(req.headers, sessionCookie);
    return NextResponse.json(session, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiRouteError(error);
  }
}
