import { hasValidControlSession } from '@/lib/order-race/auth';

export async function GET(request: Request) {
  return Response.json({ ok: true, authenticated: await hasValidControlSession(request) });
}
