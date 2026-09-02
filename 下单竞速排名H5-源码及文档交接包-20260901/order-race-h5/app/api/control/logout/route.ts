import { clearControlSessionCookie, secureCookieSuffix } from '@/lib/order-race/auth';

export async function POST(request: Request) {
  return Response.json(
    { ok: true },
    { headers: { 'Set-Cookie': `${clearControlSessionCookie()}${secureCookieSuffix(request)}` } },
  );
}
