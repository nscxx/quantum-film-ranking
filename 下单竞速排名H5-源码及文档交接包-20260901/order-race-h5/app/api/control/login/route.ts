import {
  createControlSessionCookie,
  secureCookieSuffix,
  verifyControlPassword,
} from '@/lib/order-race/auth';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: unknown };
    const password = typeof body.password === 'string' ? body.password : '';
    if (!verifyControlPassword(password)) {
      return Response.json({ ok: false, code: 'INVALID_PASSWORD', message: '活动口令不正确' }, { status: 401 });
    }
    return Response.json(
      { ok: true },
      { headers: { 'Set-Cookie': `${await createControlSessionCookie()}${secureCookieSuffix(request)}` } },
    );
  } catch (error) {
    const unconfigured = error instanceof Error && error.message === 'CONTROL_AUTH_NOT_CONFIGURED';
    console.error('control_login_failed', error);
    return Response.json(
      { ok: false, code: unconfigured ? 'AUTH_NOT_CONFIGURED' : 'LOGIN_FAILED', message: unconfigured ? '后台口令尚未配置' : '登录失败，请稍后重试' },
      { status: 503 },
    );
  }
}
